<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getAppState } from '$lib/stores/app.svelte';
	import { photosService } from '$lib/api/services';
	import type { PhotoMetadata } from '$lib/api/types';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import CropPage from '$lib/components/photo/crop/CropPage.svelte';

	const app = getAppState();

	let id = $derived(page.params.id ?? '');
	let photo = $state<PhotoMetadata | null>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			photo = await photosService.getPhoto(id);
		} catch (e) {
			console.error('Error fetching photo:', e);
		} finally {
			loading = false;
		}
	});

	// Owner-only: the edit endpoint is auth-gated, so a guest would get a UI that fails on save.
	$effect(() => {
		if (!app.loading && !app.isUser) goto(`/photo/${id}`);
	});
</script>

{#if app.loading || loading}
	<div class="flex min-h-[calc(100dvh-var(--nav-height))] items-center justify-center bg-black">
		<div class="text-white">Loading...</div>
	</div>
{:else if !photo}
	<div class="flex min-h-[calc(100dvh-var(--nav-height))] items-center justify-center bg-black">
		<div class="text-white">Photo not found</div>
	</div>
{:else}
	<PageSpacing height="none" />
	<CropPage {photo} backUrl={`/photo/${id}`} />
{/if}
