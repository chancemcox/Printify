<script lang="ts">
	import '../styles.css';
</script>

<header class="header">
	<div class="container header__inner">
		<a class="brand" href="/">Apparel</a>
		<nav class="nav">
			<a href="/products">Products</a>
			<a href="/admin">Admin</a>
		</nav>
	</div>
</header>

<main class="container main">
	<slot />
</main>

<footer class="footer">
	<div class="container">
		<small>Powered by SvelteKit + Cloudflare + Printify</small>
	</div>
</footer>
