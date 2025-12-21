<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	export let data: PageData;

	let variantId: number | null = data.defaultVariantId;
	let quantity = 1;
	let country = 'US';
	let paypalLoaded = false;
	let paypalButtonsContainer: HTMLDivElement;
	let errorMessage = '';
	let successMessage = '';

	const formatPrice = (cents?: number) => {
		if (typeof cents !== 'number') return '';
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
	};

	const getTotalPrice = () => {
		if (!variantId || !data.variants) return 0;
		const variant = data.variants.find((v) => v.id === variantId);
		if (!variant) return 0;
		return variant.price * quantity;
	};

	onMount(async () => {
		if (!data.paypalClientId) {
			errorMessage = 'PayPal is not configured. Please contact support.';
			return;
		}

		// Load PayPal SDK
		const script = document.createElement('script');
		script.src = `https://www.paypal.com/sdk/js?client-id=${data.paypalClientId}&currency=USD`;
		script.async = true;
		script.onload = () => {
			paypalLoaded = true;
			initPayPalButtons();
		};
		script.onerror = () => {
			errorMessage = 'Failed to load PayPal SDK. Please refresh the page.';
		};
		document.head.appendChild(script);
	});

	function initPayPalButtons() {
		if (!window.paypal || !paypalButtonsContainer) return;

		window.paypal.Buttons({
			createOrder: async () => {
				try {
					const response = await fetch('/api/paypal/create-order', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							product_id: data.product.id,
							variant_id: variantId,
							quantity: quantity
						})
					});

					const data = await response.json();
					if (!response.ok) {
						throw new Error(data.error || 'Failed to create order');
					}
					return data.id;
				} catch (error) {
					errorMessage = error instanceof Error ? error.message : 'Failed to create order';
					throw error;
				}
			},
			onApprove: async (data: { orderID: string }) => {
				try {
					// Collect shipping data from form
					const form = document.querySelector('form') as HTMLFormElement;
					if (!form) {
						throw new Error('Form not found');
					}

					const formData = new FormData(form);
					const shipping_data = {
						first_name: formData.get('first_name') as string,
						last_name: formData.get('last_name') as string,
						email: formData.get('email') as string,
						phone: formData.get('phone') as string,
						country: formData.get('country') as string,
						region: formData.get('region') as string,
						address1: formData.get('address1') as string,
						address2: formData.get('address2') as string,
						city: formData.get('city') as string,
						zip: formData.get('zip') as string
					};

					const response = await fetch('/api/paypal/capture-order', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							orderID: data.orderID,
							shipping_data
						})
					});

					const result = await response.json();
					if (!response.ok || !result.ok) {
						throw new Error(result.error || 'Payment failed');
					}

					successMessage = 'Order placed successfully! You will receive a confirmation email shortly.';
					form.reset();
					
					// Redirect to success page or show success message
					setTimeout(() => {
						window.location.href = '/products';
					}, 3000);
				} catch (error) {
					errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
				}
			},
			onError: (err: Error) => {
				errorMessage = 'An error occurred with PayPal. Please try again.';
				console.error('PayPal error:', err);
			}
		}).render(paypalButtonsContainer);
	}

	// Re-initialize buttons when variant or quantity changes
	$: if (paypalLoaded && variantId && paypalButtonsContainer) {
		paypalButtonsContainer.innerHTML = '';
		initPayPalButtons();
	}

	// ISO 3166-1 alpha-2 country codes
	const countries = [
		{ code: 'US', name: 'United States' },
		{ code: 'CA', name: 'Canada' },
		{ code: 'GB', name: 'United Kingdom' },
		{ code: 'AU', name: 'Australia' },
		{ code: 'DE', name: 'Germany' },
		{ code: 'FR', name: 'France' },
		{ code: 'IT', name: 'Italy' },
		{ code: 'ES', name: 'Spain' },
		{ code: 'NL', name: 'Netherlands' },
		{ code: 'BE', name: 'Belgium' },
		{ code: 'CH', name: 'Switzerland' },
		{ code: 'AT', name: 'Austria' },
		{ code: 'SE', name: 'Sweden' },
		{ code: 'NO', name: 'Norway' },
		{ code: 'DK', name: 'Denmark' },
		{ code: 'FI', name: 'Finland' },
		{ code: 'IE', name: 'Ireland' },
		{ code: 'PT', name: 'Portugal' },
		{ code: 'PL', name: 'Poland' },
		{ code: 'CZ', name: 'Czech Republic' },
		{ code: 'GR', name: 'Greece' },
		{ code: 'HU', name: 'Hungary' },
		{ code: 'RO', name: 'Romania' },
		{ code: 'BG', name: 'Bulgaria' },
		{ code: 'HR', name: 'Croatia' },
		{ code: 'SK', name: 'Slovakia' },
		{ code: 'SI', name: 'Slovenia' },
		{ code: 'LT', name: 'Lithuania' },
		{ code: 'LV', name: 'Latvia' },
		{ code: 'EE', name: 'Estonia' },
		{ code: 'JP', name: 'Japan' },
		{ code: 'KR', name: 'South Korea' },
		{ code: 'CN', name: 'China' },
		{ code: 'IN', name: 'India' },
		{ code: 'SG', name: 'Singapore' },
		{ code: 'MY', name: 'Malaysia' },
		{ code: 'TH', name: 'Thailand' },
		{ code: 'PH', name: 'Philippines' },
		{ code: 'ID', name: 'Indonesia' },
		{ code: 'VN', name: 'Vietnam' },
		{ code: 'NZ', name: 'New Zealand' },
		{ code: 'MX', name: 'Mexico' },
		{ code: 'BR', name: 'Brazil' },
		{ code: 'AR', name: 'Argentina' },
		{ code: 'CL', name: 'Chile' },
		{ code: 'CO', name: 'Colombia' },
		{ code: 'PE', name: 'Peru' },
		{ code: 'ZA', name: 'South Africa' },
		{ code: 'EG', name: 'Egypt' },
		{ code: 'IL', name: 'Israel' },
		{ code: 'AE', name: 'United Arab Emirates' },
		{ code: 'SA', name: 'Saudi Arabia' },
		{ code: 'TR', name: 'Turkey' },
		{ code: 'RU', name: 'Russia' },
		{ code: 'UA', name: 'Ukraine' }
	].sort((a, b) => a.name.localeCompare(b.name));
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
	<div class="note" style="max-width: 720px; white-space: pre-wrap;">{@html data.product.description}</div>
{/if}

