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
	userService: {
		getUser: vi.fn(),
		getUserConfig: vi.fn(),
		updateUser: vi.fn(),
		updateUserConfig: vi.fn(),
		updateUserGDrive: vi.fn()
	},
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn(), getGuests: vi.fn().mockResolvedValue([]) },
	photosService: {
		getPhotos: vi.fn().mockResolvedValue({ length: 0, photos: [] }),
		deletePhotos: vi.fn(),
		uploadLocalPhoto: vi.fn()
	},
	albumsService: { getAlbums: vi.fn().mockResolvedValue([]) },
	driveService: {
		isAuthenticated: vi.fn().mockResolvedValue(false),
		disconnectDrive: vi.fn(),
		checkDrive: vi.fn(),
		scheduleAddPhotosJob: vi.fn(),
		getJobStatus: vi.fn()
	}
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
			state: state({
				loading: false,
				isUser: true,
				user: { name: 'Test User', bio: '', pic: '', photoStreamAlbumId: '' }
			})
		});
		// all seven menu items present
		for (const name of [
			'Profile',
			'Guests',
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

	it('renders the UX Config section when selected', async () => {
		renderWithApp(Account, {
			state: state({
				loading: false,
				isUser: true,
				user: { name: 'Test User', bio: '', pic: '', photoStreamAlbumId: '' }
			})
		});

		await fireEvent.click(screen.getByRole('button', { name: 'UX Config' }));

		expect(await screen.findByLabelText('Grid Columns')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'SAVE CONFIG' })).toBeInTheDocument();
	});

	it('renders the Google Drive section when selected', async () => {
		renderWithApp(Account, {
			state: state({
				loading: false,
				isUser: true,
				user: { name: 'Test User', bio: '', pic: '', photoStreamAlbumId: '' }
			})
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Google Drive' }));

		expect(await screen.findByRole('button', { name: 'CONNECT' })).toBeInTheDocument();
		expect(screen.queryByText('This section has not been migrated yet.')).toBeNull();
	});

	it('renders the Guests section when selected', async () => {
		renderWithApp(Account, {
			state: state({
				loading: false,
				isUser: true,
				user: { name: 'Test User', bio: '', pic: '', photoStreamAlbumId: '' }
			})
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Guests' }));

		expect(await screen.findByText('No guests yet.')).toBeInTheDocument();
		expect(screen.queryByText('This section has not been migrated yet.')).toBeNull();
	});

	it('renders the Local Drive section when selected', async () => {
		renderWithApp(Account, {
			state: state({
				loading: false,
				isUser: true,
				user: { name: 'Test User', bio: '', pic: '', photoStreamAlbumId: '' }
			})
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Local Drive' }));

		expect(await screen.findByRole('button', { name: 'UPLOAD PHOTOS' })).toBeInTheDocument();
	});
});
