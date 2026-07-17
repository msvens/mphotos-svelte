import { getContext, setContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { photosService, albumsService } from '$lib/api/services';
import type { PhotoMetadata, PhotoList } from '$lib/api/types';

const EMPTY: PhotoList = { length: 0, photos: [] };

/**
 * The site's photo lists.
 *
 * Collapses the `isUser ? getPhotos() : getAlbumPhotos(streamId)` branch that the React
 * app repeated in five places, and caches across navigation so a grid → photo → back
 * round trip costs nothing.
 *
 * Holds only state + actions (no `$effect`, no timers) so it can be unit-tested by
 * instantiating it directly. The route that mounts owns the call to `load()`.
 * Provide/consume it via the context helpers below.
 */
export class PhotoState {
	/** Every photo. Only populated for the owner; guests get an empty list. */
	allPhotos = $state<PhotoMetadata[]>([]);
	/** Photos in the configured photostream album. Empty when none is configured. */
	streamPhotos = $state<PhotoMetadata[]>([]);
	/** Ids of `streamPhotos`, for O(1) membership tests while rendering. */
	streamIds = new SvelteSet<string>();
	/** Whether the loaded lists were fetched as the authenticated owner. */
	isOwnerView = $state(false);
	loading = $state(true);
	error = $state<string | null>(null);

	/** The list a visitor should see: everything for the owner, the stream otherwise. */
	photos = $derived(this.isOwnerView ? this.allPhotos : this.streamPhotos);

	/** Bumped per load; a response whose token is stale is discarded. */
	#token = 0;
	/** The (viewer, album) pair the current lists were loaded for. */
	#key: string | null = null;

	/**
	 * Load both lists for the given viewer. Repeat calls with the same
	 * `(isUser, photoStreamAlbumId)` pair are ignored — pass `force` after a mutation.
	 * Never throws; check `error`.
	 */
	async load(isUser: boolean, photoStreamAlbumId: string, force = false) {
		const key = `${isUser}:${photoStreamAlbumId}`;
		if (!force && key === this.#key) return;
		this.#key = key;

		const token = ++this.#token;
		this.loading = true;
		try {
			// Both lists in one round: the owner's view needs `allPhotos` to render and
			// `streamIds` to dim, and toggling between them must not refetch.
			const [stream, all] = await Promise.all([
				photoStreamAlbumId ? albumsService.getAlbumPhotos(photoStreamAlbumId) : EMPTY,
				isUser ? photosService.getPhotos() : EMPTY
			]);
			if (token !== this.#token) return;

			this.streamPhotos = stream.photos;
			this.streamIds.clear();
			for (const p of stream.photos) this.streamIds.add(p.id);
			this.allPhotos = all.photos;
			this.isOwnerView = isUser;
			this.error = null;
		} catch (e) {
			if (token !== this.#token) return;
			console.error('Error fetching photos:', e);
			this.#key = null; // a failed load must not dedupe the retry
			this.error = 'Failed to fetch photos';
		} finally {
			if (token === this.#token) this.loading = false;
		}
	}

	/**
	 * Add or remove one photo from the photostream album. Throws on failure.
	 *
	 * Targeted rather than a read-modify-write of the photo's whole album list, so a
	 * membership changed elsewhere in the meantime survives.
	 */
	async setInStream(albumId: string, photo: PhotoMetadata, inStream: boolean) {
		if (inStream) {
			await albumsService.addAlbumPhotos(albumId, [photo.id]);
			this.streamIds.add(photo.id);
			this.streamPhotos = [...this.streamPhotos, photo];
		} else {
			await albumsService.deleteAlbumPhotos(albumId, [photo.id]);
			this.streamIds.delete(photo.id);
			this.streamPhotos = this.streamPhotos.filter((p) => p.id !== photo.id);
		}
	}

	/** Replace a photo in both lists, after an edit. */
	updatePhoto(photo: PhotoMetadata) {
		const swap = (p: PhotoMetadata) => (p.id === photo.id ? photo : p);
		this.allPhotos = this.allPhotos.map(swap);
		this.streamPhotos = this.streamPhotos.map(swap);
	}

	/** Drop a photo from both lists, after a delete. */
	removePhoto(id: string) {
		const keep = (p: PhotoMetadata) => p.id !== id;
		this.allPhotos = this.allPhotos.filter(keep);
		this.streamPhotos = this.streamPhotos.filter(keep);
		this.streamIds.delete(id);
	}
}

/** Context key for the photo state. Exported so tests can inject a controlled instance. */
export const PHOTO_STATE_KEY = Symbol('photo-state');

/** Create the photo state and put it in context. Call once, in the root layout. */
export function setPhotoState(): PhotoState {
	const state = new PhotoState();
	setContext(PHOTO_STATE_KEY, state);
	return state;
}

/** Read the photo state from context. Call during component initialization. */
export function getPhotoState(): PhotoState {
	return getContext<PhotoState>(PHOTO_STATE_KEY);
}
