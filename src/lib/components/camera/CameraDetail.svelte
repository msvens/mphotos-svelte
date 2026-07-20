<script lang="ts">
	import { Photo, Pencil } from 'svelte-hero-icons';
	import type { Camera } from '$lib/api/types';
	import { camerasService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import { createViewport } from '$lib/viewport.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { buildSpecs } from './cameraSpec';
	import UpdateCameraDialog from './UpdateCameraDialog.svelte';
	import CameraImageDialog from './CameraImageDialog.svelte';

	interface CameraDetailProps {
		camera: Camera;
		onUpdate: (camera: Camera) => void;
	}

	let { camera, onUpdate }: CameraDetailProps = $props();

	const app = getAppState();
	const viewport = createViewport();

	let showUpdateDialog = $state(false);
	let showImageDialog = $state(false);

	let imageUrl = $derived(
		camerasService.getCameraImageUrl(camera, viewport.isMobile ? '192' : '512')
	);
	let specs = $derived(buildSpecs(camera));
</script>

<div class="space-y-6">
	<div class="flex justify-center">
		<img src={imageUrl} alt={camera.model} class="h-auto max-h-96 max-w-full rounded-lg" />
	</div>

	<div class="flex justify-center">
		<a
			href="/camera/{camera.id}/photos"
			class="text-gray-900 underline hover:text-gray-700 dark:text-white dark:hover:text-gray-200"
		>
			Photos
		</a>
	</div>

	{#if app.isUser}
		<div class="flex justify-center gap-2">
			<IconButton icon={Photo} onclick={() => (showImageDialog = true)} title="Edit Camera Image" />
			<IconButton
				icon={Pencil}
				onclick={() => (showUpdateDialog = true)}
				title="Edit Camera Spec"
			/>
		</div>
	{/if}

	<div class="mx-auto max-w-2xl">
		<table class="w-full text-sm">
			<tbody>
				{#each specs as spec (spec.key)}
					<tr class="border-b border-gray-200 dark:border-gray-700">
						<td class="py-2 pr-4 text-gray-600 dark:text-gray-400">{spec.displayName}</td>
						<td class="py-2 text-gray-900 dark:text-white">{spec.value}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if app.isUser}
		<UpdateCameraDialog
			{camera}
			open={showUpdateDialog}
			onClose={() => (showUpdateDialog = false)}
			{onUpdate}
		/>
		<CameraImageDialog
			{camera}
			open={showImageDialog}
			onClose={() => (showImageDialog = false)}
			{onUpdate}
		/>
	{/if}
</div>
