import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getStoreProduct, isPrintifyConfigured, PrintifyError } from '$lib/server/printify';

export const load: PageServerLoad = async (event) => {
	const env = event.platform?.env;
	if (!env) throw error(500, 'Missing platform env');
	if (!isPrintifyConfigured(env)) throw error(503, 'Store is not configured');

	const id = event.params.id;
	let product: Awaited<ReturnType<typeof getStoreProduct>>;
	try {
		product = await getStoreProduct(env, id);
	} catch (err) {
		if (err instanceof PrintifyError && err.status === 404) throw error(404, 'Product not found');
		console.error('Failed to load product from Printify', err);
		throw error(503, 'Store is temporarily unavailable');
	}

	const variants = (product.variants ?? []).filter((v) => v.is_enabled !== false);
	const defaultVariant = variants.find((v) => v.is_default) ?? variants[0];

	return { 
		product, 
		variants, 
		defaultVariantId: defaultVariant?.id ?? null,
		paypalClientId: env.PAYPAL_CLIENT_ID || ''
	};
};
