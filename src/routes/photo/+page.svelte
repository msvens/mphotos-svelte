<script lang="ts">
	import { goto } from '$app/navigation';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getPhotoState } from '$lib/stores/photos.svelte';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import Section from '$lib/components/layout/Section.svelte';

	const app = getAppState();
	const photoState = getPhotoState();

	// /photo has no view of its own — it hands off to the first photo. `replaceState` so
	// it doesn't sit in the history and bounce you back here on Back.
	$effect(() => {
		if (app.loading) return;
		let cancelled = false;
		(async () => {
			await photoState.load(app.isUser, app.uxConfig.photoStreamAlbumId);
			if (cancelled) return;
			const first = photoState.photos[0];
			if (first) await goto(`/photo/${first.id}`, { replaceState: true });
		})();
		return () => (cancelled = true);
	});
</script>

<PageSpacing />

<Section>
	{#if app.loading || photoState.loading}
		<div class="flex h-[50vh] items-center justify-center">
			<div class="animate-pulse text-gray-400">Loading photos...</div>
		</div>
	{:else if photoState.error}
		<div class="flex h-[50vh] items-center justify-center">
			<div class="text-red-500">{photoState.error}</div>
		</div>
	{:else}
		<div class="flex h-[50vh] items-center justify-center">
			<div class="text-gray-400">No photos available</div>
		</div>
	{/if}
</Section>
