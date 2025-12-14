import { json } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/adminAuth';
import {
	disableProductId,
	enableProductId,
	getEnabledProductIds
} from '$lib/server/kvProducts';

export async function GET(event) {
	if (!(await isAdmin(event))) return json({ error: 'Unauthorized' }, { status: 401 });
	const env = event.platform?.env;
	if (!env) return json({ error: 'Missing platform env' }, { status: 500 });
	const enabled = Array.from(await getEnabledProductIds(env));
	return json({ enabled });
}

export async function POST(event) {
	if (!(await isAdmin(event))) return json({ error: 'Unauthorized' }, { status: 401 });
	const env = event.platform?.env;
	if (!env) return json({ error: 'Missing platform env' }, { status: 500 });
	const body = await event.request.json().catch(() => null) as null | { product_id?: string };
	const id = body?.product_id;
	if (!id) return json({ error: 'product_id required' }, { status: 400 });
	await enableProductId(env, id);
	return json({ ok: true });
}

export async function DELETE(event) {
	if (!(await isAdmin(event))) return json({ error: 'Unauthorized' }, { status: 401 });
	const env = event.platform?.env;
	if (!env) return json({ error: 'Missing platform env' }, { status: 500 });
	const body = await event.request.json().catch(() => null) as null | { product_id?: string };
	const id = body?.product_id;
	if (!id) return json({ error: 'product_id required' }, { status: 400 });
	await disableProductId(env, id);
	return json({ ok: true });
}
