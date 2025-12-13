<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	const enabled = new Set(data.enabled);
</script>

<h1>Admin</h1>

<form method="POST">
	<button class="button button--secondary" formaction="?/logout">Log out</button>
</form>

<p class="note">
	This admin page controls a KV-backed allowlist of product IDs. If the allowlist is empty, the
	storefront shows all visible Printify products. If it has items, only enabled products show.
</p>

{#if data.products.length === 0}
	<p class="note">No products returned. Check your Printify env vars.</p>
{:else}
	<div class="card-grid">
		{#each data.products as p}
			<div class="card">
				{#if p.images?.[0]?.src}
					<img src={p.images[0].src} alt={p.title} style="width: 100%; aspect-ratio: 4/3; object-fit: cover;" />
				{/if}
				<div class="card__body">
					<h2 class="card__title">{p.title}</h2>
					<p class="card__meta">ID: {p.id}</p>

					<div class="row" style="margin-top: 10px">
						{#if enabled.has(p.id)}
							<form method="POST">
								<input type="hidden" name="product_id" value={p.id} />
								<button class="button button--secondary" formaction="?/disable">Disable</button>
							</form>
						{:else}
							<form method="POST">
								<input type="hidden" name="product_id" value={p.id} />
								<button class="button" formaction="?/enable">Enable</button>
							</form>
						{/if}
						<a class="button button--secondary" href={`/products/${p.id}`}>View</a>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
