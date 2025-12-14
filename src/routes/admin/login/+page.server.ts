import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { adminCookieName, makeAdminCookieValue } from '$lib/server/adminAuth';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const env = event.platform?.env;
		if (!env?.ADMIN_TOKEN) return fail(500, { error: 'Missing ADMIN_TOKEN' });

		const form = await event.request.formData();
		const token = form.get('token');
		if (typeof token !== 'string' || !token) return fail(400, { error: 'Token required' });

		if (token !== env.ADMIN_TOKEN) return fail(401, { error: 'Invalid token' });

		const value = await makeAdminCookieValue(env.ADMIN_TOKEN);
		event.cookies.set(adminCookieName(), value, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 60 * 60 * 24 * 30
		});

		throw redirect(303, '/admin');
	}
};
