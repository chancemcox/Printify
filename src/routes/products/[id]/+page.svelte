<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	let variantId: number | null = data.defaultVariantId;
	let quantity = 1;

	const formatPrice = (cents?: number) => {
		if (typeof cents !== 'number') return '';
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
	};
</script>

<a href="/products">← Back</a>

<h1 style="margin-top: 10px">{data.product.title}</h1>

{#if data.product.images?.[0]?.src}
	<img
		src={data.product.images[0].src}
		alt={data.product.title}
		style="width: 100%; max-width: 680px; aspect-ratio: 4/3; object-fit: cover; border-radius: 14px; border: 1px solid var(--border);"
	/>
{/if}

{#if data.product.description}
	<p class="note" style="max-width: 720px; white-space: pre-wrap;">{data.product.description}</p>
{/if}

<section style="max-width: 520px">
	<h2>Order (stub)</h2>
	<p class="note">
		This is a lightweight demo UI. Next step is wiring payment (usually Stripe) and using the paid
		order data to call Printify.
	</p>

	<form class="form" method="POST" action="/api/orders">
		<input type="hidden" name="product_id" value={data.product.id} />

		<label>
			Variant
			<select class="select" name="variant_id" bind:value={variantId} required>
				{#each data.variants as v}
					<option value={v.id}>{v.title ?? `Variant ${v.id}`} — {formatPrice(v.price)}</option>
				{/each}
			</select>
		</label>

		<label>
			Quantity
			<input class="input" type="number" min="1" name="quantity" bind:value={quantity} required />
		</label>

		<h3>Shipping</h3>
		<label>First name <input class="input" name="first_name" required /></label>
		<label>Last name <input class="input" name="last_name" required /></label>
		<label>Email <input class="input" type="email" name="email" required /></label>
		<label>Country (2-letter) <input class="input" name="country" placeholder="US" required /></label>
		<label>Region/State <input class="input" name="region" /></label>
		<label>Address 1 <input class="input" name="address1" required /></label>
		<label>Address 2 <input class="input" name="address2" /></label>
		<label>City <input class="input" name="city" required /></label>
		<label>ZIP <input class="input" name="zip" required /></label>

		<button class="button" type="submit">Create Printify order</button>
	</form>
</section>
