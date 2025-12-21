import { json } from '@sveltejs/kit';
import { createOrder } from '$lib/server/printify';

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

	const { orderID, shipping_data } = body;

	if (!orderID) {
		return json({ error: 'Order ID required' }, { status: 400 });
	}

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
			return json({ error: 'Failed to authenticate with PayPal' }, { status: 500 });
		}

		const tokenData = await tokenResponse.json();
		accessToken = tokenData.access_token;
	} catch (e) {
		return json({ error: 'PayPal authentication failed' }, { status: 500 });
	}

	// Capture the PayPal order
	let captureResponse;
	try {
		captureResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!captureResponse.ok) {
			const errorText = await captureResponse.text();
			console.error('PayPal capture error:', errorText);
			return json({ error: 'Failed to capture PayPal payment' }, { status: 500 });
		}
	} catch (e) {
		console.error('PayPal capture failed:', e);
		return json({ error: 'Failed to capture PayPal payment' }, { status: 500 });
	}

	const captureData = await captureResponse.json();

	// Check if payment was successful
	if (captureData.status !== 'COMPLETED') {
		return json({ error: 'Payment not completed' }, { status: 400 });
	}

	// Extract order details from custom_id
	const purchaseUnit = captureData.purchase_units?.[0];
	const customId = purchaseUnit?.custom_id;
	if (!customId) {
		return json({ error: 'Order details not found' }, { status: 400 });
	}

	let orderDetails;
	try {
		orderDetails = JSON.parse(customId);
	} catch {
		return json({ error: 'Invalid order details' }, { status: 400 });
	}

	// Create Printify order with shipping data
	const printifyOrder = {
		external_id: `paypal-${orderID}`,
		line_items: [
			{
				product_id: orderDetails.product_id,
				variant_id: orderDetails.variant_id,
				quantity: orderDetails.quantity
			}
		],
		address_to: {
			first_name: shipping_data.first_name,
			last_name: shipping_data.last_name,
			email: shipping_data.email,
			phone: shipping_data.phone || undefined,
			country: shipping_data.country,
			region: shipping_data.region || undefined,
			address1: shipping_data.address1,
			address2: shipping_data.address2 || undefined,
			city: shipping_data.city,
			zip: shipping_data.zip
		},
		send_shipping_notification: true
	};

	try {
		const printifyOrderResult = await createOrder(env, printifyOrder);
		return json({ 
			ok: true, 
			paypal: captureData,
			printify: printifyOrderResult
		});
	} catch (e) {
		console.error('Failed to create Printify order:', e);
		// Payment was captured but Printify order failed - this is a problem
		// In production, you might want to handle refunds here
		return json({ 
			ok: false, 
			error: 'Payment processed but order creation failed',
			paypal: captureData
		}, { status: 500 });
	}
}



