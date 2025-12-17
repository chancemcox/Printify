#!/usr/bin/env node

/**
 * Script to fetch Printify store IDs
 * Usage: node scripts/get-store-id.js [PRINTIFY_API_TOKEN]
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = 'https://api.printify.com/v1';

function fetch(url, options = {}) {
	return new Promise((resolve, reject) => {
		const urlObj = new URL(url);
		const requestOptions = {
			hostname: urlObj.hostname,
			port: urlObj.port || 443,
			path: urlObj.pathname + urlObj.search,
			method: options.method || 'GET',
			headers: options.headers || {}
		};

		const req = https.request(requestOptions, (res) => {
			let data = '';
			res.on('data', (chunk) => { data += chunk; });
			res.on('end', () => {
				const response = {
					ok: res.statusCode >= 200 && res.statusCode < 300,
					status: res.statusCode,
					statusText: res.statusMessage,
					json: async () => JSON.parse(data),
					text: async () => data
				};
				resolve(response);
			});
		});

		req.on('error', reject);
		
		if (options.body) {
			req.write(options.body);
		}
		
		req.end();
	});
}

function tryReadFromWrangler() {
	try {
		const wranglerPath = join(__dirname, '..', 'wrangler.toml');
		const content = readFileSync(wranglerPath, 'utf-8');
		
		// Try to find ADMIN_API_TOKEN (might be the Printify token)
		const adminTokenMatch = content.match(/ADMIN_API_TOKEN\s*=\s*"([^"]+)"/);
		if (adminTokenMatch) {
			return adminTokenMatch[1];
		}
	} catch (error) {
		// Ignore errors
	}
	return null;
}

async function getStores(apiToken) {
	if (!apiToken) {
		// Try reading from wrangler.toml as fallback
		const fallbackToken = tryReadFromWrangler();
		if (fallbackToken) {
			console.log('📝 Using token from wrangler.toml (ADMIN_API_TOKEN)\n');
			apiToken = fallbackToken;
		} else {
			console.error('❌ Error: PRINTIFY_API_TOKEN is required');
			console.log('\nUsage:');
			console.log('  node scripts/get-store-id.js YOUR_API_TOKEN');
			console.log('  or');
			console.log('  PRINTIFY_API_TOKEN=your_token node scripts/get-store-id.js');
			process.exit(1);
		}
	}

	try {
		console.log('🔍 Fetching stores from Printify API...\n');
		
		const response = await fetch(`${API_BASE}/shops.json`, {
			headers: {
				'Authorization': `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`❌ API Error (${response.status}):`, errorText);
			console.error('\n💡 Make sure you are using a valid Printify API token.');
			console.error('   You can get your token from: https://printify.com/app/account/api');
			process.exit(1);
		}

		const data = await response.json();
		
		// Handle both array response and { data: [...] } response
		const stores = Array.isArray(data) ? data : (data.data || []);
		
		if (stores.length === 0) {
			console.log('⚠️  No stores found.');
			console.log('\n💡 This could mean:');
			console.log('   1. Your account has no stores yet');
			console.log('   2. The token doesn\'t have the right permissions');
			console.log('   3. You need to use a different API token');
			console.log('\n   Make sure your token has "shops.read" scope.');
			return;
		}

		console.log('✅ Found stores:\n');
		console.log('─'.repeat(60));
		
		stores.forEach((store, index) => {
			console.log(`\n${index + 1}. Store ID: ${store.id}`);
			if (store.title) {
				console.log(`   Title: ${store.title}`);
			}
			if (store.sales_channel) {
				console.log(`   Sales Channel: ${store.sales_channel}`);
			}
		});

		console.log('\n' + '─'.repeat(60));
		console.log(`\n💡 To use a store, set PRINTIFY_STORE_ID in wrangler.toml:`);
		console.log(`   PRINTIFY_STORE_ID = "${stores[0].id}"`);
		
	} catch (error) {
		console.error('❌ Error fetching stores:', error.message);
		process.exit(1);
	}
}

// Get token from command line argument or environment variable
const apiToken = process.argv[2] || process.env.PRINTIFY_API_TOKEN;

getStores(apiToken);

