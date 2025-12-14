const KEY = 'enabled_product_ids';

type KVLike = {
	get(key: string): Promise<string | null>;
	put(key: string, value: string): Promise<void>;
};

const memoryKV = new Map<string, string>();

function getProductsKV(env: App.Platform['env']): KVLike {
	// If KV isn't bound (common in new setups / CI), fall back to an in-memory store.
	// This keeps the storefront functional (allowlist defaults to empty => show visible products).
	return (
		env.PRODUCTS_KV ?? {
			get: async (key: string) => memoryKV.get(key) ?? null,
			put: async (key: string, value: string) => {
				memoryKV.set(key, value);
			}
		}
	);
}

export async function getEnabledProductIds(env: App.Platform['env']): Promise<Set<string>> {
	const raw = await getProductsKV(env).get(KEY);
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
	await getProductsKV(env).put(KEY, JSON.stringify(Array.from(ids)));
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
