import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { page } from '$app/state';
import { replaceState } from '$app/navigation';
import { authService, userService } from '$lib/api/services';
import { renderWithApp } from '$lib/test-utils';
import Login from './Login.svelte';

// $app/state.page — mutable url so tests can set ?error=
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/account') } }));
vi.mock('$app/navigation', () => ({ replaceState: vi.fn() }));

vi.mock('$lib/api/services', () => ({
	authService: {
		getAuthMethod: vi.fn(),
		login: vi.fn().mockResolvedValue({ authenticated: true }),
		isLoggedIn: vi.fn().mockResolvedValue(true)
	},
	userService: {
		getUser: vi.fn().mockResolvedValue({ name: 'Test User', bio: '', pic: '' }),
		getUserConfig: vi.fn().mockResolvedValue({})
	},
	guestsService: { isGuest: vi.fn().mockResolvedValue(false), getGuest: vi.fn() }
}));

beforeEach(() => {
	vi.clearAllMocks();
	page.url = new URL('http://localhost/account') as unknown as typeof page.url;
	vi.mocked(authService.login).mockResolvedValue({ authenticated: true });
	vi.mocked(userService.getUser).mockResolvedValue({ name: 'Test User', bio: '', pic: '' });
	vi.mocked(userService.getUserConfig).mockResolvedValue(
		{} as Awaited<ReturnType<typeof userService.getUserConfig>>
	);
});

describe('Login', () => {
	it('renders the Google button when the method is google', async () => {
		vi.mocked(authService.getAuthMethod).mockResolvedValue('google');
		renderWithApp(Login);
		expect(await screen.findByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
	});

	it('submits the password and calls authService.login', async () => {
		vi.mocked(authService.getAuthMethod).mockResolvedValue('password');
		renderWithApp(Login);

		const input = await screen.findByLabelText('Password');
		await fireEvent.input(input, { target: { value: 'secret' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Login' }));

		expect(authService.login).toHaveBeenCalledWith('secret');
	});

	it('shows "Incorrect password" when login fails', async () => {
		vi.mocked(authService.getAuthMethod).mockResolvedValue('password');
		vi.mocked(authService.login).mockRejectedValue(new Error('nope'));
		renderWithApp(Login);

		const input = await screen.findByLabelText('Password');
		await fireEvent.input(input, { target: { value: 'wrong' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Login' }));

		expect(await screen.findByText('Incorrect password')).toBeInTheDocument();
	});

	it('shows the failed banner when the auth method cannot be determined', async () => {
		vi.mocked(authService.getAuthMethod).mockRejectedValue(new Error('boom'));
		renderWithApp(Login);
		expect(await screen.findByText(/Unable to determine login method/)).toBeInTheDocument();
	});

	it('surfaces an OAuth error from the URL and clears the param', async () => {
		vi.mocked(authService.getAuthMethod).mockResolvedValue('google');
		page.url = new URL(
			'http://localhost/account?error=unauthorized_email'
		) as unknown as typeof page.url;
		renderWithApp(Login);

		expect(
			await screen.findByText('This Google account is not authorized for this site.')
		).toBeInTheDocument();
		expect(replaceState).toHaveBeenCalledWith('/account', {});
	});
});
