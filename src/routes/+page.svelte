<script lang="ts">
	import { getAppState } from '$lib/stores/app.svelte';

	const app = getAppState();
</script>

<!-- TEMPORARY: verifies the auth/config store reacts end-to-end.
     The real Navbar/Bio will replace this in a later chunk. -->
<main class="p-8 font-mono text-sm">
	<h1 class="mb-4 text-lg font-semibold">mphotos-svelte — auth store probe</h1>
	{#if app.loading}
		<p>Loading…</p>
	{:else}
		<ul class="space-y-1">
			<li>isUser: <strong>{app.isUser}</strong></li>
			<li>isGuest: <strong>{app.isGuest}</strong></li>
			<li>user.name: <strong>{app.user.name || '(none)'}</strong></li>
			<li>guest: <strong>{app.guest?.name ?? '(none)'}</strong></li>
			<li>colorTheme: <strong>{app.uxConfig.colorTheme}</strong></li>
			<li>photoGridCols: <strong>{app.uxConfig.photoGridCols}</strong></li>
		</ul>
	{/if}
</main>
