import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getStoreProduct } from '$lib/server/printify';

export const load: PageServerLoad = async (event) => {
	const env = event.platform?.env;
	if (!env) throw error(500, 'Missing platform env');

	const id = event.params.id;
	const product = await getStoreProduct(env, id);

	const variants = (product.variants ?? []).filter((v) => v.is_enabled !== false);
	const defaultVariant = variants.find((v) => v.is_default) ?? variants[0];

	return { product, variants, defaultVariantId: defaultVariant?.id ?? null };
};
