import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { photosService } from '$lib/api/services';
import { renderWithApp } from '$lib/test-utils';
import type { PhotoList } from '$lib/api/types';
import Maintenance from './Maintenance.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	photosService: { getPhotos: vi.fn(), deletePhotos: vi.fn() }
}));

/** PhotoList carries its own `length` field — it is not an array. */
function photoList(length: number): PhotoList {
	return { length, photos: [] };
}

beforeEach(() => {
	vi.mocked(photosService.getPhotos).mockReset().mockResolvedValue(photoList(3));
	vi.mocked(photosService.deletePhotos).mockReset().mockResolvedValue(photoList(3));
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

async function openDialog() {
	await vi.waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
	await fireEvent.click(screen.getByRole('button', { name: 'DELETE ALL PHOTOS' }));
}

describe('Maintenance', () => {
	it('shows the photo count fetched on mount', async () => {
		renderWithApp(Maintenance);

		expect(await screen.findByText('3')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'DELETE ALL PHOTOS' })).toBeEnabled();
	});

	it('disables the delete button when there are no photos', async () => {
		vi.mocked(photosService.getPhotos).mockResolvedValue(photoList(0));
		renderWithApp(Maintenance);

		await vi.waitFor(() =>
			expect(screen.getByRole('button', { name: 'DELETE ALL PHOTOS' })).toBeDisabled()
		);
	});

	it('survives a failed count fetch', async () => {
		vi.mocked(photosService.getPhotos).mockRejectedValue(new Error('boom'));
		renderWithApp(Maintenance);

		await vi.waitFor(() =>
			expect(screen.getByRole('button', { name: 'DELETE ALL PHOTOS' })).toBeDisabled()
		);
	});

	it('offers exactly one CANCEL in the confirmation dialog', async () => {
		renderWithApp(Maintenance);
		await openDialog();

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: 'CANCEL' })).toHaveLength(1);
	});

	it('cancelling closes the dialog without deleting', async () => {
		renderWithApp(Maintenance);
		await openDialog();

		await fireEvent.click(screen.getByRole('button', { name: 'CANCEL' }));

		expect(screen.queryByRole('dialog')).toBeNull();
		expect(photosService.deletePhotos).not.toHaveBeenCalled();
	});

	it('confirming deletes, toasts, zeroes the count and closes', async () => {
		const { toast } = renderWithApp(Maintenance);
		await openDialog();

		await fireEvent.click(screen.getByRole('button', { name: 'DELETE ALL' }));

		await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(photosService.deletePhotos).toHaveBeenCalledWith(true);
		expect(toast.toasts[0]).toMatchObject({
			severity: 'success',
			message: 'Successfully deleted 3 photos'
		});
		expect(screen.getByRole('button', { name: 'DELETE ALL PHOTOS' })).toBeDisabled();
	});

	it('keeps the dialog open and toasts on a failed delete', async () => {
		vi.mocked(photosService.deletePhotos).mockRejectedValue(new Error('nope'));
		const { toast } = renderWithApp(Maintenance);
		await openDialog();

		await fireEvent.click(screen.getByRole('button', { name: 'DELETE ALL' }));

		await vi.waitFor(() => expect(toast.toasts).toHaveLength(1));
		expect(toast.toasts[0]).toMatchObject({
			severity: 'error',
			message: 'Failed to delete photos'
		});
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('shows a pending label and disables both buttons while deleting', async () => {
		let resolve!: (v: PhotoList) => void;
		vi.mocked(photosService.deletePhotos).mockReturnValue(
			new Promise<PhotoList>((r) => (resolve = r))
		);
		renderWithApp(Maintenance);
		await openDialog();

		await fireEvent.click(screen.getByRole('button', { name: 'DELETE ALL' }));

		const pending = await screen.findByRole('button', { name: 'DELETING...' });
		expect(pending).toBeDisabled();
		expect(screen.getByRole('button', { name: 'CANCEL' })).toBeDisabled();

		resolve(photoList(3));
	});
});
