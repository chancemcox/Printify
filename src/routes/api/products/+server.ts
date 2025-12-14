import { json } from '@sveltejs/kit';
import { getEnabledProductIds } from '$lib/server/kvProducts';
import { listStoreProducts } from '$lib/server/printify';

export async function GET(event) {
	const env = event.platform?.env;
	if (!env) return json({ error: 'Missing platform env' }, { status: 500 });

	const enabled = await getEnabledProductIds(env);
	const all = await listStoreProducts(env);

	const products = enabled.size
		? all.filter((p) => enabled.has(p.id))
		: all.filter((p) => p.visible !== false);

	return json({ products });
}
