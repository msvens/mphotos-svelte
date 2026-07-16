import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import Account from './+page.svelte';

// Account renders <Login/> and the migrated sections, which import these.
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/account') } }));
vi.mock('$app/navigation', () => ({ replaceState: vi.fn() }));
vi.mock('$lib/api/services', () => ({
	authService: { getAuthMethod: vi.fn().mockResolvedValue('google'), isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn(), updateUser: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() }
}));

beforeEach(() => vi.clearAllMocks());

function state(overrides: Partial<AppState>): AppState {
	const s = new AppState();
	Object.assign(s, overrides);
	return s;
}

describe('account page gating', () => {
	it('shows a loading spinner while loading', () => {
		renderWithApp(Account, { state: state({ loading: true }) });
		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('shows the Login view when logged out', async () => {
		renderWithApp(Account, { state: state({ loading: false, isUser: false }) });
		expect(await screen.findByText('Login to edit settings')).toBeInTheDocument();
	});

	it('shows the SideMenu dashboard when logged in', () => {
		renderWithApp(Account, {
			state: state({ loading: false, isUser: true, user: { name: 'Test User', bio: '', pic: '' } })
		});
		// all six menu items present
		for (const name of [
			'Profile',
			'Google Drive',
			'Local Drive',
			'UX Config',
			'Maintenance',
			'Logout'
		]) {
			expect(screen.getByRole('button', { name })).toBeInTheDocument();
		}
		// Profile is the default section. Match the heading, not the menu button of the same name.
		expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
	});

	it('still shows a placeholder for sections that are not migrated yet', async () => {
		renderWithApp(Account, {
			state: state({ loading: false, isUser: true, user: { name: 'Test User', bio: '', pic: '' } })
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Google Drive' }));

		expect(screen.getByRole('heading', { name: 'Google Drive' })).toBeInTheDocument();
		expect(screen.getByText('This section has not been migrated yet.')).toBeInTheDocument();
	});
});
