import { json } from '@sveltejs/kit';
import { getStoreProduct } from '$lib/server/printify';

export async function POST(event) {
	const env = event.platform?.env;
	if (!env) return json({ error: 'Missing platform env' }, { status: 500 });

	const PAYPAL_CLIENT_ID = env.PAYPAL_CLIENT_ID;
	const PAYPAL_CLIENT_SECRET = env.PAYPAL_CLIENT_SECRET;
	const PAYPAL_API_BASE = env.PAYPAL_MODE === 'live' 
		? 'https://api-m.paypal.com' 
		: 'https://api-m.sandbox.paypal.com';

	if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
		return json({ error: 'PayPal credentials not configured' }, { status: 500 });
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { product_id, variant_id, quantity } = body;

	if (!product_id || !variant_id || !quantity || quantity < 1) {
		return json({ error: 'Invalid order parameters' }, { status: 400 });
	}

	// Get product details to calculate price
	let product;
	try {
		product = await getStoreProduct(env, product_id);
	} catch (e) {
		return json({ error: 'Failed to fetch product' }, { status: 500 });
	}

	const variant = product.variants?.find((v) => v.id === variant_id);
	if (!variant) {
		return json({ error: 'Variant not found' }, { status: 400 });
	}

	const totalPrice = variant.price * quantity; // price is in cents
	const priceInDollars = (totalPrice / 100).toFixed(2);

	// Get PayPal access token
	let accessToken;
	try {
		const tokenResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)}`
			},
			body: 'grant_type=client_credentials'
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error('PayPal token error:', errorText);
			return json({ error: 'Failed to authenticate with PayPal' }, { status: 500 });
		}

		const tokenData = await tokenResponse.json();
		accessToken = tokenData.access_token;
	} catch (e) {
		console.error('PayPal token request failed:', e);
		return json({ error: 'PayPal authentication failed' }, { status: 500 });
	}

	// Create PayPal order
	const orderData = {
		intent: 'CAPTURE',
		purchase_units: [
			{
				description: `${product.title}${variant.title ? ` - ${variant.title}` : ''}`,
				amount: {
					currency_code: 'USD',
					value: priceInDollars
				},
				custom_id: JSON.stringify({ product_id, variant_id, quantity })
			}
		]
	};

	try {
		const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`
			},
			body: JSON.stringify(orderData)
		});

		if (!orderResponse.ok) {
			const errorText = await orderResponse.text();
			console.error('PayPal order creation error:', errorText);
			return json({ error: 'Failed to create PayPal order' }, { status: 500 });
		}

		const order = await orderResponse.json();
		return json({ id: order.id });
	} catch (e) {
		console.error('PayPal order creation failed:', e);
		return json({ error: 'Failed to create PayPal order' }, { status: 500 });
	}
}



