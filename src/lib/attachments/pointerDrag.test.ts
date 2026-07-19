import { describe, it, expect, vi, afterEach } from 'vitest';
import { pointerDrag } from './pointerDrag';

function attach(handlers: Parameters<typeof pointerDrag>[0]) {
	const node = document.createElement('div');
	// jsdom lacks pointer capture; stub so the handlers don't throw.
	node.setPointerCapture = vi.fn();
	node.releasePointerCapture = vi.fn();
	document.body.appendChild(node);
	const cleanup = pointerDrag(handlers)(node);
	return { node, cleanup };
}

const pointer = (node: Element, type: string, x: number, y: number) =>
	node.dispatchEvent(
		Object.assign(new Event(type, { bubbles: true }), {
			clientX: x,
			clientY: y,
			pointerId: 1
		}) as unknown as Event
	);

afterEach(() => {
	document.body.innerHTML = '';
});

describe('pointerDrag', () => {
	it('reports the total offset from the press point', () => {
		const onMove = vi.fn();
		const { node } = attach({ onMove });

		pointer(node, 'pointerdown', 100, 100);
		pointer(node, 'pointermove', 130, 90);

		expect(onMove).toHaveBeenCalledWith(30, -10);
	});

	it('fires onStart on press and onEnd on release', () => {
		const onStart = vi.fn();
		const onEnd = vi.fn();
		const { node } = attach({ onMove: vi.fn(), onStart, onEnd });

		pointer(node, 'pointerdown', 0, 0);
		expect(onStart).toHaveBeenCalledOnce();

		pointer(node, 'pointerup', 0, 0);
		expect(onEnd).toHaveBeenCalledOnce();
	});

	it('reports the press offset within the element to onStart', () => {
		// jsdom getBoundingClientRect is all-zero, so the offset equals the client point.
		const onStart = vi.fn();
		const { node } = attach({ onMove: vi.fn(), onStart });

		pointer(node, 'pointerdown', 30, 40);

		expect(onStart).toHaveBeenCalledWith(30, 40);
	});

	it('ignores moves before a press', () => {
		const onMove = vi.fn();
		const { node } = attach({ onMove });

		pointer(node, 'pointermove', 50, 50);

		expect(onMove).not.toHaveBeenCalled();
	});

	it('ignores moves after release', () => {
		const onMove = vi.fn();
		const { node } = attach({ onMove });

		pointer(node, 'pointerdown', 0, 0);
		pointer(node, 'pointerup', 0, 0);
		pointer(node, 'pointermove', 40, 40);

		expect(onMove).not.toHaveBeenCalled();
	});

	it('captures the pointer on press', () => {
		const { node } = attach({ onMove: vi.fn() });

		pointer(node, 'pointerdown', 0, 0);

		expect(node.setPointerCapture).toHaveBeenCalledWith(1);
	});

	it('stops listening after cleanup', () => {
		const onMove = vi.fn();
		const { node, cleanup } = attach({ onMove });

		cleanup?.();
		pointer(node, 'pointerdown', 0, 0);
		pointer(node, 'pointermove', 20, 20);

		expect(onMove).not.toHaveBeenCalled();
	});
});
