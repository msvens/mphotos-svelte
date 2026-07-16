<script lang="ts">
	import { getAppState } from '$lib/stores/app.svelte';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import Bio from '$lib/components/home/Bio.svelte';

	const app = getAppState();
</script>

<PageSpacing />
{#if app.uxConfig.showBio}
	<Bio />
{/if}
