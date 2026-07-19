import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import { photosService } from '$lib/api/services';
import type { EditPhotoParams } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { PhotoState } from '$lib/stores/photos.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { PhotoMetadata } from '$lib/api/types';
import CropPage from './CropPage.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	photosService: {
		editPhoto: vi.fn(),
		getPhotoUrl: (id: string) => `/api/images/${id}.jpg`,
		getEditPreviewUrl: vi.fn(() => 'http://localhost/api/photos/p1/edit/preview?rotation=90')
	}
}));

function makePhoto(): PhotoMetadata {
	return {
		id: 'p1',
		title: 'Sunrise',
		fileName: 'p1.jpg',
		width: 4000,
		height: 3000
	} as PhotoMetadata;
}

const photo = makePhoto();

function render() {
	const state = new AppState();
	state.loading = false;
	const photos = new PhotoState();
	return renderWithApp(CropPage, { state, photos, props: { photo, backUrl: '/photo/p1' } });
}

/** The last EditPhotoParams passed to editPhoto. */
const lastEditParams = () =>
	vi.mocked(photosService.editPhoto).mock.calls.at(-1)?.[1] as EditPhotoParams;

beforeEach(() => {
	vi.mocked(goto).mockReset();
	vi.mocked(photosService.editPhoto).mockReset().mockResolvedValue(photo);
	vi.mocked(photosService.getEditPreviewUrl).mockClear();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('CropPage', () => {
	it('shows the image and the toolbar', () => {
		render();
		expect(screen.getByAltText('Sunrise')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Rotate 90°' })).toBeInTheDocument();
	});

	describe('rotation', () => {
		it('accumulates rotation and sends it on save', async () => {
			render();

			await fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }));
			await fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }));
			await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

			await vi.waitFor(() => expect(photosService.editPhoto).toHaveBeenCalled());
			expect(lastEditParams().rotation).toBe(180);
		});

		it('sends the full (natural) image when there is no crop', async () => {
			render();

			await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

			await vi.waitFor(() => expect(photosService.editPhoto).toHaveBeenCalled());
			expect(lastEditParams()).toEqual({ rotation: 0, x: 0, y: 0, width: 4000, height: 3000 });
		});
	});

	describe('saving', () => {
		it('edits, toasts, bumps the cache version, and navigates back', async () => {
			const { toast, photos } = render();
			const bump = vi.spyOn(photos, 'bumpVersion');

			await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

			await vi.waitFor(() =>
				expect(photosService.editPhoto).toHaveBeenCalledWith('p1', expect.anything())
			);
			expect(bump).toHaveBeenCalledWith('p1');
			await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/photo/p1'));
			expect(toast.toasts[0]?.severity).toBe('success');
		});

		it('toasts and stays on failure', async () => {
			vi.mocked(photosService.editPhoto).mockRejectedValue(new Error('boom'));
			const { toast } = render();

			await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

			await vi.waitFor(() => expect(toast.toasts.some((t) => t.severity === 'error')).toBe(true));
			expect(goto).not.toHaveBeenCalled();
		});
	});

	describe('preview', () => {
		it('builds a preview URL and shows it, then closes back to the editor', async () => {
			render();

			await fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }));
			await fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

			expect(photosService.getEditPreviewUrl).toHaveBeenCalledWith(
				'p1',
				expect.objectContaining({ rotation: 90 })
			);
			expect(screen.getByAltText('Preview')).toBeInTheDocument();

			await fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
			expect(screen.queryByAltText('Preview')).toBeNull();
			expect(screen.getByAltText('Sunrise')).toBeInTheDocument();
		});
	});

	describe('close & restore', () => {
		it('close navigates back without saving', async () => {
			render();

			await fireEvent.click(screen.getByRole('button', { name: 'Close' }));

			expect(goto).toHaveBeenCalledWith('/photo/p1');
			expect(photosService.editPhoto).not.toHaveBeenCalled();
		});

		it('restore clears rotation', async () => {
			render();
			await fireEvent.click(screen.getByRole('button', { name: 'Rotate 90°' }));

			await fireEvent.click(screen.getByRole('button', { name: 'Restore original' }));
			await fireEvent.click(screen.getByRole('button', { name: 'Save' }));

			await vi.waitFor(() => expect(photosService.editPhoto).toHaveBeenCalled());
			expect(lastEditParams().rotation).toBe(0);
		});
	});
});
