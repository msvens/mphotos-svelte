<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowUturnLeft, Eye, XMark, ArrowDownTray } from 'svelte-hero-icons';
	import { photosService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getPhotoState } from '$lib/stores/photos.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import { colorScheme, alpha } from '$lib/colors';
	import { createViewport } from '$lib/viewport.svelte';
	import type { PhotoMetadata } from '$lib/api/types';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import type { TooltipPlacement } from '$lib/components/ui/Tooltip.svelte';
	import CropBox from './CropBox.svelte';
	import CropIconButton from './CropIconButton.svelte';
	import { rotateToDataUrl, type RotatedImage } from './rotateImage';
	import { centeredAspectBox, editParams, toNaturalRect, type Rect } from './cropMath';

	interface CropPageProps {
		photo: PhotoMetadata;
		backUrl: string;
	}

	let { photo, backUrl }: CropPageProps = $props();

	const app = getAppState();
	const photoState = getPhotoState();
	const toast = getToastState();
	const viewport = createViewport();

	const IMAGE_CLASSES =
		'w-auto h-auto max-h-[calc(100vh-200px)] object-contain transition-all duration-300';
	const LANDSCAPE = 1200 / 628;
	const SQUARE = 1;
	const PORTRAIT = 1080 / 1350;

	let imgSrc = $derived(photosService.getPhotoUrl(photo.id));

	let crop = $state<Rect | null>(null); // displayed px, the visible box
	let completedCrop = $state<Rect | null>(null); // natural px, what save uses
	let rotation = $state(0);
	let aspect = $state<number | undefined>(undefined);
	let showPreview = $state(false);
	let previewUrl = $state('');
	let saving = $state(false);

	let boxEl = $state<HTMLImageElement>(); // the displayed image, for its client dims
	let rotated = $state<RotatedImage | null>(null);

	// Rotate for display via canvas so the crop box stays an axis-aligned rectangle over an
	// upright image whose natural dims match the server's rotated raster.
	$effect(() => {
		const deg = rotation;
		if (deg === 0) {
			rotated = null;
			return;
		}
		const im = new Image();
		im.crossOrigin = 'anonymous';
		im.src = imgSrc;
		im.onload = () => (rotated = rotateToDataUrl(im, deg));
		return () => {
			im.onload = null;
		};
	});

	let displayImage = $derived(rotation !== 0 && rotated ? rotated.src : imgSrc);

	// Natural dims of what's displayed: the rotated raster when rotating, else the original.
	let naturalDims = $derived(
		rotation !== 0 && rotated
			? { w: rotated.width, h: rotated.height }
			: { w: photo.width, h: photo.height }
	);

	let cs = $derived(colorScheme(app.uxConfig.photoBackgroundColor));
	let controlClass = $derived(cs.color === '#ffffff' ? 'text-white' : 'text-gray-900');
	let hasVerticalControls = $derived(app.uxConfig.photoBorders !== 'none');
	let tooltipSide = $derived<TooltipPlacement>(hasVerticalControls ? 'bottom-right' : 'bottom');

	let padding = $derived.by(() => {
		if (viewport.isMobile) return { left: '0', right: '0', top: '0', bottom: '0' };
		switch (app.uxConfig.photoBorders) {
			case 'none':
				return { left: '0', right: '0', top: '0', bottom: '0' };
			case 'all':
				return { left: '5rem', right: '5rem', top: '2rem', bottom: '2rem' };
			default: // 'left-right'
				return { left: '5rem', right: '5rem', top: '0', bottom: '0' };
		}
	});
	let containerStyle = $derived(
		`background-color: ${cs.backgroundColor}; width: 100vw; margin-left: calc(-50vw + 50%); ` +
			`padding-left: ${padding.left}; padding-right: ${padding.right}; padding-top: ${padding.top}; ` +
			`padding-bottom: ${padding.bottom}; min-height: calc(100vh - 200px)`
	);

	function selectAspect(a: number | undefined) {
		aspect = a;
		if (a && boxEl) {
			crop = centeredAspectBox(boxEl.clientWidth, boxEl.clientHeight, a);
			// Commit immediately so a Save right after picking an aspect crops, without a drag.
			completedCrop = toNaturalRect(
				crop,
				boxEl.naturalWidth,
				boxEl.clientWidth,
				boxEl.naturalHeight,
				boxEl.clientHeight
			);
		}
		// "Free" (no aspect) just unlocks the ratio, keeping any existing box; a fresh selection
		// is then drawn directly on the image (CropBox's draw-to-create).
	}

	function rotate(deg: number) {
		rotation = (rotation + deg) % 360;
		// The rotated bounding box changes the coordinate space, so any box is now meaningless.
		crop = null;
		completedCrop = null;
		aspect = undefined;
	}

	function restore() {
		crop = null;
		completedCrop = null;
		rotation = 0;
		aspect = undefined;
		showPreview = false;
		previewUrl = '';
	}

	function preview() {
		previewUrl = photosService.getEditPreviewUrl(
			photo.id,
			editParams(rotation, completedCrop, naturalDims.w, naturalDims.h)
		);
		showPreview = true;
	}

	async function save() {
		saving = true;
		try {
			await photosService.editPhoto(
				photo.id,
				editParams(rotation, completedCrop, naturalDims.w, naturalDims.h)
			);
			toast.success('Photo saved successfully');
			photoState.bumpVersion(photo.id); // the derived files changed at the same URLs
			await goto(backUrl);
		} catch (e) {
			console.error('Error saving photo edits:', e);
			toast.error('Failed to save photo edits');
		} finally {
			saving = false;
		}
	}
