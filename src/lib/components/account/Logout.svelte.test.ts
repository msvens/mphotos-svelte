import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { authService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import Logout from './Logout.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { logout: vi.fn().mockResolvedValue({ authenticated: false }) }
}));

beforeEach(() => vi.mocked(authService.logout).mockClear());

function loggedInState(): AppState {
	const s = new AppState();
	s.isUser = true;
	s.user = { name: 'Test User', bio: '', pic: '' };
	return s;
}

describe('Logout', () => {
	it('greets the logged-in user by name', () => {
		renderWithApp(Logout, { state: loggedInState() });
		expect(screen.getByText(/Log out Test User/)).toBeInTheDocument();
	});

	it('calls the store logout (authService.logout) on click', async () => {
		renderWithApp(Logout, { state: loggedInState() });
		await fireEvent.click(screen.getByRole('button', { name: 'LOGOUT NOW' }));
		expect(authService.logout).toHaveBeenCalled();
	});
});