<section style="max-width: 520px">
	<h2>Place Order</h2>

	{#if errorMessage}
		<div style="padding: 12px; background: #fee; border: 1px solid #fcc; border-radius: 4px; margin-bottom: 16px; color: #c00;">
			{errorMessage}
		</div>
	{/if}

	{#if successMessage}
		<div style="padding: 12px; background: #efe; border: 1px solid #cfc; border-radius: 4px; margin-bottom: 16px; color: #0c0;">
			{successMessage}
		</div>
	{/if}

	<form class="form">
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

		<div style="padding: 12px; background: #f5f5f5; border-radius: 4px; margin: 16px 0;">
			<strong>Total: {formatPrice(getTotalPrice())}</strong>
		</div>

		<h3>Shipping Address</h3>
		<label>First name <input class="input" name="first_name" required /></label>
		<label>Last name <input class="input" name="last_name" required /></label>
		<label>Email <input class="input" type="email" name="email" required /></label>
		<label>Phone <input class="input" type="tel" name="phone" /></label>
		<label>
			Country
			<select class="select" name="country" bind:value={country} required>
				{#each countries as c}
					<option value={c.code}>{c.name}</option>
				{/each}
			</select>
		</label>
		<label>Region/State <input class="input" name="region" /></label>
		<label>Address 1 <input class="input" name="address1" required /></label>
		<label>Address 2 <input class="input" name="address2" /></label>
		<label>City <input class="input" name="city" required /></label>
		<label>ZIP/Postal Code <input class="input" name="zip" required /></label>

		<div bind:this={paypalButtonsContainer} style="margin-top: 20px;"></div>
	</form>
</section>
