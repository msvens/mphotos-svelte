/**
 * Convert a camera model name to a URL-friendly id.
 *
 * `"LEICA Q2"` → `"leica-q2"`. Only whitespace is handled, so punctuation survives:
 * `"ILCE-7M3 (v2)"` → `"ilce-7m3-(v2)"`.
 */
export function modelToId(model: string): string {
	return model.toLowerCase().replace(/\s+/g, '-');
}
