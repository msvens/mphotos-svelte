import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhotoOrder, type Album } from '$lib/api/types';
import { albumSharePath, albumShareUrl, copyAlbumLink } from './albumShare';

const album = (over: Partial<Album> = {}): Album => ({
	id: 'a1',
	name: 'Trip',
	description: '',
	coverPic: '',
	code: '',
	orderBy: PhotoOrder.None,
	...over
});

const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

beforeEach(() => writeText.mockClear());

describe('albumShare', () => {
	it('builds a plain path for a public album', () => {
		expect(albumSharePath(album())).toBe('/album/a1');
	});

	it('carries the code (url-encoded) for a hidden album', () => {
		expect(albumSharePath(album({ code: 'se cret' }))).toBe('/album/a1?code=se%20cret');
	});

	it('makes an absolute url from the current origin', () => {
		expect(albumShareUrl(album())).toBe(`${window.location.origin}/album/a1`);
	});

	it('copies the link to the clipboard', async () => {
		await copyAlbumLink(album({ code: 'x1' }));
		expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/album/a1?code=x1`);
	});
});
