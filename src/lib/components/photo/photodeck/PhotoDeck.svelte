<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		ChevronLeft,
		ChevronRight,
		FaceSmile,
		BookOpen,
		ArchiveBox,
		Pencil,
		Trash,
		ArrowsPointingIn,
		ArrowsPointingOut
	} from 'svelte-hero-icons';
	import { photosService, userService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getPhotoState } from '$lib/stores/photos.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import { colorScheme, alpha } from '$lib/colors';
	import { modelToId } from '$lib/utils';
	import { createViewport } from '$lib/viewport.svelte';
	import { swipe } from '$lib/attachments/swipe';
	import type { PhotoMetadata } from '$lib/api/types';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import PhotoLikes from './PhotoLikes.svelte';
	import PhotoComments from './PhotoComments.svelte';
	import PhotoEditDialog from './PhotoEditDialog.svelte';

	const IMAGE_CLASSES_DESKTOP =
		'w-auto h-auto max-h-[calc(100vh-200px)] object-contain transition-all duration-300';
	const IMAGE_CLASSES_MOBILE = 'max-w-full max-h-full self-start transition-all duration-300';

	interface PhotoDeckProps {
		photos: PhotoMetadata[];
		/** The photo to show. The route owns this; the deck keeps no index of its own. */
		photoId: string;
		/** Nav targets are `{urlPrefix}{id}{searchQuery}`, e.g. '/photo/'. */
		urlPrefix: string;
		searchQuery?: string;
		editControls?: boolean;
		windowFullScreen?: boolean;
	}

	let {
		photos,
		photoId,
		urlPrefix,
		searchQuery = '',
		editControls = false,
		windowFullScreen = false
	}: PhotoDeckProps = $props();

	const app = getAppState();
	const photoState = getPhotoState();
	const toast = getToastState();
	const viewport = createViewport();

	// The URL is the single source of truth for which photo is showing. Holding an index
	// in state is what let the React version drift out of sync with its own address bar.
	let index = $derived.by(() => {
		const i = photos.findIndex((p) => p.id === photoId);
		return i === -1 ? 0 : i;
	});
	let currentPhoto = $derived(photos[index]);

	/** The deck is a carousel, so the chevrons are never disabled. */
	const wrap = (i: number) => (i + photos.length) % photos.length;

	function goTo(i: number) {
		if (photos.length === 0) return;
		goto(`${urlPrefix}${photos[wrap(i)].id}${searchQuery}`);
	}
	const goPrevious = () => goTo(index - 1);
	const goNext = () => goTo(index + 1);

	/** The in-page overlay. Native fullscreen must not set this, or both would render. */
	let showOverlay = $state(false);
	/** Mirrors document.fullscreenElement; drives the toggle's icon only. */
	let nativeActive = $state(false);
	let showDeleteDialog = $state(false);
	let showEditDialog = $state(false);

	let cs = $derived(colorScheme(app.uxConfig.photoBackgroundColor));
	let controlClass = $derived(cs.color === '#ffffff' ? 'text-white' : 'text-gray-900');
	let isInPhotostream = $derived(photoState.streamIds.has(currentPhoto?.id ?? ''));

	let padding = $derived.by(() => {
		// Mobile keeps every pixel for the photo.
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

	async function toggleFullscreen() {
		if (!windowFullScreen) {
			showOverlay = !showOverlay;
			return;
		}
		try {
			if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
			else await document.exitFullscreen();
		} catch {
			// Native fullscreen refused (iOS Safari, a permissions policy). Fall back to the
			// overlay when entering; a failed exit should leave things as they are.
			if (!document.fullscreenElement) showOverlay = true;
		}
	}

	$effect(() => {
		if (!windowFullScreen) return;
		const onChange = () => (nativeActive = !!document.fullscreenElement);
		document.addEventListener('fullscreenchange', onChange);
		return () => document.removeEventListener('fullscreenchange', onChange);
	});

	const isTyping = (t: EventTarget | null) =>
		t instanceof HTMLElement &&
		(t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

	function onKeydown(event: KeyboardEvent) {
		if (isTyping(event.target)) return; // the comment box, the register form
		if (event.key === 'Escape') {
			if (showOverlay) showOverlay = false;
			return;
		}
		// Don't page the deck behind an open modal.
		if (document.querySelector('[role="dialog"]')) return;
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			goPrevious();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			goNext();
		}
	}

	async function setProfilePic() {
		if (!currentPhoto) return;
		try {
			await userService.updateUserPic(photosService.getPhotoThumbUrl(currentPhoto.id));
			await app.refreshAuth();
			toast.success('Profile picture updated');
		} catch (e) {
			console.error('Error setting profile picture:', e);
			toast.error('Failed to update profile picture');
		}
	}

	async function togglePhotostream() {
		const albumId = app.uxConfig.photoStreamAlbumId;
		if (!currentPhoto || !albumId) {
			toast.error('Photostream album not configured');
			return;
		}
		const target = !isInPhotostream;
		try {
			await photoState.setInStream(albumId, currentPhoto, target);
			toast.success(target ? 'Added to photostream' : 'Removed from photostream');
		} catch (e) {
			console.error('Error toggling photostream:', e);
			toast.error('Failed to update photostream');
		}
	}

	async function confirmDelete() {
		if (!currentPhoto) return;
		const doomed = currentPhoto;
		// Snapshot before the store mutates: `index` is derived, so once the photo is gone
		// findIndex returns -1 and it collapses to 0.
		const at = index;
		try {
			await photosService.deletePhoto(doomed.id, true);
			toast.success('Photo deleted');
			showDeleteDialog = false;

			const remaining = photos.filter((p) => p.id !== doomed.id);
			photoState.removePhoto(doomed.id);
			if (remaining.length === 0) {
				await goto(urlPrefix.replace(/\/$/, ''));
				return;
			}
			// `at` now addresses the next photo; wrap to the first if it was the last.
			const next = remaining[at >= remaining.length ? 0 : at];
			await goto(`${urlPrefix}${next.id}${searchQuery}`);
		} catch (e) {
			console.error('Error deleting photo:', e);
			toast.error('Failed to delete photo');
		}
	}

	const formatDate = (d: string) =>
		new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

	let settings = $derived(
		currentPhoto
			? [
					currentPhoto.fNumber && `f${currentPhoto.fNumber}`,
					currentPhoto.iso && `iso${currentPhoto.iso}`,
					currentPhoto.exposure && `${currentPhoto.exposure} secs`
				].filter(Boolean)
			: []
	);
	let focalLength = $derived(
		currentPhoto?.focalLength
			? currentPhoto.focalLength35
				? `${currentPhoto.focalLength} (${currentPhoto.focalLength35})`
				: currentPhoto.focalLength
			: ''
	);
</script>

<svelte:window onkeydown={onKeydown} />

{#if !currentPhoto}
	<div class="flex h-[80vh] items-center justify-center">
		<div class="text-gray-400">No photos available</div>
	</div>
{:else if showOverlay}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
		style="background-color: {cs.backgroundColor}"
	>
		<div class="fixed top-1/2 left-4 z-10 -translate-y-1/2">
			<IconButton
				icon={ChevronLeft}
				onclick={goPrevious}
				ariaLabel="Previous photo"
				size="nav"
				class={controlClass}
			/>
		</div>
		<div class="fixed top-1/2 right-4 z-10 -translate-y-1/2">
			<IconButton
				icon={ChevronRight}
				onclick={goNext}
				ariaLabel="Next photo"
				size="nav"
				class={controlClass}
			/>
		</div>

		<div class="fixed top-4 right-4 z-10">
			<IconButton
				icon={ArrowsPointingIn}
				onclick={toggleFullscreen}
				title="Exit fullscreen"
				tooltipPlacement="bottom-left"
				class={controlClass}
			/>
		</div>

		<div
			class="flex h-full w-full items-center justify-center"
			{@attach swipe({ onPrevious: goPrevious, onNext: goNext })}
		>
			<img
				src={photosService.getPhotoUrl(currentPhoto.id)}
				alt={currentPhoto.title || currentPhoto.fileName}
				class="h-auto max-h-full w-auto max-w-full object-contain"
			/>
		</div>
	</div>
{:else}
	<div class="flex min-h-[calc(100dvh-var(--nav-height))] flex-col">
		<div
			class="relative flex items-center justify-center"
			style="background-color: {cs.backgroundColor}; width: 100vw; margin-left: calc(-50vw + 50%); padding-left: {padding.left}; padding-right: {padding.right}; padding-top: {padding.top}; padding-bottom: {padding.bottom}; min-height: {viewport.isMobile
				? 'auto'
				: 'calc(100vh - 200px)'}"
			{@attach swipe({ onPrevious: goPrevious, onNext: goNext })}
		>
			<!-- The p-2 wrappers are load-bearing: -translate-y-1/2 centres the padded box. -->
			<div class="absolute top-1/2 left-4 z-10 -translate-y-1/2 p-2">
				<IconButton
					icon={ChevronLeft}
					onclick={goPrevious}
					ariaLabel="Previous photo"
					size="nav"
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
			</div>
			<div class="absolute top-1/2 right-4 z-10 -translate-y-1/2 p-2">
				<IconButton
					icon={ChevronRight}
					onclick={goNext}
					ariaLabel="Next photo"
					size="nav"
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
			</div>

			{#if editControls}
				<div class="absolute top-4 left-4 z-10 flex flex-row gap-2 p-2">
					<IconButton
						icon={FaceSmile}
						onclick={setProfilePic}
						title="Set as profile picture"
						tooltipPlacement="bottom"
						background={alpha(cs.backgroundColor, 0.5)}
						class={controlClass}
					/>
					<IconButton
						icon={isInPhotostream ? BookOpen : ArchiveBox}
						onclick={togglePhotostream}
						title={isInPhotostream ? 'Remove from photostream' : 'Add to photostream'}
						tooltipPlacement="bottom"
						background={alpha(cs.backgroundColor, 0.5)}
						class={controlClass}
					/>
					<IconButton
						icon={Pencil}
						onclick={() => (showEditDialog = true)}
						title="Edit photo metadata"
						tooltipPlacement="bottom"
						background={alpha(cs.backgroundColor, 0.5)}
						class={controlClass}
					/>
					<IconButton
						icon={Trash}
						onclick={() => (showDeleteDialog = true)}
						title="Delete photo"
						tooltipPlacement="bottom"
						background={alpha(cs.backgroundColor, 0.5)}
						class={controlClass}
					/>
				</div>
			{/if}

			<div class="absolute top-4 right-4 z-10 p-2">
				<IconButton
					icon={nativeActive ? ArrowsPointingIn : ArrowsPointingOut}
					onclick={toggleFullscreen}
					title={nativeActive ? 'Exit fullscreen' : 'Enter fullscreen'}
					tooltipPlacement="bottom-left"
					background={alpha(cs.backgroundColor, 0.5)}
					class={controlClass}
				/>
			</div>

			<!-- `relative` looks unused but IMAGE_CLASSES_MOBILE's `self-start` resolves
			     against this flex container — don't collapse it. -->
			<div class="relative flex w-full items-center justify-center">
				<img
					src={photosService.getDynamicImageUrl(
						currentPhoto,
						viewport.isPortrait,
						viewport.isMobile
					)}
					alt={currentPhoto.title || currentPhoto.fileName}
					class={viewport.isMobile ? IMAGE_CLASSES_MOBILE : IMAGE_CLASSES_DESKTOP}
				/>
			</div>
		</div>

		<div class="mt-2 mb-auto w-full px-16">
			<div class="mx-auto max-w-4xl">
				<div class="grid grid-cols-1 gap-12 md:grid-cols-2">
					<div class="space-y-4">
						<PhotoLikes photoId={currentPhoto.id} />
						<PhotoComments photoId={currentPhoto.id} />
					</div>

					<div class="space-y-3">
						<h3 class="text-sm font-bold text-gray-900 dark:text-white">
							{currentPhoto.title || 'Untitled'}
						</h3>
						<div class="space-y-1 text-sm text-gray-900 dark:text-white">
							{#if currentPhoto.originalDate}
								<div>Taken on {formatDate(currentPhoto.originalDate)}.</div>
							{/if}

							{#if currentPhoto.cameraModel}
								<div>
									Camera: <a
										href="/camera/{modelToId(currentPhoto.cameraModel)}"
										class="text-blue-600 hover:underline dark:text-blue-400"
									>
										{currentPhoto.cameraModel}
									</a>
								</div>
							{/if}

							{#if currentPhoto.lensModel}
								<div>Lens: {currentPhoto.lensModel}</div>
							{/if}

							{#if focalLength}
								<div>Focal length: {focalLength}.</div>
							{/if}

							{#if settings.length > 0}
								<div>Settings: {settings.join(', ')}.</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	{#if editControls}
		<Dialog
			open={showDeleteDialog}
			onClose={() => (showDeleteDialog = false)}
			onOk={confirmDelete}
			title="Delete Photo?"
			text="By removing the photo all associated image data will be deleted"
			okText="DELETE"
			closeText="CANCEL"
		/>
		<PhotoEditDialog
			open={showEditDialog}
			photo={currentPhoto}
			onClose={(updated) => {
				showEditDialog = false;
				if (updated) photoState.updatePhoto(updated);
			}}
		/>
	{/if}
{/if}
