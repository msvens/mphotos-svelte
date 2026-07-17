import { MediaQuery } from 'svelte/reactivity';

/** Tailwind's `sm` breakpoint — below this we serve mobile-cropped image variants. */
const MOBILE = '(max-width: 639.98px)';

/**
 * Reactive viewport flags for the photo deck's layout.
 *
 * `matchMedia` answers synchronously, so the very first render already knows whether it's
 * on a phone — the React version assumed desktop and corrected in an effect, which made
 * every phone fetch the full-size image before swapping to the crop.
 *
 * Created per component rather than once per module: `MediaQuery` calls `window.matchMedia`
 * in its constructor, so a module-level instance would run at import time and would pin one
 * MediaQueryList for a whole test run. Two calls per mount cost nothing.
 */
export function createViewport() {
	const mobile = new MediaQuery(MOBILE);
	// `(orientation: portrait)` is height >= width; the React version used height > width.
	// They differ only on an exactly square viewport, and this matches the original app.
	const portrait = new MediaQuery('(orientation: portrait)');

	return {
		get isMobile() {
			return mobile.current;
		},
		get isPortrait() {
			return portrait.current;
		}
	};
}
