import type { PageServerLoad } from './$types';
import { getEnabledProductIds } from '$lib/server/kvProducts';
import { listStoreProducts } from '$lib/server/printify';

export const load: PageServerLoad = async (event) => {
	const env = event.platform?.env;
	if (!env) return { products: [] };

	const enabled = await getEnabledProductIds(env);
	const all = await listStoreProducts(env);

	const products = enabled.size
		? all.filter((p) => enabled.has(p.id))
		: all.filter((p) => p.visible !== false);

	return { products };
};
