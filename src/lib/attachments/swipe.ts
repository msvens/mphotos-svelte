import type { Attachment } from 'svelte/attachments';

/** Minimum horizontal travel for a swipe to count. */
const X_THRESHOLD = 30;
/** Maximum vertical travel before it's a scroll, not a swipe. */
const Y_THRESHOLD = 40;

interface SwipeOptions {
	onPrevious: () => void;
	onNext: () => void;
}

/**
 * Horizontal swipe on touch devices.
 *
 * An attachment rather than `ontouchstart` etc. on the element: touch handlers on a
 * non-interactive div trip `a11y_no_static_element_interactions`, and the element really
 * isn't interactive — every control inside it is already a real button.
 *
 * ```svelte
 * <div {@attach swipe({ onPrevious: goPrevious, onNext: goNext })}>…</div>
 * ```
 */
export function swipe({ onPrevious, onNext }: SwipeOptions): Attachment<HTMLElement> {
	return (node) => {
		let xStart = -1;
		let xPos = -1;
		let yStart = -1;
		let yPos = -1;

		const start = (event: TouchEvent) => {
			if (event.touches.length > 1) return; // a pinch, not a swipe
			xStart = xPos = event.touches[0].clientX;
			yStart = yPos = event.touches[0].clientY;
		};

		const move = (event: TouchEvent) => {
			if (event.touches.length > 1) return;
			xPos = event.touches[0].clientX;
			yPos = event.touches[0].clientY;
		};

		const end = () => {
			const deltaX = xStart - xPos;
			const deltaY = yStart - yPos;
			xStart = yStart = xPos = yPos = -1;
			// A touchend with no touchstart leaves both deltas at 0 — below threshold.
			if (Math.abs(deltaX) > X_THRESHOLD && Math.abs(deltaY) < Y_THRESHOLD) {
				// Dragging right (deltaX < 0) reveals the previous photo.
				if (deltaX < 0) onPrevious();
				else onNext();
			}
		};

		node.addEventListener('touchstart', start, { passive: true });
		node.addEventListener('touchmove', move, { passive: true });
		node.addEventListener('touchend', end);
		return () => {
			node.removeEventListener('touchstart', start);
			node.removeEventListener('touchmove', move);
			node.removeEventListener('touchend', end);
		};
	};
}
