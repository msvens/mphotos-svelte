import type { Album } from '$lib/api/types';

/** The path to an album, carrying its share code when the album is hidden. */
export function albumSharePath(album: Album): string {
	return album.code
		? `/album/${album.id}?code=${encodeURIComponent(album.code)}`
		: `/album/${album.id}`;
}

/** The full, shareable URL to an album (absolute in the browser). */
export function albumShareUrl(album: Album): string {
	const path = albumSharePath(album);
	return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
}

/** Copy an album's shareable link to the clipboard. */
export async function copyAlbumLink(album: Album): Promise<void> {
	await navigator.clipboard.writeText(albumShareUrl(album));
}
