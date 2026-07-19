<script lang="ts">
	import type { Camera } from '$lib/api/types';
	import { camerasService } from '$lib/api/services';
	import { getToastState } from '$lib/stores/toast.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { displayName } from './cameraSpec';

	interface UpdateCameraDialogProps {
		camera: Camera;
		open: boolean;
		onClose: () => void;
		onUpdate: (camera: Camera) => void;
	}

	let { camera, open, onClose, onUpdate }: UpdateCameraDialogProps = $props();

	const toast = getToastState();

	const INT_KEYS = new Set(['year', 'effectivePixels', 'totalPixels']);
	const FLOAT_KEYS = new Set(['cropFactor', 'opticalZoom', 'focusRange', 'macroFocusRange']);
	const READ_ONLY: (keyof Camera)[] = ['make', 'model'];

	// Assignable $derived: seeds from the camera prop and re-seeds if it changes (e.g. switching
	// cameras behind the dialog); handleChange reassigns it as the user edits.
	let formData = $derived<Camera>({ ...camera });
	let updating = $state(false);

	let editableFields = $derived(
		Object.keys(formData).filter(
			(key) => key !== 'id' && key !== 'image' && key !== 'make' && key !== 'model'
		) as (keyof Camera)[]
	);

	function handleChange(key: keyof Camera, value: string) {
		let parsed: string | number | boolean;
		if (INT_KEYS.has(key)) parsed = parseInt(value) || 0;
		else if (FLOAT_KEYS.has(key)) parsed = parseFloat(value) || 0;
		else if (typeof formData[key] === 'boolean') parsed = value === 'true';
		else parsed = value;
		formData = { ...formData, [key]: parsed } as Camera;
	}

	async function handleSubmit() {
		updating = true;
		try {
			const updated = await camerasService.updateCamera(camera.id, formData);
			onUpdate(updated);
			onClose();
		} catch (e) {
			console.error('Error updating camera:', e);
			toast.error('Failed to update camera');
		} finally {
			updating = false;
		}
	}

	const boolOptions = [
		{ value: 'false', label: 'No' },
		{ value: 'true', label: 'Yes' }
	];
</script>

<Dialog
	{open}
	{onClose}
	onOk={handleSubmit}
	closeOnOk={false}
	maxWidth="lg"
	title="Update Camera"
	okText={updating ? 'UPDATING...' : 'OK'}
>
	<div class="space-y-4">
		<p class="text-sm text-gray-600 dark:text-gray-400">Update Camera Spec</p>

		<div class="space-y-3">
			{#each READ_ONLY as key (key)}
				<div
					class="grid grid-cols-[160px_1fr] items-center gap-4 border-b border-gray-200 py-2 dark:border-gray-700"
				>
					<span class="text-sm text-gray-600 dark:text-gray-400">{displayName(key)}</span>
					<span class="text-sm text-gray-900 dark:text-white">{formData[key]}</span>
				</div>
			{/each}
		</div>

		<div class="max-h-96 space-y-3 overflow-y-auto">
			{#each editableFields as key (key)}
				<div class="border-b border-gray-200 py-2 dark:border-gray-700">
					{#if typeof formData[key] === 'boolean'}
						<Select
							label={displayName(key)}
							value={String(formData[key])}
							onChange={(v) => handleChange(key, v)}
							options={boolOptions}
							fullWidth
						/>
					{:else}
						<TextField
							label={displayName(key)}
							value={String(formData[key] ?? '')}
							oninput={(e) => handleChange(key, e.currentTarget.value)}
							fullWidth
						/>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</Dialog>
