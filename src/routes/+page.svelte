<script lang="ts">
	import { getAppState } from '$lib/stores/app.svelte';
	import PageSpacing from '$lib/components/PageSpacing.svelte';
	import Bio from '$lib/components/Bio.svelte';

	const app = getAppState();
</script>

<PageSpacing />
{#if app.uxConfig.showBio}
	<Bio />
{/if}
