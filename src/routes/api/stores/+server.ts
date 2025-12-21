import { json } from '@sveltejs/kit';
import { isPrintifyTokenConfigured, listStores } from '$lib/server/printify';

export async function GET(event) {
	const env = event.platform?.env;
	if (!env) return json({ error: 'Missing platform env' }, { status: 500 });
	if (!isPrintifyTokenConfigured(env)) {
		return json({ error: 'Missing PRINTIFY_API_TOKEN' }, { status: 400 });
	}

	try {
		const stores = await listStores(env);
		return json({ stores });
	} catch (err) {
		console.error('Failed to load stores from Printify', err);
		return json({ error: 'Failed to fetch stores', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
	}
}



