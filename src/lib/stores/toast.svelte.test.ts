import { describe, it, expect } from 'vitest';
import { ToastState } from './toast.svelte';

describe('ToastState', () => {
	it('starts empty', () => {
		expect(new ToastState().toasts).toEqual([]);
	});

	it('defaults to info severity and a 6000ms auto-hide', () => {
		const toast = new ToastState();
		toast.showToast('hello');

		expect(toast.toasts).toHaveLength(1);
		expect(toast.toasts[0]).toMatchObject({
			message: 'hello',
			severity: 'info',
			autoHideDuration: 6000
		});
	});

	it('honours an explicit severity and duration', () => {
		const toast = new ToastState();
		toast.showToast('boom', 'error', 1000);

		expect(toast.toasts[0]).toMatchObject({ severity: 'error', autoHideDuration: 1000 });
	});

	it.each([
		['success', (t: ToastState) => t.success('m')],
		['error', (t: ToastState) => t.error('m')],
		['warning', (t: ToastState) => t.warning('m')],
		['info', (t: ToastState) => t.info('m')]
	])('%s() sets that severity', (severity, call) => {
		const toast = new ToastState();
		call(toast);

		expect(toast.toasts[0].severity).toBe(severity);
	});

	it('falls back to the default duration when a sugar method omits it', () => {
		const toast = new ToastState();
		toast.success('m');

		expect(toast.toasts[0].autoHideDuration).toBe(6000);
	});

	it('passes a sugar method duration through', () => {
		const toast = new ToastState();
		toast.error('m', 500);

		expect(toast.toasts[0].autoHideDuration).toBe(500);
	});

	it('gives each toast a unique id and returns it', () => {
		const toast = new ToastState();
		const first = toast.showToast('a');
		const second = toast.showToast('b');

		expect(first).not.toBe(second);
		expect(toast.toasts.map((t) => t.id)).toEqual([first, second]);
	});

	it('keeps toasts in the order they were queued', () => {
		const toast = new ToastState();
		toast.info('first');
		toast.info('second');
		toast.info('third');

		expect(toast.toasts.map((t) => t.message)).toEqual(['first', 'second', 'third']);
	});

	it('remove() drops only the matching toast', () => {
		const toast = new ToastState();
		toast.info('keep me');
		const id = toast.showToast('drop me');
		toast.info('keep me too');

		toast.remove(id);

		expect(toast.toasts.map((t) => t.message)).toEqual(['keep me', 'keep me too']);
	});

	it('remove() ignores an unknown id', () => {
		const toast = new ToastState();
		toast.info('m');

		toast.remove('nope');

		expect(toast.toasts).toHaveLength(1);
	});
});
