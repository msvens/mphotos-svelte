import type { Attachment } from 'svelte/attachments';

export interface DragHandlers {
	/** Drag started; `offsetX`/`offsetY` are the press point relative to the element's top-left. */
	onStart?: (offsetX: number, offsetY: number) => void;
	/** Pointer moved; `dx`/`dy` are the total offset from where the drag began. */
	onMove: (dx: number, dy: number) => void;
	/** Drag ended. */
	onEnd?: () => void;
}

/**
 * Report drag offsets from a pointer press on the element.
 *
 * An attachment rather than `onpointerdown` etc. on the node: interaction handlers on a
 * non-interactive element trip `a11y_no_static_element_interactions`, and a crop box / handle
 * has no semantic role to satisfy it. `setPointerCapture` keeps the drag alive when the pointer
 * leaves the element, and Pointer Events cover mouse and touch in one path.
 *
 * ```svelte
 * <div {@attach pointerDrag({ onMove: (dx, dy) => … })}></div>
 * ```
 */
export function pointerDrag(handlers: DragHandlers): Attachment<HTMLElement> {
	return (node) => {
		let startX = 0;
		let startY = 0;
		let active = false;

		const down = (event: PointerEvent) => {
			event.preventDefault();
			event.stopPropagation();
			node.setPointerCapture(event.pointerId);
			startX = event.clientX;
			startY = event.clientY;
			active = true;
			const rect = node.getBoundingClientRect();
			handlers.onStart?.(event.clientX - rect.left, event.clientY - rect.top);
		};
		const move = (event: PointerEvent) => {
			if (!active) return;
			handlers.onMove(event.clientX - startX, event.clientY - startY);
		};
		const up = (event: PointerEvent) => {
			if (!active) return;
			active = false;
			try {
				node.releasePointerCapture(event.pointerId);
			} catch {
				// pointer already released
			}
			handlers.onEnd?.();
		};

		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', up);
		return () => {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
		};
	};
}
