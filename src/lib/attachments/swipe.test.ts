import { describe, it, expect, vi, afterEach } from 'vitest';
import { swipe } from './swipe';

/** Attachments are plain functions — no component needed. */
function attach() {
	const node = document.createElement('div');
	document.body.appendChild(node);
	const onPrevious = vi.fn();
	const onNext = vi.fn();
	const cleanup = swipe({ onPrevious, onNext })(node);
	return { node, onPrevious, onNext, cleanup };
}

const touch = (node: Element, type: string, points: { clientX: number; clientY: number }[]) =>
	node.dispatchEvent(
		Object.assign(new Event(type, { bubbles: true }), { touches: points }) as unknown as Event
	);

/** Drag from (x0,y0) to (x1,y1) in one move. */
function drag(node: Element, x0: number, y0: number, x1: number, y1: number) {
	touch(node, 'touchstart', [{ clientX: x0, clientY: y0 }]);
	touch(node, 'touchmove', [{ clientX: x1, clientY: y1 }]);
	touch(node, 'touchend', []);
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('swipe', () => {
	it('pages forward when dragging left', () => {
		const { node, onNext, onPrevious } = attach();

		drag(node, 200, 100, 100, 100); // 100px left

		expect(onNext).toHaveBeenCalledOnce();
		expect(onPrevious).not.toHaveBeenCalled();
	});

	it('pages back when dragging right', () => {
		const { node, onNext, onPrevious } = attach();

		drag(node, 100, 100, 200, 100); // 100px right

		expect(onPrevious).toHaveBeenCalledOnce();
		expect(onNext).not.toHaveBeenCalled();
	});

	it('ignores a drag shorter than the threshold', () => {
		const { node, onNext, onPrevious } = attach();

		drag(node, 200, 100, 175, 100); // 25px — under 30

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrevious).not.toHaveBeenCalled();
	});

	it('fires just past the threshold', () => {
		const { node, onNext } = attach();

		drag(node, 200, 100, 169, 100); // 31px

		expect(onNext).toHaveBeenCalledOnce();
	});

	it('ignores a mostly-vertical drag', () => {
		// A page scroll must never page the deck.
		const { node, onNext, onPrevious } = attach();

		drag(node, 200, 100, 160, 160); // 40px across, 60px down

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrevious).not.toHaveBeenCalled();
	});

	it('allows a little vertical drift', () => {
		const { node, onNext } = attach();

		drag(node, 200, 100, 100, 120); // 100px across, 20px down

		expect(onNext).toHaveBeenCalledOnce();
	});

	it('ignores multi-touch', () => {
		const { node, onNext, onPrevious } = attach();

		touch(node, 'touchstart', [
			{ clientX: 200, clientY: 100 },
			{ clientX: 250, clientY: 100 }
		]);
		touch(node, 'touchmove', [
			{ clientX: 100, clientY: 100 },
			{ clientX: 150, clientY: 100 }
		]);
		touch(node, 'touchend', []);

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrevious).not.toHaveBeenCalled();
	});

	it('ignores a touchend with no touchstart', () => {
		const { node, onNext, onPrevious } = attach();

		touch(node, 'touchend', []);

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrevious).not.toHaveBeenCalled();
	});

	it('does not carry state between gestures', () => {
		const { node, onNext } = attach();

		drag(node, 200, 100, 100, 100);
		touch(node, 'touchend', []); // a stray end must not re-fire

		expect(onNext).toHaveBeenCalledOnce();
	});

	it('stops listening after cleanup', () => {
		const { node, onNext, cleanup } = attach();

		cleanup?.();
		drag(node, 200, 100, 100, 100);

		expect(onNext).not.toHaveBeenCalled();
	});
});
