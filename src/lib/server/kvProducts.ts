const KEY = 'enabled_product_ids';

export async function getEnabledProductIds(env: App.Platform['env']): Promise<Set<string>> {
	const raw = await env.PRODUCTS_KV.get(KEY);
	if (!raw) return new Set();
	try {
		const arr = JSON.parse(raw) as unknown;
		if (!Array.isArray(arr)) return new Set();
		return new Set(arr.map(String));
	} catch {
		return new Set();
	}
}

export async function setEnabledProductIds(env: App.Platform['env'], ids: Iterable<string>) {
	await env.PRODUCTS_KV.put(KEY, JSON.stringify(Array.from(ids)));
}

export async function enableProductId(env: App.Platform['env'], id: string) {
	const set = await getEnabledProductIds(env);
	set.add(id);
	await setEnabledProductIds(env, set);
}

export async function disableProductId(env: App.Platform['env'], id: string) {
	const set = await getEnabledProductIds(env);
	set.delete(id);
	await setEnabledProductIds(env, set);
}
