'use strict';

const https = require('https');
const crypto = require('crypto');

// AWS SDK v2 is available in the Lambda Node.js runtime by default.
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager();
const s3 = new AWS.S3();

function env(name, { defaultValue, required } = {}) {
  const v = process.env[name];
  if ((v === undefined || v === '') && required) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v !== undefined && v !== '' ? v : defaultValue;
}

async function getSecretString(secretArn) {
  const resp = await secretsManager.getSecretValue({ SecretId: secretArn }).promise();
  if (resp.SecretString) return resp.SecretString;
  if (resp.SecretBinary) return Buffer.from(resp.SecretBinary, 'base64').toString('utf8');
  throw new Error(`Secret has no value: ${secretArn}`);
}

function httpJson(method, url, { headers = {}, body, timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);

    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8');

    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const status = res.statusCode || 0;
          if (status < 200 || status >= 300) {
            return reject(new Error(`HTTP ${status} calling ${url}: ${raw}`));
          }
          if (!raw) return resolve({});
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${String(e)}; body=${raw.slice(0, 2000)}`));
          }
        });
      },
    );

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout after ${timeoutMs}ms calling ${url}`));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

async function openaiGenerateImageB64(openaiApiKey, prompt) {
  const resp = await httpJson('POST', 'https://api.openai.com/v1/images/generations', {
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: {
      model: env('OPENAI_IMAGE_MODEL', { defaultValue: 'gpt-image-1' }),
      prompt,
      size: env('OPENAI_IMAGE_SIZE', { defaultValue: '1024x1024' }),
      response_format: 'b64_json',
    },
    timeoutMs: Number(env('OPENAI_TIMEOUT_MS', { defaultValue: '120000' })),
  });

  const data = resp && Array.isArray(resp.data) ? resp.data : [];
  const b64 = data[0] && data[0].b64_json;
  if (!b64) {
    throw new Error(`Unexpected OpenAI image response: ${JSON.stringify(resp).slice(0, 2000)}`);
  }
  return b64;
}

async function s3PutAndPresignPng(bucket, key, pngBuffer) {
  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: pngBuffer,
      ContentType: 'image/png',
    })
    .promise();

  const expires = Number(env('S3_PRESIGN_TTL_SECONDS', { defaultValue: '3600' }));
  return s3.getSignedUrl('getObject', { Bucket: bucket, Key: key, Expires: expires });
}

async function printifyUploadImage(printifyToken, imageUrl, fileName) {
  const resp = await httpJson('POST', 'https://api.printify.com/v1/uploads/images.json', {
    headers: {
      Authorization: `Bearer ${printifyToken}`,
      'Content-Type': 'application/json',
    },
    body: { file_name: fileName, url: imageUrl },
    timeoutMs: Number(env('PRINTIFY_TIMEOUT_MS', { defaultValue: '120000' })),
  });

  const imageId = resp?.id ?? resp?.data?.id;
  if (!imageId) {
    throw new Error(`Unexpected Printify upload response: ${JSON.stringify(resp).slice(0, 2000)}`);
  }
  return String(imageId);
}

async function printifyCreateProduct(printifyToken, storeId, payload) {
  return httpJson('POST', `https://api.printify.com/v1/shops/${storeId}/products.json`, {
    headers: {
      Authorization: `Bearer ${printifyToken}`,
      'Content-Type': 'application/json',
    },
    body: payload,
    timeoutMs: Number(env('PRINTIFY_TIMEOUT_MS', { defaultValue: '120000' })),
  });
}

