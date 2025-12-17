export type PrintifyProduct = {
	id: string;
	title: string;
	description?: string;
	visible?: boolean;
	is_locked?: boolean;
	is_printify_express_eligible?: boolean;
	images?: Array<{ src: string; variant_ids?: number[] }>;
	variants?: Array<{
		id: number;
		price: number; // cents
		is_enabled?: boolean;
		is_default?: boolean;
		options?: Record<string, string>;
		title?: string;
	}>;
};

export type PrintifyAddress = {
	first_name: string;
	last_name: string;
	email: string;
	phone?: string;
	country: string;
	region?: string;
	address1: string;
	address2?: string;
	city: string;
	zip: string;
};

export type PrintifyOrderRequest = {
	external_id: string;
	line_items: Array<{
		product_id: string;
		variant_id: number;
		quantity: number;
	}>;
	address_to: PrintifyAddress;
	send_shipping_notification?: boolean;
};

const API_BASE = 'https://api.printify.com/v1';

export function isPrintifyConfigured(env: App.Platform['env']): boolean {
	return Boolean(env.PRINTIFY_API_TOKEN && env.PRINTIFY_STORE_ID);
}

export function isPrintifyTokenConfigured(env: App.Platform['env']): boolean {
	return Boolean(env.PRINTIFY_API_TOKEN);
}

export class PrintifyError extends Error {
	status: number;
	body: string;

	constructor(status: number, body: string) {
		super(`Printify API error ${status}: ${body}`);
		this.name = 'PrintifyError';
		this.status = status;
		this.body = body;
	}
}

function requireTokenEnv(env: App.Platform['env']) {
	if (!env.PRINTIFY_API_TOKEN) throw new Error('Missing PRINTIFY_API_TOKEN');
}

function requireEnv(env: App.Platform['env']) {
	if (!env.PRINTIFY_API_TOKEN) throw new Error('Missing PRINTIFY_API_TOKEN');
	if (!env.PRINTIFY_STORE_ID) throw new Error('Missing PRINTIFY_STORE_ID');
}

async function printifyFetch<T>(
	env: App.Platform['env'],
	path: string,
	init?: RequestInit
): Promise<T> {
	requireTokenEnv(env);
	const res = await fetch(`${API_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${env.PRINTIFY_API_TOKEN}`,
			'Content-Type': 'application/json',
			...(init?.headers ?? {})
		}
	});

	if (!res.ok) {
		const body = await res.text();
		throw new PrintifyError(res.status, body);
	}

	return (await res.json()) as T;
}

export type PrintifyStore = {
	id: number;
	title?: string;
};

export async function listStores(env: App.Platform['env']): Promise<PrintifyStore[]> {
	const data = await printifyFetch<{ data: PrintifyStore[] }>(env, `/shops.json`);
	return data.data ?? [];
}

export async function listStoreProducts(env: App.Platform['env']): Promise<PrintifyProduct[]> {
	requireEnv(env);
	const shopId = env.PRINTIFY_STORE_ID;
	// Printify uses products.json for shop products
	const data = await printifyFetch<{ data: PrintifyProduct[] }>(env, `/shops/${shopId}/products.json`);
	return data.data ?? [];
}

export async function getStoreProduct(
	env: App.Platform['env'],
	productId: string
): Promise<PrintifyProduct> {
	requireEnv(env);
	const shopId = env.PRINTIFY_STORE_ID;
	return await printifyFetch<PrintifyProduct>(env, `/shops/${shopId}/products/${productId}.json`);
}

export async function createOrder(
	env: App.Platform['env'],
	order: PrintifyOrderRequest
): Promise<unknown> {
	requireEnv(env);
	const shopId = env.PRINTIFY_STORE_ID;
	return await printifyFetch(env, `/shops/${shopId}/orders.json`, {
		method: 'POST',
		body: JSON.stringify(order)
	});
}
