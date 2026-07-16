import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import Account from './+page.svelte';

// Account renders <Login/>, which imports these.
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/account') } }));
vi.mock('$app/navigation', () => ({ replaceState: vi.fn() }));
vi.mock('$lib/api/services', () => ({
	authService: { getAuthMethod: vi.fn().mockResolvedValue('google') },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
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

	it('shows the SideMenu dashboard when logged in, with placeholders for unmigrated sections', () => {
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
		// default section (Profile) is a placeholder
		expect(screen.getByText('This section has not been migrated yet.')).toBeInTheDocument();
	});
});
