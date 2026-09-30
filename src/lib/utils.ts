/**
 * Convert a camera model name to a URL-friendly id.
 *
 * `"LEICA Q2"` → `"leica-q2"`. Only whitespace is handled, so punctuation survives:
 * `"ILCE-7M3 (v2)"` → `"ilce-7m3-(v2)"`.
 */
export function modelToId(model: string): string {
	return model.toLowerCase().replace(/\s+/g, '-');
}

/**
 * A short, URL-safe random token — used to prefill an album's share code. Not a security
 * boundary (the code only hides an album from the public list), so `Math.random` is fine.
 */
export function randomCode(): string {
	return Math.random().toString(36).slice(2, 10);
}

/**
 * Format a video length in seconds as `m:ss`, or `h:mm:ss` from an hour up.
 * Rounds down, like a player's elapsed-time readout.
 */
export function formatDuration(seconds: number | undefined): string {
	const total = Math.max(0, Math.floor(seconds ?? 0));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, '0');
	return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
