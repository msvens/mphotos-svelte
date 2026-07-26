import { getContext, setContext } from 'svelte';
import { SvelteSet, SvelteMap } from 'svelte/reactivity';
import { photosService, albumsService } from '$lib/api/services';
import type { PhotoMetadata, PhotoList } from '$lib/api/types';

const EMPTY: PhotoList = { length: 0, photos: [] };

/**
 * The site's photo lists.
 *
 * The main list comes from the public `GET /api/photos`, which the backend serves by
 * session: the owner gets every photo, a guest gets the photostream members. The owner
 * additionally needs the photostream album's membership to drive the home-page dimming
 * and the "Show Photostream" narrow, so that stays an owner-only second fetch. Caches
 * across navigation so a grid → photo → back round trip costs nothing.
 *
 * Holds only state + actions (no `$effect`, no timers) so it can be unit-tested by
 * instantiating it directly. The route that mounts owns the call to `load()`.
 * Provide/consume it via the context helpers below.
 */
export class PhotoState {
	/** The list a visitor should see: everything for the owner, the stream for a guest. */
	photos = $state<PhotoMetadata[]>([]);
	/** The photostream album's members. Owner-only; empty for a guest. */
	streamPhotos = $state<PhotoMetadata[]>([]);
	/** Ids of `streamPhotos`, for O(1) membership tests while rendering. */
	streamIds = new SvelteSet<string>();
	/** Cache-bust tokens for edited photos: the server overwrites files at the same URL. */
	versions = new SvelteMap<string, number>();
	loading = $state(true);
	error = $state<string | null>(null);

	/** Bumped per load; a response whose token is stale is discarded. */
	#token = 0;
	/** The (viewer, album) pair the current lists were loaded for. */
	#key: string | null = null;

	/**
	 * Load the visitor's photo list, plus the owner's photostream membership. Repeat calls
	 * with the same `(isUser, photoStreamAlbumId)` pair are ignored — pass `force` after a
	 * mutation. `isUser` stays in the dedupe key so an owner with no stream album still
	 * refetches on login (their key differs from the guest's). Never throws; check `error`.
	 */
	async load(isUser: boolean, photoStreamAlbumId: string, force = false) {
		const key = `${isUser}:${photoStreamAlbumId}`;
		if (!force && key === this.#key) return;
		this.#key = key;

		const token = ++this.#token;
		this.loading = true;
		try {
			// The main list is public and session-aware; the stream membership is owner-only
			// (a guest's `photoStreamAlbumId` is blank) and feeds `streamIds` for dimming.
			const [main, stream] = await Promise.all([
				photosService.getPhotos(),
				isUser && photoStreamAlbumId ? albumsService.getAlbumPhotos(photoStreamAlbumId) : EMPTY
			]);
			if (token !== this.#token) return;

			this.photos = main.photos;
			this.streamPhotos = stream.photos;
			this.streamIds.clear();
			for (const p of stream.photos) this.streamIds.add(p.id);
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
		this.photos = this.photos.map(swap);
		this.streamPhotos = this.streamPhotos.map(swap);
	}

	/** Drop a photo from both lists, after a delete. */
	removePhoto(id: string) {
		const keep = (p: PhotoMetadata) => p.id !== id;
		this.photos = this.photos.filter(keep);
		this.streamPhotos = this.streamPhotos.filter(keep);
		this.streamIds.delete(id);
	}

	/**
	 * Mark a photo's rendered files as changed after an edit. Consumers append the returned
	 * version to the image URL so the browser refetches instead of showing the stale cache.
	 */
	bumpVersion(id: string) {
		this.versions.set(id, (this.versions.get(id) ?? 0) + 1);
	}

	/** The cache-bust version for a photo, or 0 if it hasn't been edited this session. */
	version(id: string) {
		return this.versions.get(id) ?? 0;
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
