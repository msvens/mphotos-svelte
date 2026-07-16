import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { albumsService, userService } from '$lib/api/services';
import { AppState, defaultUXConfig } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import { PhotoOrder, type Album, type UXConfig, type User } from '$lib/api/types';
import UxConfig from './UxConfig.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn(), updateUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: { getAlbums: vi.fn() }
}));

const mockUser: User = { name: 'Martin', bio: '', pic: '' };

const albums: Album[] = [
	{ id: 'a1', name: 'Summer', description: '', coverPic: '', code: '', orderBy: PhotoOrder.None },
	{ id: 'a2', name: 'Winter', description: '', coverPic: '', code: '', orderBy: PhotoOrder.None }
];

/** An AppState populated as it would be behind the page's loading gate. */
function loggedInState(config: Partial<UXConfig> = {}): AppState {
	const s = new AppState();
	s.uxConfig = { ...defaultUXConfig, ...config };
	s.user = mockUser;
	s.isUser = true;
	s.loading = false;
	return s;
}

const saveButton = () => screen.getByRole('button', { name: /SAVE CONFIG|SAVING/ });

beforeEach(() => {
	vi.mocked(albumsService.getAlbums).mockReset().mockResolvedValue(albums);
	vi.mocked(userService.updateUserConfig).mockReset().mockResolvedValue(mockUser);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('UxConfig', () => {
	describe('seeding from the store', () => {
		it('prefills every control from app.uxConfig', async () => {
			renderWithApp(UxConfig, {
				state: loggedInState({
					photoGridCols: 5,
					photoGridSpacing: 10,
					showBio: true,
					denseTopBar: true,
					denseBottomBar: false,
					photoBorders: 'all',
					colorTheme: 'light'
				})
			});

			expect(screen.getByLabelText('Grid Columns')).toHaveValue(5);
			expect(screen.getByRole('combobox', { name: /Grid Spacing/ })).toHaveTextContent('Normal');
			expect(screen.getByLabelText('Show Bio')).toBeChecked();
			expect(screen.getByLabelText('Dense Topbar')).toBeChecked();
			expect(screen.getByLabelText('Dense Bottombar')).not.toBeChecked();
			expect(screen.getByRole('radiogroup', { name: 'Photo Borders' })).toBeInTheDocument();
			expect(screen.getByLabelText('All')).toBeChecked();
		});

		it('shows "None" for a default config rather than the placeholder', async () => {
			// Regression guard: the default used to be 1, which matches no option, so the
			// control rendered "Select..." and looked unset.
			renderWithApp(UxConfig, { state: loggedInState() });

			expect(screen.getByRole('combobox', { name: /Grid Spacing/ })).toHaveTextContent('None');
		});

		it('populates the photostream album list', async () => {
			renderWithApp(UxConfig, { state: loggedInState({ photoStreamAlbumId: 'a2' }) });

			expect(await screen.findByRole('combobox', { name: /Photostream Album/ })).toHaveTextContent(
				'Winter'
			);
		});

		it('survives a failed album fetch', async () => {
			vi.mocked(albumsService.getAlbums).mockRejectedValue(new Error('boom'));
			renderWithApp(UxConfig, { state: loggedInState() });

			expect(await screen.findByRole('combobox', { name: /Photostream Album/ })).toHaveTextContent(
				'Select an album...'
			);
			expect(saveButton()).toBeEnabled();
		});
	});

	describe('saving', () => {
		it('sends every field, including the two with no control', async () => {
			const state = loggedInState({ photoItemsLoad: 42, windowFullScreen: true });
			renderWithApp(UxConfig, { state });

			await fireEvent.click(screen.getByText('Dense Topbar'));
			await fireEvent.click(saveButton());

			await vi.waitFor(() => expect(userService.updateUserConfig).toHaveBeenCalled());
			expect(userService.updateUserConfig).toHaveBeenCalledWith({
				...defaultUXConfig,
				photoItemsLoad: 42,
				windowFullScreen: true,
				denseTopBar: true
			});
		});

		it('toasts on success', async () => {
			const { toast } = renderWithApp(UxConfig, { state: loggedInState() });

			await fireEvent.click(saveButton());

			await vi.waitFor(() => expect(toast.toasts).toHaveLength(1));
			expect(toast.toasts[0]).toMatchObject({
				severity: 'success',
				message: 'Configuration saved successfully'
			});
		});

		it('toasts on failure', async () => {
			vi.mocked(userService.updateUserConfig).mockRejectedValue(new Error('nope'));
			const { toast } = renderWithApp(UxConfig, { state: loggedInState() });

			await fireEvent.click(saveButton());

			await vi.waitFor(() => expect(toast.toasts).toHaveLength(1));
			expect(toast.toasts[0]).toMatchObject({
				severity: 'error',
				message: 'Failed to save configuration'
			});
		});

		it('disables the button and shows progress while in flight', async () => {
			let resolve!: (v: User) => void;
			vi.mocked(userService.updateUserConfig).mockReturnValue(
				new Promise<User>((r) => (resolve = r))
			);
			renderWithApp(UxConfig, { state: loggedInState() });

			await fireEvent.click(saveButton());

			const pending = await screen.findByRole('button', { name: 'SAVING...' });
			expect(pending).toBeDisabled();

			resolve(mockUser);
			await vi.waitFor(() => expect(saveButton()).toBeEnabled());
		});
	});

	describe('grid columns', () => {
		it('clamps an over-large value on save', async () => {
			const state = loggedInState({ photoGridCols: 3 });
			renderWithApp(UxConfig, { state });

			await fireEvent.input(screen.getByLabelText('Grid Columns'), { target: { value: '999' } });
			await fireEvent.click(saveButton());

			await vi.waitFor(() => expect(userService.updateUserConfig).toHaveBeenCalled());
			expect(userService.updateUserConfig).toHaveBeenCalledWith(
				expect.objectContaining({ photoGridCols: 12 })
			);
		});

		it('falls back to the default when cleared', async () => {
			renderWithApp(UxConfig, { state: loggedInState({ photoGridCols: 5 }) });

			await fireEvent.input(screen.getByLabelText('Grid Columns'), { target: { value: '' } });
			await fireEvent.click(saveButton());

			await vi.waitFor(() => expect(userService.updateUserConfig).toHaveBeenCalled());
			expect(userService.updateUserConfig).toHaveBeenCalledWith(
				expect.objectContaining({ photoGridCols: defaultUXConfig.photoGridCols })
			);
		});

		it('clamps a zero or negative value up to the minimum', async () => {
			renderWithApp(UxConfig, { state: loggedInState() });

			await fireEvent.input(screen.getByLabelText('Grid Columns'), { target: { value: '-4' } });
			await fireEvent.click(saveButton());

			await vi.waitFor(() => expect(userService.updateUserConfig).toHaveBeenCalled());
			expect(userService.updateUserConfig).toHaveBeenCalledWith(
				expect.objectContaining({ photoGridCols: 1 })
			);
		});

		it('lets the field be emptied while typing', async () => {
			// The React original coerced empty to 1 on every keystroke, so the field could
			// never be cleared.
			renderWithApp(UxConfig, { state: loggedInState({ photoGridCols: 5 }) });
			const input = screen.getByLabelText('Grid Columns');

			await fireEvent.input(input, { target: { value: '' } });

			expect(input).toHaveValue(null);
		});

		it('constrains the input natively', () => {
			renderWithApp(UxConfig, { state: loggedInState() });

			const input = screen.getByLabelText('Grid Columns');
			expect(input).toHaveAttribute('type', 'number');
			expect(input).toHaveAttribute('min', '1');
			expect(input).toHaveAttribute('max', '12');
		});
	});

	it('re-seeds the form from the store after a save', async () => {
		// The $derived contract: local edits override, and adopting a new uxConfig drops
		// the override. Typing 999 and saving must leave the field showing the clamped 12.
		const state = loggedInState({ photoGridCols: 3 });
		renderWithApp(UxConfig, { state });

		await fireEvent.input(screen.getByLabelText('Grid Columns'), { target: { value: '999' } });
		expect(screen.getByLabelText('Grid Columns')).toHaveValue(999);

		await fireEvent.click(saveButton());

		await vi.waitFor(() => expect(screen.getByLabelText('Grid Columns')).toHaveValue(12));
		expect(state.uxConfig.photoGridCols).toBe(12);
	});
});
