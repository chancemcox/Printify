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
				PRINTIFY_API_TOKEN?: string;
				PRINTIFY_STORE_ID?: string;
				ADMIN_TOKEN?: string;
				PAYPAL_CLIENT_ID?: string;
				PAYPAL_CLIENT_SECRET?: string;
				PAYPAL_MODE?: 'sandbox' | 'live';
				// Optional so deploys can succeed even if KV isn't configured yet.
				PRODUCTS_KV?: KVNamespace;
			};
		}
	}
}

declare global {
	interface Window {
		paypal?: {
			Buttons: (config: any) => {
				render: (container: HTMLElement) => void;
			};
		};
	}
}

export {};
