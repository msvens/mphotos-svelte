import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { guestsService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { GuestReaction } from '$lib/api/types';
import PhotoLikes, { getLikesText } from './PhotoLikes.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: {
		getGuestLike: vi.fn(),
		getPhotoLikes: vi.fn(),
		likePhoto: vi.fn(),
		unlikePhoto: vi.fn(),
		isGuest: vi.fn(),
		getGuest: vi.fn(),
		registerGuest: vi.fn(),
		updateGuest: vi.fn()
	}
}));

const reaction = (name: string): GuestReaction => ({ name, email: `${name}@x.com`, kind: 'like' });

function state(isGuest: boolean): AppState {
	const s = new AppState();
	s.isGuest = isGuest;
	s.loading = false;
	return s;
}

const heart = () => screen.getByRole('button', { name: /photo$/ });

beforeEach(() => {
	vi.mocked(guestsService.getGuestLike).mockReset().mockResolvedValue(false);
	vi.mocked(guestsService.getPhotoLikes).mockReset().mockResolvedValue([]);
	vi.mocked(guestsService.likePhoto).mockReset().mockResolvedValue('ok');
	vi.mocked(guestsService.unlikePhoto).mockReset().mockResolvedValue('ok');
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getLikesText', () => {
	it('invites the first like', () => {
		expect(getLikesText(false, [])).toBe('Be the first to like this picture');
		expect(getLikesText(true, [])).toBe('Be the first to like this picture');
	});

	describe('liked by you', () => {
		it.each([
			[1, 'Liked by you'],
			[2, 'liked by you and 1 other'],
			[3, 'liked by you and 2 others'],
			[5, 'liked by you and 4 others']
		])('%i likes reads "%s"', (n, expected) => {
			const guests = Array.from({ length: n }, (_, i) => reaction(`g${i}`));
			expect(getLikesText(true, guests)).toBe(expected);
		});
	});

	describe('liked by others', () => {
		it.each([
			[1, 'Liked by Ann'],
			[2, 'liked by Ann and 1 other'],
			[4, 'liked by Ann and 3 others']
		])('%i likes reads "%s"', (n, expected) => {
			const guests = [
				reaction('Ann'),
				...Array.from({ length: n - 1 }, (_, i) => reaction(`g${i}`))
			];
			expect(getLikesText(false, guests)).toBe(expected);
		});
	});
});

describe('PhotoLikes', () => {
	it('shows who liked the photo', async () => {
		vi.mocked(guestsService.getPhotoLikes).mockResolvedValue([reaction('Ann')]);
		renderWithApp(PhotoLikes, { state: state(false), props: { photoId: 'p1' } });

		expect(await screen.findByText('Liked by Ann')).toBeInTheDocument();
	});

	it('does not ask about a visitor’s own like when they are not a guest', async () => {
		renderWithApp(PhotoLikes, { state: state(false), props: { photoId: 'p1' } });

		await vi.waitFor(() => expect(guestsService.getPhotoLikes).toHaveBeenCalled());
		expect(guestsService.getGuestLike).not.toHaveBeenCalled();
	});

	it('fetches each list exactly once on mount', async () => {
		// The React version listed `likesPhoto` as an effect dependency, so the like list
		// was fetched again as soon as the guest's own like resolved.
		renderWithApp(PhotoLikes, { state: state(true), props: { photoId: 'p1' } });

		await vi.waitFor(() => expect(guestsService.getPhotoLikes).toHaveBeenCalled());
		expect(guestsService.getPhotoLikes).toHaveBeenCalledTimes(1);
		expect(guestsService.getGuestLike).toHaveBeenCalledTimes(1);
	});

	describe('as a registered guest', () => {
		it('shows a filled heart when already liked', async () => {
			vi.mocked(guestsService.getGuestLike).mockResolvedValue(true);
			renderWithApp(PhotoLikes, { state: state(true), props: { photoId: 'p1' } });

			expect(await screen.findByRole('button', { name: 'Unlike photo' })).toBeInTheDocument();
		});

		it('likes the photo and refreshes the list', async () => {
			renderWithApp(PhotoLikes, { state: state(true), props: { photoId: 'p1' } });
			await vi.waitFor(() => expect(guestsService.getPhotoLikes).toHaveBeenCalledTimes(1));
			vi.mocked(guestsService.getPhotoLikes).mockResolvedValue([reaction('Martin')]);

			await fireEvent.click(heart());

			await vi.waitFor(() => expect(guestsService.likePhoto).toHaveBeenCalledWith('p1'));
			expect(await screen.findByRole('button', { name: 'Unlike photo' })).toBeInTheDocument();
			expect(guestsService.getPhotoLikes).toHaveBeenCalledTimes(2);
		});

		it('unlikes a liked photo', async () => {
			vi.mocked(guestsService.getGuestLike).mockResolvedValue(true);
			renderWithApp(PhotoLikes, { state: state(true), props: { photoId: 'p1' } });
			await screen.findByRole('button', { name: 'Unlike photo' });

			await fireEvent.click(heart());

			await vi.waitFor(() => expect(guestsService.unlikePhoto).toHaveBeenCalledWith('p1'));
			expect(await screen.findByRole('button', { name: 'Like photo' })).toBeInTheDocument();
		});

		it('survives a failed toggle', async () => {
			vi.mocked(guestsService.likePhoto).mockRejectedValue(new Error('nope'));
			renderWithApp(PhotoLikes, { state: state(true), props: { photoId: 'p1' } });

			await fireEvent.click(heart());

			await vi.waitFor(() => expect(guestsService.likePhoto).toHaveBeenCalled());
			expect(screen.getByRole('button', { name: 'Like photo' })).toBeEnabled();
		});
	});

	describe('as a stranger', () => {
		it('offers registration instead of liking', async () => {
			renderWithApp(PhotoLikes, { state: state(false), props: { photoId: 'p1' } });

			await fireEvent.click(heart());

			expect(await screen.findByRole('heading', { name: 'Register User' })).toBeInTheDocument();
			expect(guestsService.likePhoto).not.toHaveBeenCalled();
		});

		it('closes the dialog again', async () => {
			renderWithApp(PhotoLikes, { state: state(false), props: { photoId: 'p1' } });
			await fireEvent.click(heart());
			await screen.findByRole('heading', { name: 'Register User' });

			await fireEvent.click(screen.getByRole('button', { name: 'CANCEL' }));

			await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		});
	});

	it('copes with a failed likes fetch', async () => {
		vi.mocked(guestsService.getPhotoLikes).mockRejectedValue(new Error('boom'));
		renderWithApp(PhotoLikes, { state: state(false), props: { photoId: 'p1' } });

		expect(await screen.findByText('Be the first to like this picture')).toBeInTheDocument();
	});
});
