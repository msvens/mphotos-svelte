import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { page } from '$app/state';
import { guestsService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { Guest } from '$lib/api/types';
import GuestPage from './+page.svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/guest') } }));

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: {
		isGuest: vi.fn(),
		getGuest: vi.fn(),
		verifyGuest: vi.fn(),
		logoutGuest: vi.fn(),
		registerGuest: vi.fn(),
		loginGuest: vi.fn(),
		loginVerifyGuest: vi.fn(),
		updateGuest: vi.fn(),
		uploadAvatar: vi.fn(),
		removeAvatar: vi.fn(),
		deleteOwnAccount: vi.fn(),
		getAvatarUrl: (guestId: string, size?: number) =>
			size ? `/api/guest/avatar/${guestId}/${size}` : `/api/guest/avatar/${guestId}`
	},
	albumsService: { getAlbumPhotos: vi.fn() },
	photosService: { getPhotos: vi.fn() }
}));

const guest = (over: Partial<Guest> = {}): Guest => ({
	guestId: 'g-ada',
	name: 'Ada',
	email: 'ada@example.com',
	fullName: '',
	description: '',
	avatar: '',
	verified: true,
	verifyTime: '',
	...over
});

function state(g?: Guest): AppState {
	const s = new AppState();
	s.loading = false;
	if (g) {
		s.isGuest = true;
		s.guest = g;
	}
	return s;
}

