import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { guestsService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { PhotoComment } from '$lib/api/types';
import PhotoComments from './PhotoComments.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: {
		getPhotoComments: vi.fn(),
		commentPhoto: vi.fn(),
		isGuest: vi.fn(),
		getGuest: vi.fn(),
		registerGuest: vi.fn(),
		updateGuest: vi.fn()
	}
}));

function comment(id: number, body: string): PhotoComment {
	return { id, photoId: 'p1', name: 'Ann', time: '2026-03-04T10:00:00Z', body };
}

function state(isGuest: boolean, loading = false): AppState {
	const s = new AppState();
	s.isGuest = isGuest;
	s.loading = loading;
	return s;
}

const box = () => screen.getByLabelText('Add comment...');
const post = () => screen.getByRole('button', { name: 'Post' });

beforeEach(() => {
	vi.mocked(guestsService.getPhotoComments).mockReset().mockResolvedValue([]);
	vi.mocked(guestsService.commentPhoto).mockReset().mockResolvedValue(comment(2, 'Nice shot'));
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('PhotoComments', () => {
	describe('loading', () => {
		it('waits for auth to settle before fetching', async () => {
			// Fetching before the session cookie is set would return the wrong answer.
			renderWithApp(PhotoComments, { state: state(false, true), props: { photoId: 'p1' } });

			expect(screen.getByText('Loading comments...')).toBeInTheDocument();
			expect(guestsService.getPhotoComments).not.toHaveBeenCalled();
		});

		it('invites the first comment when there are none', async () => {
			renderWithApp(PhotoComments, { state: state(false), props: { photoId: 'p1' } });

			expect(
				await screen.findByText('No comments yet. Be the first to comment!')
			).toBeInTheDocument();
		});

		it('lists the comments with author and date', async () => {
			vi.mocked(guestsService.getPhotoComments).mockResolvedValue([comment(1, 'Lovely light')]);
			renderWithApp(PhotoComments, { state: state(false), props: { photoId: 'p1' } });

			expect(await screen.findByText('Lovely light')).toBeInTheDocument();
			expect(screen.getByText('Ann, Mar 4, 2026')).toBeInTheDocument();
		});

		it('copes with a failed fetch', async () => {
			vi.mocked(guestsService.getPhotoComments).mockRejectedValue(new Error('boom'));
			renderWithApp(PhotoComments, { state: state(false), props: { photoId: 'p1' } });

			expect(
				await screen.findByText('No comments yet. Be the first to comment!')
			).toBeInTheDocument();
		});
	});

	describe('posting', () => {
		it('disables Post until something is typed', async () => {
			renderWithApp(PhotoComments, { state: state(true), props: { photoId: 'p1' } });

			expect(post()).toBeDisabled();

			await fireEvent.input(box(), { target: { value: 'Nice shot' } });

			expect(post()).toBeEnabled();
		});

		it('ignores whitespace', async () => {
			renderWithApp(PhotoComments, { state: state(true), props: { photoId: 'p1' } });

			await fireEvent.input(box(), { target: { value: '   ' } });

			expect(post()).toBeDisabled();
		});

		it('posts the comment, appends it and clears the box', async () => {
			renderWithApp(PhotoComments, { state: state(true), props: { photoId: 'p1' } });
			await fireEvent.input(box(), { target: { value: 'Nice shot' } });

			await fireEvent.click(post());

			await vi.waitFor(() =>
				expect(guestsService.commentPhoto).toHaveBeenCalledWith('p1', 'Nice shot')
			);
			expect(await screen.findByText('Nice shot')).toBeInTheDocument();
			expect(box()).toHaveValue('');
		});

		it('keeps the text when posting fails', async () => {
			vi.mocked(guestsService.commentPhoto).mockRejectedValue(new Error('nope'));
			renderWithApp(PhotoComments, { state: state(true), props: { photoId: 'p1' } });
			await fireEvent.input(box(), { target: { value: 'Nice shot' } });

			await fireEvent.click(post());

			await vi.waitFor(() => expect(guestsService.commentPhoto).toHaveBeenCalled());
			expect(box()).toHaveValue('Nice shot');
		});
	});

	describe('as a stranger', () => {
		it('offers registration instead of posting', async () => {
			renderWithApp(PhotoComments, { state: state(false), props: { photoId: 'p1' } });
			await fireEvent.input(box(), { target: { value: 'Nice shot' } });

			await fireEvent.click(post());

			expect(await screen.findByRole('heading', { name: 'Register User' })).toBeInTheDocument();
			expect(guestsService.commentPhoto).not.toHaveBeenCalled();
		});

		it('keeps the typed comment while registering', async () => {
			renderWithApp(PhotoComments, { state: state(false), props: { photoId: 'p1' } });
			await fireEvent.input(box(), { target: { value: 'Nice shot' } });
			await fireEvent.click(post());
			await screen.findByRole('heading', { name: 'Register User' });

			await fireEvent.click(screen.getByRole('button', { name: 'CANCEL' }));

			expect(box()).toHaveValue('Nice shot');
		});
	});
});
