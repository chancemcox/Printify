<script lang="ts">
	import { page } from '$app/stores';
</script>

<h1>Something went wrong</h1>
<p class="note">
	<strong>Status:</strong> {$page.status}
	<br />
	<strong>Message:</strong> {$page.error?.message}
</p>
