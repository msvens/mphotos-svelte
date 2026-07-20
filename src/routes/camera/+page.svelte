<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { camerasService } from '$lib/api/services';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';

	let loading = $state(true);

	// /camera has no view of its own — it hands off to the first camera.
	onMount(async () => {
		try {
			const cameras = await camerasService.getCameras();
			if (cameras.length > 0) {
				await goto(`/camera/${cameras[0].id}`, { replaceState: true });
				return;
			}
		} catch (e) {
			console.error('Error fetching cameras:', e);
		}
		loading = false;
	});
</script>

<PageSpacing />

<div class="flex min-h-[calc(100vh-200px)] items-center justify-center">
	{#if loading}
		<div class="animate-pulse text-gray-400">Loading...</div>
	{:else}
		<div class="text-gray-400">No cameras available</div>
	{/if}
</div>
