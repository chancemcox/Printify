# Cloudflare Svelte + Printify Storefront

This repo is a SvelteKit storefront intended to be deployed on Cloudflare and connected to Printify.

## Required environment variables

- `PRINTIFY_API_TOKEN`: Printify API token (keep as a secret)
- `PRINTIFY_STORE_ID`: Printify shop/store ID
- `ADMIN_TOKEN`: token used for `/admin/login`
- `PRODUCTS_KV`: Cloudflare KV binding used to store enabled product IDs

## Local development

### Prerequisites

- **Node.js 20+** (required for SvelteKit 2.0 and dependencies)
- If using `nvm`, the project includes an `.nvmrc` file - run `nvm use` to automatically switch to the correct version

### Quick Start

1. **Switch to Node.js 18+ (if using nvm):**
   ```bash
   nvm use
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   This will start the Vite dev server at `http://localhost:5173` (or the next available port).

3. **For Cloudflare-specific testing:**
   ```bash
   npm run dev:cloudflare
   ```
   This builds the project and runs it using Wrangler to simulate the Cloudflare Workers environment.

### Configuration

- **Environment variables:** Edit `wrangler.toml` to set your environment variables for local development
- **Cloudflare bindings:** Configure KV namespace IDs and other bindings in `wrangler.toml` if needed
- **Build check:** Run `npm run build` to verify the build works correctly

## Notes

- Storefront shows **all visible Printify products** when the allowlist is empty.
- If you enable products in `/admin`, the storefront shows **only enabled** product IDs.