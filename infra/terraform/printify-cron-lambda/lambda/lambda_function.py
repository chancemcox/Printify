import base64
import json
import os
import time
import urllib.request
import urllib.error

import boto3


secrets = boto3.client("secretsmanager")
s3 = boto3.client("s3")


def _env(name: str, default=None, required: bool = False):
    v = os.environ.get(name, default)
    if required and (v is None or v == ""):
        raise RuntimeError(f"Missing required env var: {name}")
    return v


def _secret_string(secret_arn: str) -> str:
    resp = secrets.get_secret_value(SecretId=secret_arn)
    if "SecretString" in resp and resp["SecretString"]:
        return resp["SecretString"]
    if "SecretBinary" in resp and resp["SecretBinary"]:
        return base64.b64decode(resp["SecretBinary"]).decode("utf-8")
    raise RuntimeError(f"Secret has no value: {secret_arn}")


def _http_json(method: str, url: str, headers: dict | None = None, body: dict | None = None, timeout_s: int = 60):
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(url=url, data=data, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)

    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as res:
            raw = res.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        raise RuntimeError(f"HTTP {e.code} calling {url}: {raw}")


def _openai_generate_image_b64(openai_api_key: str, prompt: str) -> str:
    # Uses OpenAI Images API (gpt-image-1)
    # Response: { data: [ { b64_json: "..." } ] }
    body = {
        "model": _env("OPENAI_IMAGE_MODEL", "gpt-image-1"),
        "prompt": prompt,
        "size": _env("OPENAI_IMAGE_SIZE", "1024x1024"),
        "response_format": "b64_json",
    }

    resp = _http_json(
        "POST",
        "https://api.openai.com/v1/images/generations",
        headers={
            "Authorization": f"Bearer {openai_api_key}",
            "Content-Type": "application/json",
        },
        body=body,
        timeout_s=int(_env("OPENAI_TIMEOUT_S", "120")),
    )

    data = resp.get("data") or []
    if not data or not isinstance(data, list) or "b64_json" not in data[0]:
        raise RuntimeError(f"Unexpected OpenAI image response: {json.dumps(resp)[:2000]}")

    return data[0]["b64_json"]


def _s3_put_and_presign_png(bucket: str, key: str, png_bytes: bytes) -> str:
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=png_bytes,
        ContentType="image/png",
    )
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=int(_env("S3_PRESIGN_TTL_SECONDS", "3600")),
    )


def _printify_upload_image(printify_api_token: str, image_url: str, file_name: str) -> str:
    resp = _http_json(
        "POST",
        "https://api.printify.com/v1/uploads/images.json",
        headers={
            "Authorization": f"Bearer {printify_api_token}",
            "Content-Type": "application/json",
        },
        body={"file_name": file_name, "url": image_url},
        timeout_s=int(_env("PRINTIFY_TIMEOUT_S", "120")),
    )

    image_id = resp.get("id") or (resp.get("data") or {}).get("id")
    if not image_id:
        raise RuntimeError(f"Unexpected Printify upload response: {json.dumps(resp)[:2000]}")
    return str(image_id)


def _printify_create_product(printify_api_token: str, store_id: str, payload: dict) -> dict:
    return _http_json(
        "POST",
        f"https://api.printify.com/v1/shops/{store_id}/products.json",
        headers={
            "Authorization": f"Bearer {printify_api_token}",
            "Content-Type": "application/json",
        },
        body=payload,
        timeout_s=int(_env("PRINTIFY_TIMEOUT_S", "120")),
    )


def _printify_publish_product(printify_api_token: str, store_id: str, product_id: str) -> dict:
    body = {
        "title": True,
        "description": True,
        "images": True,
        "variants": True,
        "tags": True,
        "keyfeatures": True,
        "shipping_template": True,
    }
    return _http_json(
        "POST",
        f"https://api.printify.com/v1/shops/{store_id}/products/{product_id}/publish.json",
        headers={
            "Authorization": f"Bearer {printify_api_token}",
            "Content-Type": "application/json",
        },
        body=body,
        timeout_s=int(_env("PRINTIFY_TIMEOUT_S", "120")),
    )


def lambda_handler(event, context):
    # Secrets are passed as ARNs to avoid storing secret values in Terraform state.
    openai_key = _secret_string(_env("OPENAI_API_KEY_SECRET_ARN", required=True)).strip()
    printify_token = _secret_string(_env("PRINTIFY_API_TOKEN_SECRET_ARN", required=True)).strip()

    store_id = _env("PRINTIFY_STORE_ID", required=True)
    blueprint_id = int(_env("PRINTIFY_BLUEPRINT_ID", required=True))
    provider_id = int(_env("PRINTIFY_PRINT_PROVIDER_ID", required=True))
    variant_id = int(_env("PRINTIFY_VARIANT_ID", required=True))
    price_cents = int(_env("PRINTIFY_PRICE_CENTS", "1999"))

    title = _env("PRODUCT_TITLE", "AI Generated Product")
    description = _env("PRODUCT_DESCRIPTION", "Auto-created by scheduled Lambda")
    prompt = _env(
        "OPENAI_IMAGE_PROMPT",
        f"A clean, high-contrast t-shirt graphic illustration for: {title}. Vector style, centered composition, no background, transparent background.",
    )

    bucket = _env("ASSETS_BUCKET", required=True)
    prefix = _env("ASSETS_PREFIX", "printify-generated")
    publish = _env("PRINTIFY_PUBLISH", "false").lower() == "true"

    # 1) Generate image
    b64_png = _openai_generate_image_b64(openai_key, prompt)
    png_bytes = base64.b64decode(b64_png)

    # 2) Store in S3 and presign URL for Printify to fetch
    ts = int(time.time())
    key = f"{prefix}/{ts}.png"
    presigned_url = _s3_put_and_presign_png(bucket, key, png_bytes)

    # 3) Upload to Printify (creates Printify image asset)
    printify_image_id = _printify_upload_image(printify_token, presigned_url, f"{ts}.png")

    # 4) Create product
    payload = {
        "title": title,
        "description": description,
        "blueprint_id": blueprint_id,
        "print_provider_id": provider_id,
        "variants": [
            {
                "id": variant_id,
                "price": price_cents,
                "is_enabled": True,
            }
        ],
        "print_areas": [
            {
                "variant_ids": [variant_id],
                "placeholders": [
                    {
                        "position": _env("PRINTIFY_PRINT_POSITION", "front"),
                        "images": [
                            {
                                "id": printify_image_id,
                                "x": float(_env("PRINTIFY_X", "0.5")),
                                "y": float(_env("PRINTIFY_Y", "0.5")),
                                "scale": float(_env("PRINTIFY_SCALE", "1")),
                                "angle": float(_env("PRINTIFY_ANGLE", "0")),
                            }
                        ],
                    }
                ],
            }
        ],
        "visible": _env("PRINTIFY_VISIBLE", "false").lower() == "true",
    }

    created = _printify_create_product(printify_token, store_id, payload)
    product_id = created.get("id")

    publish_resp = None
    if publish and product_id:
        publish_resp = _printify_publish_product(printify_token, store_id, str(product_id))

    return {
        "ok": True,
        "s3": {"bucket": bucket, "key": key},
        "printify": {
            "product_id": product_id,
            "created": created,
            "published": bool(publish_resp),
            "publish_response": publish_resp,
        },
    }
