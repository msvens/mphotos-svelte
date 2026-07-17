import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Toast from './Toast.svelte';
import type { ToastSeverity } from '$lib/stores/toast.svelte';

afterEach(() => {
	vi.useRealTimers();
});

describe('Toast', () => {
	it('renders the message', () => {
		render(Toast, { props: { id: 't1', message: 'Saved it', onClose: vi.fn() } });
		expect(screen.getByRole('alert')).toHaveTextContent('Saved it');
	});

	it.each([
		['success', 'bg-blue-600'],
		['error', 'bg-red-600'],
		['warning', 'bg-orange-600'],
		['info', 'bg-blue-600']
	])('styles %s with %s', (severity, bg) => {
		render(Toast, {
			props: { id: 't1', message: 'm', severity: severity as ToastSeverity, onClose: vi.fn() }
		});
		expect(screen.getByRole('alert').className).toContain(bg);
	});

	it('calls onClose with the id when the close button is clicked', () => {
		const onClose = vi.fn();
		render(Toast, { props: { id: 't7', message: 'm', onClose } });

		screen.getByRole('button', { name: 'Close' }).click();

		expect(onClose).toHaveBeenCalledWith('t7');
	});

	it('auto-dismisses after autoHideDuration', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const onClose = vi.fn();
		render(Toast, { props: { id: 't2', message: 'm', autoHideDuration: 6000, onClose } });

		expect(onClose).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(6000);

		expect(onClose).toHaveBeenCalledWith('t2');
	});

	it('does not auto-dismiss when autoHideDuration is 0', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const onClose = vi.fn();
		render(Toast, { props: { id: 't3', message: 'm', autoHideDuration: 0, onClose } });

		await vi.advanceTimersByTimeAsync(60_000);

		expect(onClose).not.toHaveBeenCalled();
	});
});
