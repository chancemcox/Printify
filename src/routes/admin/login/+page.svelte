<script lang="ts">
	import { page } from '$app/stores';
</script>

<h1>Admin Login</h1>
<p class="note">Enter your admin token to manage which products appear in the storefront.</p>

<form class="form" method="POST">
	<label>
		Admin token
		<input class="input" name="token" type="password" autocomplete="current-password" required />
	</label>
	<button class="button" type="submit">Sign in</button>
</form>

{#if $page.form?.error}
	<p class="note"><strong>Error:</strong> {$page.form.error}</p>
{/if}
