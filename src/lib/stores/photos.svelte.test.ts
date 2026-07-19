import { describe, it, expect, vi, beforeEach } from 'vitest';
import { photosService, albumsService } from '$lib/api/services';
import { PhotoState } from './photos.svelte';
import type { PhotoMetadata, PhotoList } from '$lib/api/types';

vi.mock('$lib/api/services', () => ({
	photosService: { getPhotos: vi.fn(), setPhotoAlbums: vi.fn() },
	albumsService: { getAlbumPhotos: vi.fn(), addAlbumPhotos: vi.fn(), deleteAlbumPhotos: vi.fn() }
}));

function photo(id: string): PhotoMetadata {
	return { id, title: `Photo ${id}`, fileName: `${id}.jpg` } as PhotoMetadata;
}

const list = (...ids: string[]): PhotoList => ({
	length: ids.length,
	photos: ids.map(photo)
});

const ALBUM = 'stream-album';

/** A promise plus its resolver, for controlling in-flight ordering. */
function deferred<T>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

beforeEach(() => {
	vi.mocked(photosService.getPhotos)
		.mockReset()
		.mockResolvedValue(list('a', 'b', 'c'));
	vi.mocked(albumsService.getAlbumPhotos).mockReset().mockResolvedValue(list('a'));
	vi.mocked(albumsService.addAlbumPhotos).mockReset().mockResolvedValue({ numItems: 1 });
	vi.mocked(albumsService.deleteAlbumPhotos).mockReset().mockResolvedValue({ numItems: 1 });
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('PhotoState.load', () => {
	it('starts empty and loading', () => {
		const s = new PhotoState();
		expect(s.photos).toEqual([]);
		expect(s.loading).toBe(true);
		expect(s.error).toBeNull();
	});

	it('shows the owner every photo', async () => {
		const s = new PhotoState();
		await s.load(true, ALBUM);

		expect(s.photos.map((p) => p.id)).toEqual(['a', 'b', 'c']);
		expect(s.isOwnerView).toBe(true);
		expect(s.loading).toBe(false);
	});

	it('shows a guest only the photostream', async () => {
		const s = new PhotoState();
		await s.load(false, ALBUM);

		expect(s.photos.map((p) => p.id)).toEqual(['a']);
		expect(s.isOwnerView).toBe(false);
		expect(photosService.getPhotos).not.toHaveBeenCalled();
	});

	it('populates streamIds for membership tests', async () => {
		const s = new PhotoState();
		await s.load(true, ALBUM);

		expect(s.streamIds.has('a')).toBe(true);
		expect(s.streamIds.has('b')).toBe(false);
	});

	it('fetches both lists once, concurrently', async () => {
		// The React home fetched the stream, painted, then fetched everything and painted
		// again. One round, both results kept.
		const s = new PhotoState();
		await s.load(true, ALBUM);

		expect(photosService.getPhotos).toHaveBeenCalledTimes(1);
		expect(albumsService.getAlbumPhotos).toHaveBeenCalledTimes(1);
		expect(albumsService.getAlbumPhotos).toHaveBeenCalledWith(ALBUM);
	});

	it('skips the album fetch when no photostream is configured', async () => {
		const s = new PhotoState();
		await s.load(true, '');

		expect(albumsService.getAlbumPhotos).not.toHaveBeenCalled();
		expect(s.streamPhotos).toEqual([]);
		expect(s.photos.map((p) => p.id)).toEqual(['a', 'b', 'c']);
	});

	it('leaves a guest with nothing when no photostream is configured', async () => {
		const s = new PhotoState();
		await s.load(false, '');

		expect(s.photos).toEqual([]);
	});

	describe('deduping', () => {
		it('ignores a repeat load for the same viewer and album', async () => {
			const s = new PhotoState();
			await s.load(true, ALBUM);
			await s.load(true, ALBUM);

			expect(photosService.getPhotos).toHaveBeenCalledTimes(1);
		});

		it('reloads when forced', async () => {
			const s = new PhotoState();
			await s.load(true, ALBUM);
			await s.load(true, ALBUM, true);

			expect(photosService.getPhotos).toHaveBeenCalledTimes(2);
		});

		it('reloads when the viewer changes', async () => {
			const s = new PhotoState();
			await s.load(false, ALBUM);
			await s.load(true, ALBUM);

			expect(photosService.getPhotos).toHaveBeenCalledTimes(1);
			expect(albumsService.getAlbumPhotos).toHaveBeenCalledTimes(2);
		});

		it('reloads when the photostream album changes', async () => {
			const s = new PhotoState();
			await s.load(true, ALBUM);
			await s.load(true, 'other-album');

			expect(albumsService.getAlbumPhotos).toHaveBeenLastCalledWith('other-album');
		});
	});

	describe('stale responses', () => {
		it('discards an earlier load that resolves last', async () => {
			// No React fetch in the app guarded against this: change the configured album
			// (or log in) and a slow earlier response could land after a newer one.
			const first = deferred<PhotoList>();
			const second = deferred<PhotoList>();
			vi.mocked(albumsService.getAlbumPhotos)
				.mockReturnValueOnce(first.promise)
				.mockReturnValueOnce(second.promise);

			const s = new PhotoState();
			const a = s.load(false, 'album-1');
			const b = s.load(false, 'album-2');

			second.resolve(list('new'));
			await b;
			first.resolve(list('old'));
			await a;

			expect(s.photos.map((p) => p.id)).toEqual(['new']);
			expect(s.loading).toBe(false);
		});
	});

	describe('failure', () => {
		it('records the error instead of throwing', async () => {
			vi.mocked(photosService.getPhotos).mockRejectedValue(new Error('boom'));
			const s = new PhotoState();

			await expect(s.load(true, ALBUM)).resolves.toBeUndefined();

			expect(s.error).toBe('Failed to fetch photos');
			expect(s.loading).toBe(false);
		});

		it('lets a retry through rather than deduping it away', async () => {
			vi.mocked(photosService.getPhotos).mockRejectedValueOnce(new Error('boom'));
			const s = new PhotoState();
			await s.load(true, ALBUM);

			await s.load(true, ALBUM);

			expect(photosService.getPhotos).toHaveBeenCalledTimes(2);
			expect(s.error).toBeNull();
			expect(s.photos.map((p) => p.id)).toEqual(['a', 'b', 'c']);
		});
	});
});

describe('PhotoState.setInStream', () => {
	it('adds one photo without touching its other albums', async () => {
		// The React version read every album the photo belonged to, recomputed the list and
		// wrote it all back — clobbering any membership changed in the meantime.
		const s = new PhotoState();
		await s.load(true, ALBUM);

		await s.setInStream(ALBUM, photo('b'), true);

		expect(albumsService.addAlbumPhotos).toHaveBeenCalledWith(ALBUM, ['b']);
		expect(photosService.setPhotoAlbums).not.toHaveBeenCalled();
		expect(s.streamIds.has('b')).toBe(true);
		expect(s.streamPhotos.map((p) => p.id)).toEqual(['a', 'b']);
	});

	it('removes one photo without touching its other albums', async () => {
		const s = new PhotoState();
		await s.load(true, ALBUM);

		await s.setInStream(ALBUM, photo('a'), false);

		expect(albumsService.deleteAlbumPhotos).toHaveBeenCalledWith(ALBUM, ['a']);
		expect(photosService.setPhotoAlbums).not.toHaveBeenCalled();
		expect(s.streamIds.has('a')).toBe(false);
		expect(s.streamPhotos).toEqual([]);
	});

	it('throws on failure and leaves the lists alone', async () => {
		vi.mocked(albumsService.addAlbumPhotos).mockRejectedValue(new Error('nope'));
		const s = new PhotoState();
		await s.load(true, ALBUM);

		await expect(s.setInStream(ALBUM, photo('b'), true)).rejects.toThrow('nope');

		expect(s.streamIds.has('b')).toBe(false);
		expect(s.streamPhotos.map((p) => p.id)).toEqual(['a']);
	});
});

describe('PhotoState mutations', () => {
	it('updatePhoto replaces the photo in both lists', async () => {
		const s = new PhotoState();
		await s.load(true, ALBUM);

		s.updatePhoto({ ...photo('a'), title: 'Renamed' });

		expect(s.allPhotos.find((p) => p.id === 'a')?.title).toBe('Renamed');
		expect(s.streamPhotos.find((p) => p.id === 'a')?.title).toBe('Renamed');
	});

	it('removePhoto drops it from both lists and from streamIds', async () => {
		const s = new PhotoState();
		await s.load(true, ALBUM);

		s.removePhoto('a');

		expect(s.allPhotos.map((p) => p.id)).toEqual(['b', 'c']);
		expect(s.streamPhotos).toEqual([]);
		expect(s.streamIds.has('a')).toBe(false);
	});
});

describe('PhotoState.bumpVersion', () => {
	it('starts at version 0', () => {
		expect(new PhotoState().version('a')).toBe(0);
	});

	it('increments per photo, independently', () => {
		const s = new PhotoState();
		s.bumpVersion('a');
		expect(s.version('a')).toBe(1);
		expect(s.version('b')).toBe(0);

		s.bumpVersion('a');
		expect(s.version('a')).toBe(2);
	});
});
