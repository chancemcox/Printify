// See https://svelte.dev/docs/kit/types#app
// for information about these interfaces

type KVNamespace = {
	get(key: string): Promise<string | null>;
	put(key: string, value: string): Promise<void>;
	delete?(key: string): Promise<void>;
};

declare global {
	namespace App {
		interface Platform {
			env: {
				PRINTIFY_API_TOKEN: string;
				PRINTIFY_STORE_ID: string;
				ADMIN_TOKEN: string;
				PRODUCTS_KV: KVNamespace;
			};
		}
	}
}

export {};
