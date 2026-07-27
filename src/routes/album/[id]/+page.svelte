<script lang="ts">
	import { page } from '$app/state';
	import { Icon, ChevronLeft, ChevronRight, Photo, Share } from 'svelte-hero-icons';
	import { albumsService, photosService } from '$lib/api/services';
	import { ApiError } from '$lib/api/client';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import type { Album, PhotoMetadata } from '$lib/api/types';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import PhotoGrid from '$lib/components/photo/PhotoGrid.svelte';
	import { copyAlbumLink } from '$lib/components/album/albumShare';

	const app = getAppState();
	const toast = getToastState();

	let album = $state<Album | null>(null);
	let photos = $state<PhotoMetadata[]>([]);
	let loading = $state(true);
	let notFound = $state(false);
	let locked = $state(false);
	let orderUpdated = $state(false);

	// A private album carries its access code as `?code=`; guests reach it only via that URL.
	let code = $derived(page.url.searchParams.get('code') ?? '');
	let codeQuery = $derived(code ? `?code=${encodeURIComponent(code)}` : '');

	// Keyed on the album id + code (cancelled-guard, like the camera photos page): fetch the
	// album, then its photos. The photos call is code-gated, so a 401 is a "private" state
	// rather than a hard error.
	$effect(() => {
		const id = page.params.id;
		const c = code;
		if (!id) return;
		let cancelled = false;
		loading = true;
		notFound = false;
		locked = false;
		orderUpdated = false;
		(async () => {
			try {
				const a = await albumsService.getAlbum(id);
				if (cancelled) return;
				album = a;
			} catch (e) {
				if (cancelled) return;
				console.error('Error fetching album:', e);
				notFound = true;
				loading = false;
				return;
			}
			try {
				const list = await albumsService.getAlbumPhotos(id, c || undefined);
				if (cancelled) return;
				photos = list.photos ?? [];
			} catch (e) {
				if (cancelled) return;
				if (e instanceof ApiError && e.status === 401) {
					locked = true;
				} else {
					console.error('Error fetching album photos:', e);
				}
				photos = [];
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => (cancelled = true);
	});

	// Owner-only reorder, with wraparound at the ends. Mirrors the React app's movePhoto.
	function movePhoto(index: number, up: boolean) {
		if (photos.length < 2) return;
		const next = [...photos];
		if (up && index === 0) {
			next.push(next.shift()!);
		} else if (!up && index === photos.length - 1) {
			next.unshift(next.pop()!);
		} else {
			const swap = up ? index - 1 : index + 1;
			[next[index], next[swap]] = [next[swap], next[index]];
		}
		photos = next;
		orderUpdated = true;
	}

	async function saveOrdering() {
		if (!album) return;
		try {
			await albumsService.updateAlbumOrder(album, { length: photos.length, photos });
			const list = await albumsService.getAlbumPhotos(album.id, code || undefined);
			photos = list.photos ?? [];
			orderUpdated = false;
			toast.success('Ordering saved');
		} catch (e) {
			console.error('Error saving order:', e);
			toast.error('Failed to save ordering');
		}
	}

	async function setCover(photo: PhotoMetadata) {
		if (!album) return;
		try {
			const coverPic = photosService.getLandscapeUrl(photo.id);
			album = await albumsService.updateAlbum({ ...album, coverPic });
			toast.success('Album cover updated');
		} catch (e) {
			console.error('Error setting cover:', e);
			toast.error('Failed to set cover');
		}
	}

	let isCover = $derived(
		(photo: PhotoMetadata) => album?.coverPic === photosService.getLandscapeUrl(photo.id)
	);

	async function shareLink() {
		if (!album) return;
		try {
			await copyAlbumLink(album);
			toast.success('Link copied');
		} catch (e) {
			console.error('Error copying album link:', e);
			toast.error('Failed to copy link');
		}
	}
</script>

<!-- Owner-only per-tile controls: reorder + set-as-cover. Declared out here so the overlay
     (and its dark bar) is never rendered for guests. -->
{#snippet ownerOverlay(photo: PhotoMetadata, index: number)}
	<div class="flex items-center gap-1">
		<button
			onclick={() => movePhoto(index, true)}
			title="Move left"
			aria-label="Move left"
			class="rounded p-1 hover:bg-white/20"
		>
			<Icon src={ChevronLeft} class="h-5 w-5 text-white" />
		</button>
		<button
			onclick={() => movePhoto(index, false)}
			title="Move right"
			aria-label="Move right"
			class="rounded p-1 hover:bg-white/20"
		>
			<Icon src={ChevronRight} class="h-5 w-5 text-white" />
		</button>
		<button
			onclick={() => setCover(photo)}
			title="Set as album cover"
			aria-label="Set as album cover"
			class="rounded p-1 hover:bg-white/20"
		>
			<Icon src={Photo} class="h-5 w-5 {isCover(photo) ? 'text-blue-400' : 'text-white'}" />
		</button>
	</div>
{/snippet}

<PageSpacing />

{#if loading}
	<div class="flex min-h-[calc(100vh-200px)] items-center justify-center">
		<div class="animate-pulse text-gray-400">Loading...</div>
	</div>
{:else if notFound || !album}
	<div class="py-12 text-center text-gray-400">Album not found</div>
{:else}
	<div class="mx-auto max-w-[1024px]">
		<div class="mb-6 flex items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				<h1 class="text-2xl font-light">{album.name}</h1>
				{#if app.isUser}
					<IconButton icon={Share} size="small" title="Copy share link" onclick={shareLink} />
				{/if}
			</div>
			{#if app.isUser && photos.length > 1}
				<button
					onclick={saveOrdering}
					disabled={!orderUpdated}
					class="rounded border border-gray-500 px-3 py-1 text-sm transition-colors {orderUpdated
						? 'cursor-pointer text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800'
						: 'cursor-not-allowed text-gray-500'}"
				>
					Save Ordering
				</button>
			{/if}
		</div>
		{#if locked}
			<div class="py-12 text-center text-gray-400">This album is private</div>
		{:else if photos.length === 0}
			<div class="py-12 text-center text-gray-400">Add photos to this album</div>
		{:else}
			<PhotoGrid
				{photos}
				columns={app.uxConfig.photoGridCols}
				spacing={app.uxConfig.photoGridSpacing}
				linkTo={`/album/${album.id}`}
				linkQuery={codeQuery}
				overlay={app.isUser ? ownerOverlay : undefined}
			/>
		{/if}
	</div>
{/if}
