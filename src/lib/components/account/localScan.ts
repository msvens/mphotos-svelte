import { createMD5 } from 'hash-wasm';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/tiff', 'image/bmp'];
// The server sniffs the container (mp4/mov/avi) and transcodes to H.264 MP4.
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

/**
 * Whether a picked file is worth hashing and uploading. Browsers derive `file.type` from the
 * extension; the server re-checks the real format by content, so this only avoids wasted work.
 * It matters most for folder picks, where browsers ignore the input's `accept`.
 */
export function isSupported(file: File, videoEnabled: boolean): boolean {
	// Dotfiles include macOS `._IMG_0001.JPG` metadata twins, typed image/jpeg by their extension.
	if (file.name.startsWith('.')) return false;
	return IMAGE_TYPES.includes(file.type) || (videoEnabled && VIDEO_TYPES.includes(file.type));
}

/**
 * MD5 of the file's raw bytes as lowercase hex — what the server stores and `/local/check` matches.
 * Read in chunks so a large video is never in memory at once; `onBytes` gets each chunk's size.
 */
export async function md5File(
	file: File,
	onBytes?: (n: number) => void,
	chunkSize = 4 * 1024 * 1024
): Promise<string> {
	const hasher = await createMD5();
	hasher.init();
	for (let offset = 0; offset < file.size; offset += chunkSize) {
		const chunk = new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer());
		hasher.update(chunk);
		onBytes?.(chunk.byteLength);
	}
	return hasher.digest();
}
