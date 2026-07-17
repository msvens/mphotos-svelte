import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { renderWithApp } from '$lib/test-utils';
import { ToastState } from '$lib/stores/toast.svelte';
import ToastContainer from './ToastContainer.svelte';

describe('ToastContainer', () => {
	it('renders nothing when the queue is empty', () => {
		renderWithApp(ToastContainer);
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('renders a toast queued on the store', async () => {
		const toast = new ToastState();
		renderWithApp(ToastContainer, { toast });

		toast.success('Profile updated');
		await tick();

		expect(await screen.findByText('Profile updated')).toBeInTheDocument();
	});

	it('renders every queued toast, in order', async () => {
		const toast = new ToastState();
		renderWithApp(ToastContainer, { toast });

		toast.info('first');
		toast.error('second');
		await tick();

		expect(screen.getAllByRole('alert').map((el) => el.textContent?.trim())).toEqual([
			'first',
			'second'
		]);
	});

	it('closing a toast removes it from the DOM and the store', async () => {
		const toast = new ToastState();
		renderWithApp(ToastContainer, { toast });

		toast.info('dismiss me');
		await tick();

		screen.getByRole('button', { name: 'Close' }).click();
		await tick();

		expect(screen.queryByText('dismiss me')).toBeNull();
		expect(toast.toasts).toEqual([]);
	});
});
