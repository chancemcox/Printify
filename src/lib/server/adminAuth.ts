function base64url(bytes: ArrayBuffer) {
	const bin = String.fromCharCode(...new Uint8Array(bytes));
	return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function hmacSha256(secret: string, data: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
	return base64url(sig);
}

const COOKIE_NAME = 'admin_session';
const COOKIE_DATA = 'admin';

export async function makeAdminCookieValue(adminToken: string): Promise<string> {
	return await hmacSha256(adminToken, COOKIE_DATA);
}

function getBearerToken(req: Request): string | null {
	const raw = req.headers.get('authorization');
	if (!raw) return null;
	const m = raw.match(/^Bearer\s+(.+)$/i);
	return m?.[1]?.trim() ? m[1].trim() : null;
}

export async function isAdmin(event: {
	cookies: { get(name: string): string | undefined };
	request: Request;
	platform?: App.Platform;
}): Promise<boolean> {
	const env = event.platform?.env;
	if (!env) return false;

	// API auth: allow calling admin endpoints with an Authorization header.
	// Prefer ADMIN_API_TOKEN if set, otherwise fall back to ADMIN_TOKEN.
	const bearer = getBearerToken(event.request);
	if (bearer) {
		const apiToken = env.ADMIN_API_TOKEN ?? env.ADMIN_TOKEN;
		if (apiToken && bearer === apiToken) return true;
	}

	// UI auth: admin_session cookie is an HMAC of a fixed string with ADMIN_TOKEN.
	if (!env.ADMIN_TOKEN) return false;
	const expected = await makeAdminCookieValue(env.ADMIN_TOKEN);
	const got = event.cookies.get(COOKIE_NAME);
	return got === expected;
}

export function adminCookieName() {
	return COOKIE_NAME;
}
