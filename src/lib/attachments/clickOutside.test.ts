import { describe, it, expect, vi, afterEach } from 'vitest';
import { clickOutside } from './clickOutside';

/** Attachments are plain functions, so they can be exercised without a component. */
function attach(callback: () => void) {
	const node = document.createElement('div');
	const inside = document.createElement('button');
	node.appendChild(inside);
	document.body.appendChild(node);
	const cleanup = clickOutside(callback)(node);
	return { node, inside, cleanup };
}

const mousedown = (el: Element | Document) =>
	el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

afterEach(() => {
	document.body.innerHTML = '';
});

describe('clickOutside', () => {
	it('fires when a mousedown lands outside', () => {
		const callback = vi.fn();
		attach(callback);

		mousedown(document.body);

		expect(callback).toHaveBeenCalledOnce();
	});

	it('does not fire for a mousedown on the element itself', () => {
		const callback = vi.fn();
		const { node } = attach(callback);

		mousedown(node);

		expect(callback).not.toHaveBeenCalled();
	});

	it('does not fire for a mousedown on a descendant', () => {
		const callback = vi.fn();
		const { inside } = attach(callback);

		mousedown(inside);

		expect(callback).not.toHaveBeenCalled();
	});

	it('ignores clicks after cleanup', () => {
		const callback = vi.fn();
		const { cleanup } = attach(callback);

		cleanup?.();
		mousedown(document.body);

		expect(callback).not.toHaveBeenCalled();
	});

	it('listens for mousedown, not click', () => {
		const callback = vi.fn();
		attach(callback);

		document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(callback).not.toHaveBeenCalled();
	});
});
