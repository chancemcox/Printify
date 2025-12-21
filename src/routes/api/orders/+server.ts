import { json } from '@sveltejs/kit';
import { createOrder } from '$lib/server/printify';

function pick(form: FormData, key: string) {
	const v = form.get(key);
	return typeof v === 'string' ? v : '';
}

export async function POST(event) {
	const env = event.platform?.env;
	if (!env) return json({ error: 'Missing platform env' }, { status: 500 });

	let form: FormData;
	try {
		form = await event.request.formData();
	} catch {
		return json({ error: 'Expected form data' }, { status: 400 });
	}

	const product_id = pick(form, 'product_id');
	const variant_id = Number(pick(form, 'variant_id'));
	const quantity = Number(pick(form, 'quantity'));

	if (!product_id || !Number.isFinite(variant_id) || !Number.isFinite(quantity) || quantity < 1) {
		return json({ error: 'Invalid order line item' }, { status: 400 });
	}

	const order = {
		external_id: `web-${crypto.randomUUID()}`,
		line_items: [{ product_id, variant_id, quantity }],
		address_to: {
			first_name: pick(form, 'first_name'),
			last_name: pick(form, 'last_name'),
			email: pick(form, 'email'),
			phone: pick(form, 'phone') || undefined,
			country: pick(form, 'country'),
			region: pick(form, 'region') || undefined,
			address1: pick(form, 'address1'),
			address2: pick(form, 'address2') || undefined,
			city: pick(form, 'city'),
			zip: pick(form, 'zip')
		},
		send_shipping_notification: true
	};

	try {
		const created = await createOrder(env, order);
		return json({ ok: true, created });
	} catch (e) {
		return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
