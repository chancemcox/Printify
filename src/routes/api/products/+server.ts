import { json } from '@sveltejs/kit';
import { getEnabledProductIds } from '$lib/server/kvProducts';
import { isPrintifyConfigured, listStoreProducts } from '$lib/server/printify';

export async function GET(event) {
	const env = event.platform?.env;
	if (!env) return json({ error: 'Missing platform env' }, { status: 500 });
	if (!isPrintifyConfigured(env)) return json({ products: [] });

	let enabled: Set<string>;
	let all: Awaited<ReturnType<typeof listStoreProducts>>;
	try {
		enabled = await getEnabledProductIds(env);
		all = await listStoreProducts(env);
	} catch (err) {
		console.error('Failed to load products from Printify (API)', err);
		return json({ products: [] }, { status: 200 });
	}

	const products = enabled.size
		? all.filter((p) => enabled.has(p.id))
		: all.filter((p) => p.visible !== false);

	return json({ products });
}
