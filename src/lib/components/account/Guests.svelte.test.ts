import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { guestsService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { Guest } from '$lib/api/types';
import Guests from './Guests.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: {
		isGuest: vi.fn(),
		getGuest: vi.fn(),
		getGuests: vi.fn(),
		deleteGuest: vi.fn(),
		getAvatarUrl: vi.fn()
	},
	albumsService: { getAlbumPhotos: vi.fn() },
	photosService: { getPhotos: vi.fn() }
}));

const guest = (over: Partial<Guest> = {}): Guest => ({
	guestId: 'g1',
	email: 'anna@example.com',
	name: 'Anna',
	fullName: '',
	description: '',
	avatar: '',
	verified: true,
	verifyTime: '2026-08-03T10:00:00Z',
	...over
});

function ownerState(): AppState {
	const s = new AppState();
	s.isUser = true;
	s.loading = false;
	s.user = { name: 'M', bio: '', pic: '', photoStreamAlbumId: '' };
	return s;
}

beforeEach(() => {
	vi.mocked(guestsService.getGuests).mockReset().mockResolvedValue([]);
	vi.mocked(guestsService.getAvatarUrl).mockReturnValue('/api/guest/avatar/g1/48');
	vi.mocked(guestsService.deleteGuest).mockReset().mockResolvedValue('g1');
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Guests', () => {
	it('lists each guest with name, full name and email', async () => {
		vi.mocked(guestsService.getGuests).mockResolvedValue([
			guest({ fullName: 'Anna Margareta Lind' }),
			guest({ guestId: 'g2', name: 'Bo', email: 'bo@example.com' })
		]);
		renderWithApp(Guests, { state: ownerState() });

		expect(await screen.findByText('Anna')).toBeInTheDocument();
		expect(screen.getByText('Anna Margareta Lind')).toBeInTheDocument();
		expect(screen.getByText('anna@example.com')).toBeInTheDocument();
		expect(screen.getByText('Bo')).toBeInTheDocument();
		expect(screen.getByText('bo@example.com')).toBeInTheDocument();
	});

	it('labels verifyTime as verified or signed up depending on state', async () => {
		vi.mocked(guestsService.getGuests).mockResolvedValue([
			guest(),
			guest({ guestId: 'g2', name: 'Bo', verified: false, verifyTime: '2026-08-07T10:00:00Z' })
		]);
		renderWithApp(Guests, { state: ownerState() });

		expect(await screen.findByText('Verified August 3, 2026')).toBeInTheDocument();
		expect(screen.getByText('Signed up August 7, 2026')).toBeInTheDocument();
	});

	it('summarises the total and verified counts', async () => {
		vi.mocked(guestsService.getGuests).mockResolvedValue([
			guest(),
			guest({ guestId: 'g2', name: 'Bo', verified: false })
		]);
		renderWithApp(Guests, { state: ownerState() });

		expect(await screen.findByText('2 guests · 1 verified')).toBeInTheDocument();
	});

	it('filters to pending guests and reports how many are shown', async () => {
		vi.mocked(guestsService.getGuests).mockResolvedValue([
			guest(),
			guest({ guestId: 'g2', name: 'Bo', verified: false })
		]);
		renderWithApp(Guests, { state: ownerState() });

		await fireEvent.click(await screen.findByRole('combobox'));
		await fireEvent.click(screen.getByRole('option', { name: 'Pending' }));

		expect(screen.queryByText('Anna')).toBeNull();
		expect(screen.getByText('Bo')).toBeInTheDocument();
		expect(screen.getByText('2 guests · 1 verified · showing 1')).toBeInTheDocument();
	});

	it('shows an empty state when nobody has signed up', async () => {
		renderWithApp(Guests, { state: ownerState() });

		expect(await screen.findByText('No guests yet.')).toBeInTheDocument();
	});

	it('surfaces the backend message when the list fails to load', async () => {
		vi.mocked(guestsService.getGuests).mockRejectedValue(new Error('user not logged in'));
		renderWithApp(Guests, { state: ownerState() });

		expect(await screen.findByText('user not logged in')).toBeInTheDocument();
	});

	describe('deleting a guest', () => {
		const twoGuests = () => [guest(), guest({ guestId: 'g2', name: 'Bo', verified: false })];

		it('confirms with the guest name before deleting', async () => {
			vi.mocked(guestsService.getGuests).mockResolvedValue(twoGuests());
			renderWithApp(Guests, { state: ownerState() });

			const rows = await screen.findAllByRole('button', { name: 'Delete guest' });
			await fireEvent.click(rows[0]);

			expect(screen.getByRole('heading', { name: 'Delete guest "Anna"?' })).toBeInTheDocument();
			expect(guestsService.deleteGuest).not.toHaveBeenCalled();
		});

		it('removes the row and updates the counts on success', async () => {
			vi.mocked(guestsService.getGuests).mockResolvedValue(twoGuests());
			const { toast } = renderWithApp(Guests, { state: ownerState() });

			const rows = await screen.findAllByRole('button', { name: 'Delete guest' });
			await fireEvent.click(rows[0]);
			await fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

			await vi.waitFor(() => expect(guestsService.deleteGuest).toHaveBeenCalledWith('g1'));
			await vi.waitFor(() => expect(screen.queryByText('Anna')).toBeNull());
			expect(screen.getByText('Bo')).toBeInTheDocument();
			expect(screen.getByText('1 guest · 0 verified')).toBeInTheDocument();
			expect(toast.toasts[0]?.severity).toBe('success');
		});

		it('keeps the row and toasts when the delete fails', async () => {
			vi.mocked(guestsService.getGuests).mockResolvedValue(twoGuests());
			vi.mocked(guestsService.deleteGuest).mockRejectedValue(new Error('guest not found'));
			const { toast } = renderWithApp(Guests, { state: ownerState() });

			const rows = await screen.findAllByRole('button', { name: 'Delete guest' });
			await fireEvent.click(rows[0]);
			await fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

			await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('error'));
			expect(screen.getByText('Anna')).toBeInTheDocument();
			expect(screen.getByText('2 guests · 1 verified')).toBeInTheDocument();
		});
	});
});