</script>

{#if showPreview}
	<div class="flex min-h-[calc(100dvh-var(--nav-height))] flex-col">
		<div class="relative flex items-center justify-center" style={containerStyle}>
			<div class="absolute top-4 right-4 z-10 p-2">
				<IconButton
					icon={XMark}
					onclick={() => (showPreview = false)}
					title="Close preview"
					tooltipPlacement="bottom-left"
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
			</div>
			<div class="relative flex w-full items-center justify-center">
				<img src={previewUrl} alt="Preview" class={IMAGE_CLASSES} />
			</div>
		</div>
	</div>
{:else}
	<div class="flex min-h-[calc(100dvh-var(--nav-height))] flex-col">
		<div class="relative flex items-center justify-center" style={containerStyle}>
			<div
				class="absolute top-4 left-4 z-10 flex gap-2 p-2 {hasVerticalControls
					? 'flex-col'
					: 'flex-row'}"
			>
				<CropIconButton
					glyph="portrait"
					onclick={() => selectAspect(PORTRAIT)}
					title="Portrait crop"
					tooltipPlacement={tooltipSide}
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
				<CropIconButton
					glyph="landscape"
					onclick={() => selectAspect(LANDSCAPE)}
					title="Landscape crop"
					tooltipPlacement={tooltipSide}
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
				<CropIconButton
					glyph="square"
					onclick={() => selectAspect(SQUARE)}
					title="Square crop"
					tooltipPlacement={tooltipSide}
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
				<CropIconButton
					glyph="free"
					onclick={() => selectAspect(undefined)}
					title="Free crop"
					tooltipPlacement={tooltipSide}
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
				<div class="my-1 h-px bg-white/30"></div>
				<CropIconButton
					glyph="rotate90"
					onclick={() => rotate(90)}
					title="Rotate 90°"
					tooltipPlacement={tooltipSide}
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
				<CropIconButton
					glyph="rotate5"
					onclick={() => rotate(5)}
					title="Rotate 5°"
					tooltipPlacement={tooltipSide}
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
				<div class="my-1 h-px bg-white/30"></div>
				<IconButton
					icon={ArrowUturnLeft}
					onclick={restore}
					title="Restore original"
					tooltipPlacement={tooltipSide}
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
				<IconButton
					icon={Eye}
					onclick={preview}
					title="Preview"
					tooltipPlacement={tooltipSide}
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
				<div class="my-1 h-px bg-white/30"></div>
				<IconButton
					icon={ArrowDownTray}
					onclick={save}
					title="Save"
					tooltipPlacement={tooltipSide}
					disabled={saving}
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
			</div>

			<div class="absolute top-4 right-4 z-10 p-2">
				<IconButton
					icon={XMark}
					onclick={() => goto(backUrl)}
					title="Close"
					tooltipPlacement="bottom-left"
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
			</div>

			<div class="relative flex w-full items-center justify-center">
				<CropBox
					bind:imgEl={boxEl}
					src={displayImage}
					alt={photo.title || photo.fileName}
					imageClass={IMAGE_CLASSES}
					{aspect}
					{crop}
					onCropChange={(r) => (crop = r)}
					onCompleteCrop={(natural) => (completedCrop = natural)}
				/>
			</div>
		</div>
	</div>
{/if}
