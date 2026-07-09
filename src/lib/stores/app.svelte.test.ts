import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService, userService, guestsService } from '$lib/api/services';
import { AppState, defaultUXConfig, defaultUser } from './app.svelte';
import type { User, UXConfig, Guest } from '$lib/api/types';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn(), login: vi.fn(), logout: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() }
}));

const mockUser: User = { name: 'Martin', bio: 'Photographer', pic: '/pic.jpg' };
const serverConfig: Partial<UXConfig> = { photoGridCols: 5, colorTheme: 'light' };
const mockGuest: Guest = { name: 'Ada', email: 'ada@test.com', verified: true, verifyTime: '' };

beforeEach(() => {
	vi.mocked(authService.isLoggedIn).mockReset();
	vi.mocked(authService.login).mockReset();
	vi.mocked(authService.logout).mockReset();
	vi.mocked(userService.getUser).mockReset();
	vi.mocked(userService.getUserConfig).mockReset();
	vi.mocked(guestsService.isGuest).mockReset();
	vi.mocked(guestsService.getGuest).mockReset();
});

describe('AppState.refreshAuth', () => {
	it('logged in: sets user, merges config over defaults, isUser=true, loading=false', async () => {
		vi.mocked(authService.isLoggedIn).mockResolvedValue(true);
		vi.mocked(userService.getUser).mockResolvedValue(mockUser);
		vi.mocked(userService.getUserConfig).mockResolvedValue(serverConfig as UXConfig);

		const app = new AppState();
		await app.refreshAuth();

		expect(app.isUser).toBe(true);
		expect(app.loading).toBe(false);
		expect(app.user).toEqual(mockUser);
		// Server values override, unspecified keys keep defaults.
		expect(app.uxConfig.photoGridCols).toBe(5);
		expect(app.uxConfig.colorTheme).toBe('light');
		expect(app.uxConfig.photoBorders).toBe(defaultUXConfig.photoBorders);
	});

	it('not logged in: still fetches public user, isUser=false', async () => {
		vi.mocked(authService.isLoggedIn).mockResolvedValue(false);
		vi.mocked(userService.getUser).mockResolvedValue(mockUser);
		vi.mocked(userService.getUserConfig).mockResolvedValue(defaultUXConfig);

		const app = new AppState();
		await app.refreshAuth();

		expect(app.isUser).toBe(false);
		expect(app.user).toEqual(mockUser);
		expect(app.loading).toBe(false);
	});

	it('config fetch fails: falls back to default config but still resolves', async () => {
		vi.mocked(authService.isLoggedIn).mockResolvedValue(true);
		vi.mocked(userService.getUser).mockResolvedValue(mockUser);
		vi.mocked(userService.getUserConfig).mockRejectedValue(new Error('boom'));

		const app = new AppState();
		await app.refreshAuth();

		expect(app.uxConfig).toEqual(defaultUXConfig);
		expect(app.isUser).toBe(true);
		expect(app.loading).toBe(false);
	});

	it('auth check fails: resets to defaults, isUser=false, loading=false', async () => {
		vi.mocked(authService.isLoggedIn).mockRejectedValue(new Error('network'));

		const app = new AppState();
		await app.refreshAuth();

		expect(app.isUser).toBe(false);
		expect(app.user).toEqual(defaultUser);
		expect(app.uxConfig).toEqual(defaultUXConfig);
		expect(app.loading).toBe(false);
	});
});

describe('AppState.login / logout', () => {
	it('login authenticates then refreshes auth', async () => {
		vi.mocked(authService.login).mockResolvedValue({ authenticated: true });
		vi.mocked(authService.isLoggedIn).mockResolvedValue(true);
		vi.mocked(userService.getUser).mockResolvedValue(mockUser);
		vi.mocked(userService.getUserConfig).mockResolvedValue(defaultUXConfig);

		const app = new AppState();
		await app.login('secret');

		expect(authService.login).toHaveBeenCalledWith('secret');
		expect(app.isUser).toBe(true);
		expect(app.user).toEqual(mockUser);
	});

	it('logout clears user even if the request fails', async () => {
		vi.mocked(authService.logout).mockRejectedValue(new Error('nope'));

		const app = new AppState();
		app.isUser = true;
		app.user = mockUser;
		await app.logout();

		expect(app.isUser).toBe(false);
		expect(app.user).toEqual(defaultUser);
	});
});

describe('AppState.refreshGuest', () => {
	it('guest present: sets guest and isGuest=true', async () => {
		vi.mocked(guestsService.isGuest).mockResolvedValue(true);
		vi.mocked(guestsService.getGuest).mockResolvedValue(mockGuest);

		const app = new AppState();
		await app.refreshGuest();

		expect(app.isGuest).toBe(true);
		expect(app.guest).toEqual(mockGuest);
	});

	it('not a guest: clears guest state', async () => {
		vi.mocked(guestsService.isGuest).mockResolvedValue(false);

		const app = new AppState();
		app.isGuest = true;
		app.guest = mockGuest;
		await app.refreshGuest();

		expect(app.isGuest).toBe(false);
		expect(app.guest).toBeUndefined();
	});
});