beforeEach(() => {
	page.url.searchParams.delete('code');
	vi.mocked(guestsService.isGuest).mockReset().mockResolvedValue(false);
	vi.mocked(guestsService.getGuest).mockReset();
	vi.mocked(guestsService.verifyGuest).mockReset();
	vi.mocked(guestsService.logoutGuest).mockReset().mockResolvedValue({ authenticated: false });
	vi.mocked(guestsService.uploadAvatar).mockReset().mockResolvedValue(guest());
	vi.mocked(guestsService.removeAvatar).mockReset().mockResolvedValue(guest());
	vi.mocked(guestsService.deleteOwnAccount).mockReset().mockResolvedValue({ authenticated: false });
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('guest page', () => {
	it('prompts sign-in for a visitor', () => {
		renderWithApp(GuestPage, { state: state() });
		expect(screen.getByRole('heading', { name: 'Guest access' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'SIGN IN' })).toBeInTheDocument();
	});

	it('shows the profile (name, full name, description) for a signed-in guest', () => {
		renderWithApp(GuestPage, {
			state: state(guest({ fullName: 'Ada Lovelace', description: 'maths' }))
		});
		expect(screen.getByRole('heading', { name: 'Welcome back, Ada!' })).toBeInTheDocument();
		expect(screen.getByText(/signed in as/)).toBeInTheDocument();
		expect(screen.getByText(/ada@example.com/)).toBeInTheDocument();
		expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
		expect(screen.getByText('maths')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'UPDATE PROFILE' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'LOGOUT' })).toBeInTheDocument();
	});

	it('verifies from the ?code= link and thanks the guest', async () => {
		page.url.searchParams.set('code', 'signup-token');
		vi.mocked(guestsService.verifyGuest).mockResolvedValue(guest());
		vi.mocked(guestsService.isGuest).mockResolvedValue(true);
		vi.mocked(guestsService.getGuest).mockResolvedValue(guest());

		renderWithApp(GuestPage, { state: state() });

		await vi.waitFor(() => expect(guestsService.verifyGuest).toHaveBeenCalledWith('signup-token'));
		expect(
			await screen.findByRole('heading', { name: 'Thank you for verifying, Ada!' })
		).toBeInTheDocument();
	});

	it('shows an error when the verification link is invalid', async () => {
		page.url.searchParams.set('code', 'bad');
		vi.mocked(guestsService.verifyGuest).mockRejectedValue(new Error('expired'));

		renderWithApp(GuestPage, { state: state() });

		expect(await screen.findByText(/invalid or has expired/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'SIGN IN' })).toBeInTheDocument();
	});

	it('opens the sign-in dialog', async () => {
		renderWithApp(GuestPage, { state: state() });

		await fireEvent.click(screen.getByRole('button', { name: 'SIGN IN' }));

		expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
	});

	it('logs out and returns to the sign-in prompt', async () => {
		renderWithApp(GuestPage, { state: state(guest()) });

		await fireEvent.click(screen.getByRole('button', { name: 'LOGOUT' }));

		await vi.waitFor(() => expect(guestsService.logoutGuest).toHaveBeenCalled());
		expect(await screen.findByRole('button', { name: 'SIGN IN' })).toBeInTheDocument();
	});

	describe('avatar', () => {
		it('shows the avatar and a remove button when one is set', () => {
			const { container } = renderWithApp(GuestPage, { state: state(guest({ avatar: '.jpg' })) });

			expect(container.querySelector('img')).toHaveAttribute('src', '/api/guest/avatar/g-ada/192');
			expect(screen.getByRole('button', { name: 'REMOVE' })).toBeInTheDocument();
		});

		it('offers to add a picture (no image) when there is none', () => {
			const { container } = renderWithApp(GuestPage, { state: state(guest()) });

			expect(container.querySelector('img')).toBeNull();
			expect(screen.getByRole('button', { name: 'ADD PICTURE' })).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'REMOVE' })).toBeNull();
		});

		it('uploads a chosen file and refreshes the guest', async () => {
			vi.mocked(guestsService.isGuest).mockResolvedValue(true);
			vi.mocked(guestsService.getGuest).mockResolvedValue(guest({ avatar: '.png' }));
			const { container } = renderWithApp(GuestPage, { state: state(guest()) });

			const input = container.querySelector('input[type="file"]') as HTMLInputElement;
			const file = new File(['x'], 'me.png', { type: 'image/png' });
			await fireEvent.change(input, { target: { files: [file] } });

			await vi.waitFor(() => expect(guestsService.uploadAvatar).toHaveBeenCalledWith(file));
			await vi.waitFor(() => expect(guestsService.getGuest).toHaveBeenCalled());
		});

		it('removes the avatar', async () => {
			vi.mocked(guestsService.isGuest).mockResolvedValue(true);
			vi.mocked(guestsService.getGuest).mockResolvedValue(guest());
			renderWithApp(GuestPage, { state: state(guest({ avatar: '.jpg' })) });

			await fireEvent.click(screen.getByRole('button', { name: 'REMOVE' }));

			await vi.waitFor(() => expect(guestsService.removeAvatar).toHaveBeenCalled());
		});
	});

	describe('deleting your account', () => {
		it('is not offered to a visitor who is not signed in', () => {
			renderWithApp(GuestPage, { state: state() });
			expect(screen.queryByRole('button', { name: 'DELETE MY ACCOUNT' })).toBeNull();
		});

		it('deletes the account and drops back to the signed-out view', async () => {
			const { state: app } = renderWithApp(GuestPage, { state: state(guest()) });

			await fireEvent.click(screen.getByRole('button', { name: 'DELETE MY ACCOUNT' }));
			await fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

			await vi.waitFor(() => expect(guestsService.deleteOwnAccount).toHaveBeenCalled());
			expect(app.isGuest).toBe(false);
			expect(app.guest).toBeUndefined();
			expect(await screen.findByRole('heading', { name: 'Guest access' })).toBeInTheDocument();
		});

		it('keeps the guest signed in and toasts when the delete fails', async () => {
			vi.mocked(guestsService.deleteOwnAccount).mockRejectedValue(new Error('nope'));
			const { state: app, toast } = renderWithApp(GuestPage, { state: state(guest()) });

			await fireEvent.click(screen.getByRole('button', { name: 'DELETE MY ACCOUNT' }));
			await fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

			await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('error'));
			expect(app.isGuest).toBe(true);
			expect(screen.getByRole('heading', { name: 'Welcome back, Ada!' })).toBeInTheDocument();
		});
	});
});