async function printifyPublishProduct(printifyToken, storeId, productId) {
  return httpJson('POST', `https://api.printify.com/v1/shops/${storeId}/products/${productId}/publish.json`, {
    headers: {
      Authorization: `Bearer ${printifyToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      title: true,
      description: true,
      images: true,
      variants: true,
      tags: true,
      keyfeatures: true,
      shipping_template: true,
    },
    timeoutMs: Number(env('PRINTIFY_TIMEOUT_MS', { defaultValue: '120000' })),
  });
}

exports.handler = async () => {
  const openaiKeyArn = env('OPENAI_API_KEY_SECRET_ARN', { required: true });
  const printifyTokenArn = env('PRINTIFY_API_TOKEN_SECRET_ARN', { required: true });

  const openaiKey = (await getSecretString(openaiKeyArn)).trim();
  const printifyToken = (await getSecretString(printifyTokenArn)).trim();

  const storeId = env('PRINTIFY_STORE_ID', { required: true });
  const blueprintId = Number(env('PRINTIFY_BLUEPRINT_ID', { required: true }));
  const providerId = Number(env('PRINTIFY_PRINT_PROVIDER_ID', { required: true }));
  const variantId = Number(env('PRINTIFY_VARIANT_ID', { required: true }));
  const priceCents = Number(env('PRINTIFY_PRICE_CENTS', { defaultValue: '1999' }));

  const title = env('PRODUCT_TITLE', { defaultValue: 'AI Generated Product' });
  const description = env('PRODUCT_DESCRIPTION', { defaultValue: 'Auto-created by scheduled Lambda' });
  const prompt = env('OPENAI_IMAGE_PROMPT', {
    defaultValue: `A clean, high-contrast t-shirt graphic illustration for: ${title}. Vector style, centered composition, no background, transparent background.`,
  });

  const bucket = env('ASSETS_BUCKET', { required: true });
  const prefix = env('ASSETS_PREFIX', { defaultValue: 'printify-generated' });
  const publish = env('PRINTIFY_PUBLISH', { defaultValue: 'false' }).toLowerCase() === 'true';
  const visible = env('PRINTIFY_VISIBLE', { defaultValue: 'false' }).toLowerCase() === 'true';

  if (!Number.isFinite(blueprintId) || !Number.isFinite(providerId) || !Number.isFinite(variantId)) {
    throw new Error('Invalid PRINTIFY_BLUEPRINT_ID / PRINTIFY_PRINT_PROVIDER_ID / PRINTIFY_VARIANT_ID');
  }

  // 1) Generate image
  const b64Png = await openaiGenerateImageB64(openaiKey, prompt);
  const pngBuffer = Buffer.from(b64Png, 'base64');

  // 2) Store in S3 and presign URL for Printify to fetch
  const ts = Math.floor(Date.now() / 1000);
  const rand = crypto.randomBytes(4).toString('hex');
  const key = `${prefix}/${ts}-${rand}.png`;
  const presignedUrl = await s3PutAndPresignPng(bucket, key, pngBuffer);

  // 3) Upload to Printify (creates Printify image asset)
  const printifyImageId = await printifyUploadImage(printifyToken, presignedUrl, `${ts}.png`);

  // 4) Create product
  const payload = {
    title,
    description,
    blueprint_id: blueprintId,
    print_provider_id: providerId,
    variants: [
      {
        id: variantId,
        price: priceCents,
        is_enabled: true,
      },
    ],
    print_areas: [
      {
        variant_ids: [variantId],
        placeholders: [
          {
            position: env('PRINTIFY_PRINT_POSITION', { defaultValue: 'front' }),
            images: [
              {
                id: printifyImageId,
                x: Number(env('PRINTIFY_X', { defaultValue: '0.5' })),
                y: Number(env('PRINTIFY_Y', { defaultValue: '0.5' })),
                scale: Number(env('PRINTIFY_SCALE', { defaultValue: '1' })),
                angle: Number(env('PRINTIFY_ANGLE', { defaultValue: '0' })),
              },
            ],
          },
        ],
      },
    ],
    visible,
  };

  const created = await printifyCreateProduct(printifyToken, storeId, payload);
  const productId = created?.id;

  let publishResponse = null;
  if (publish && productId) {
    publishResponse = await printifyPublishProduct(printifyToken, storeId, String(productId));
  }

  return {
    ok: true,
    s3: { bucket, key },
    printify: {
      product_id: productId,
      created,
      published: !!publishResponse,
      publish_response: publishResponse,
    },
  };
};
