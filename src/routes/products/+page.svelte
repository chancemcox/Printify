<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	const formatPrice = (cents?: number) => {
		if (typeof cents !== 'number') return '';
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
	};
</script>

<h1>Products</h1>

{#if data.products.length === 0}
	<p class="note">
		No products found yet. Once your Printify API credentials are set, this page will list products.
		If you use the admin allowlist, only enabled products will show.
	</p>
{:else}
	<div class="card-grid">
		{#each data.products as p}
			<a class="card" href={`/products/${p.id}`}>
				{#if p.images?.[0]?.src}
					<img src={p.images[0].src} alt={p.title} style="width: 100%; aspect-ratio: 4/3; object-fit: cover;" />
				{/if}
				<div class="card__body">
					<h2 class="card__title">{p.title}</h2>
					<p class="card__meta">
						{#if p.variants?.length}
							From {formatPrice(Math.min(...p.variants.map((v) => v.price)))}
						{:else}
							&nbsp;
						{/if}
					</p>
				</div>
			</a>
		{/each}
	</div>
{/if}
