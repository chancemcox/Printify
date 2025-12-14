import type { Actions, PageServerLoad } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { isAdmin, adminCookieName } from '$lib/server/adminAuth';
import { disableProductId, enableProductId, getEnabledProductIds } from '$lib/server/kvProducts';
import { isPrintifyConfigured, listStoreProducts } from '$lib/server/printify';

export const load: PageServerLoad = async (event) => {
	if (!(await isAdmin(event))) throw redirect(303, '/admin/login');

	const env = event.platform?.env;
	if (!env) return { products: [], enabled: [] };
	if (!isPrintifyConfigured(env)) return { products: [], enabled: [] };

	let products: Awaited<ReturnType<typeof listStoreProducts>> = [];
	let enabledSet: Set<string> = new Set();
	try {
		[products, enabledSet] = await Promise.all([listStoreProducts(env), getEnabledProductIds(env)]);
	} catch (err) {
		console.error('Failed to load admin products from Printify', err);
		return { products: [], enabled: [] };
	}

	return { products, enabled: Array.from(enabledSet) };
};

export const actions: Actions = {
	enable: async (event) => {
		if (!(await isAdmin(event))) throw redirect(303, '/admin/login');
		const env = event.platform?.env;
		if (!env) return fail(500, { error: 'Missing platform env' });

		const form = await event.request.formData();
		const id = form.get('product_id');
		if (typeof id !== 'string' || !id) return fail(400, { error: 'Missing product_id' });
		await enableProductId(env, id);
		return { ok: true };
	},
	disable: async (event) => {
		if (!(await isAdmin(event))) throw redirect(303, '/admin/login');
		const env = event.platform?.env;
		if (!env) return fail(500, { error: 'Missing platform env' });

		const form = await event.request.formData();
		const id = form.get('product_id');
		if (typeof id !== 'string' || !id) return fail(400, { error: 'Missing product_id' });
		await disableProductId(env, id);
		return { ok: true };
	},
	logout: async (event) => {
		event.cookies.delete(adminCookieName(), { path: '/' });
		throw redirect(303, '/');
	}
};
