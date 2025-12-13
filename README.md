# Cloudflare Svelte + Printify Storefront

This repo is a SvelteKit storefront intended to be deployed on Cloudflare and connected to Printify.

## Required environment variables

- `PRINTIFY_API_TOKEN`: Printify API token (keep as a secret)
- `PRINTIFY_STORE_ID`: Printify shop/store ID
- `ADMIN_TOKEN`: token used for `/admin/login`
- `PRODUCTS_KV`: Cloudflare KV binding used to store enabled product IDs

## Local development

1. Install dependencies:
   - `npm install`
2. Configure Cloudflare bindings:
   - Edit `wrangler.toml` (KV namespace IDs) and set vars
3. Build (sanity check):
   - `npm run build`

## Notes

- Storefront shows **all visible Printify products** when the allowlist is empty.
- If you enable products in `/admin`, the storefront shows **only enabled** product IDs.