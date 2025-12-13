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

export async function isAdmin(event: {
	cookies: { get(name: string): string | undefined };
	platform?: App.Platform;
}): Promise<boolean> {
	const token = event.platform?.env.ADMIN_TOKEN;
	if (!token) return false;
	const expected = await makeAdminCookieValue(token);
	const got = event.cookies.get(COOKIE_NAME);
	return got === expected;
}

export function adminCookieName() {
	return COOKIE_NAME;
}
