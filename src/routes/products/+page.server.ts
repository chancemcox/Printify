import type { PageServerLoad } from './$types';
import { getEnabledProductIds } from '$lib/server/kvProducts';
import { isPrintifyConfigured, listStoreProducts } from '$lib/server/printify';

export const load: PageServerLoad = async (event) => {
	const env = event.platform?.env;
	if (!env) return { products: [] };

	if (!isPrintifyConfigured(env)) return { products: [] };

	let enabled: Set<string>;
	let all: Awaited<ReturnType<typeof listStoreProducts>>;
	try {
		enabled = await getEnabledProductIds(env);
		all = await listStoreProducts(env);
	} catch (err) {
		console.error('Failed to load products from Printify', err);
		return { products: [] };
	}

	const products = enabled.size
		? all.filter((p) => enabled.has(p.id))
		: all.filter((p) => p.visible !== false);

	return { products };
};
