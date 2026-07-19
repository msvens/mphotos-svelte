<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { camerasService } from '$lib/api/services';
	import type { Camera } from '$lib/api/types';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import SideMenu from '$lib/components/layout/SideMenu.svelte';
	import CameraDetail from '$lib/components/camera/CameraDetail.svelte';

	let cameras = $state<Camera[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			cameras = await camerasService.getCameras();
		} catch (e) {
			console.error('Error fetching cameras:', e);
		} finally {
			loading = false;
		}
	});

	// URL is the source of truth for which camera is shown; switching updates the route param.
	let selected = $derived(cameras.find((c) => c.id === page.params.id) ?? null);
	let menuItems = $derived(cameras.map((c) => ({ id: c.id, name: c.model })));

	function handleUpdate(updated: Camera) {
		cameras = cameras.map((c) => (c.id === updated.id ? updated : c));
	}
</script>

<PageSpacing />

{#if loading}
	<div class="flex min-h-[calc(100vh-200px)] items-center justify-center">
		<div class="animate-pulse text-gray-400">Loading...</div>
	</div>
{:else if !selected}
	<div class="py-12 text-center text-gray-400">Camera not found</div>
{:else}
	<div class="flex flex-col sm:flex-row">
		<SideMenu
			items={menuItems}
			activeItem={selected.id}
			onItemChange={(id) => goto(`/camera/${id}`)}
		/>
		<div class="flex-1 pr-8 pl-4">
			<CameraDetail camera={selected} onUpdate={handleUpdate} />
		</div>
	</div>
{/if}
