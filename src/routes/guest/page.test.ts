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
		updateGuest: vi.fn()
	},
	albumsService: { getAlbumPhotos: vi.fn() },
	photosService: { getPhotos: vi.fn() }
}));

const guest = (over: Partial<Guest> = {}): Guest => ({
	name: 'Ada',
	email: 'ada@example.com',
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
	it('prompts registration for a non-guest', () => {
		renderWithApp(GuestPage, { state: state() });
		expect(screen.getByRole('heading', { name: 'Register Guest' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'REGISTER / LOGIN' })).toBeInTheDocument();
	});

	it('shows the profile for a registered guest', () => {
		renderWithApp(GuestPage, { state: state(guest()) });
		expect(screen.getByRole('heading', { name: 'Welcome back, Ada!' })).toBeInTheDocument();
		expect(screen.getByText(/registered as/)).toHaveTextContent('ada@example.com');
		expect(screen.getByRole('button', { name: 'UPDATE GUEST' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'LOGOUT GUEST' })).toBeInTheDocument();
	});

	it('nudges an unverified guest to check their email', () => {
		renderWithApp(GuestPage, { state: state(guest({ verified: false })) });
		expect(screen.getByText(/isn't verified yet/)).toBeInTheDocument();
	});

	it('does not show the unverified nudge once verified', () => {
		renderWithApp(GuestPage, { state: state(guest({ verified: true })) });
		expect(screen.queryByText(/isn't verified yet/)).toBeNull();
	});

	it('verifies from the ?code= link and thanks the guest', async () => {
		page.url.searchParams.set('code', 'guest-uuid');
		vi.mocked(guestsService.verifyGuest).mockResolvedValue(guest({ verified: true }));
		// refreshGuest (called after verify) sees the now-verified guest.
		vi.mocked(guestsService.isGuest).mockResolvedValue(true);
		vi.mocked(guestsService.getGuest).mockResolvedValue(guest({ verified: true }));

		renderWithApp(GuestPage, { state: state() });

		await vi.waitFor(() => expect(guestsService.verifyGuest).toHaveBeenCalledWith('guest-uuid'));
		expect(
			await screen.findByRole('heading', { name: 'Thank you for verifying, Ada!' })
		).toBeInTheDocument();
	});

	it('logs out and returns to the register prompt', async () => {
		renderWithApp(GuestPage, { state: state(guest()) });

		await fireEvent.click(screen.getByRole('button', { name: 'LOGOUT GUEST' }));

		await vi.waitFor(() => expect(guestsService.logoutGuest).toHaveBeenCalled());
		expect(await screen.findByRole('button', { name: 'REGISTER / LOGIN' })).toBeInTheDocument();
	});

	it('opens the register dialog', async () => {
		renderWithApp(GuestPage, { state: state() });

		await fireEvent.click(screen.getByRole('button', { name: 'REGISTER / LOGIN' }));

		expect(await screen.findByRole('heading', { name: 'Register User' })).toBeInTheDocument();
	});
});
