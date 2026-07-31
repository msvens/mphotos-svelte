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
		updateGuest: vi.fn()
	},
	albumsService: { getAlbumPhotos: vi.fn() },
	photosService: { getPhotos: vi.fn() }
}));

const guest = (over: Partial<Guest> = {}): Guest => ({
	name: 'Ada',
	email: 'ada@example.com',
	fullName: '',
	description: '',
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
});
