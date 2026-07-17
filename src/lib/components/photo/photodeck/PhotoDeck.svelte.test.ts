import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import { photosService, userService, albumsService, guestsService } from '$lib/api/services';
import { AppState, defaultUXConfig } from '$lib/stores/app.svelte';
import { PhotoState } from '$lib/stores/photos.svelte';
import { renderWithApp, setViewport } from '$lib/test-utils';
import { Colors } from '$lib/colors';
import type { PhotoMetadata, UXConfig } from '$lib/api/types';
import PhotoDeck from './PhotoDeck.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

// The deck mounts the real PhotoLikes/PhotoComments, so their services must resolve too.
vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn(), updateUserPic: vi.fn() },
	guestsService: {
		getGuestLike: vi.fn(),
		getPhotoLikes: vi.fn(),
		getPhotoComments: vi.fn(),
		likePhoto: vi.fn(),
		unlikePhoto: vi.fn(),
		commentPhoto: vi.fn(),
		isGuest: vi.fn(),
		getGuest: vi.fn(),
		registerGuest: vi.fn(),
		updateGuest: vi.fn()
	},
	albumsService: { getAlbumPhotos: vi.fn(), addAlbumPhotos: vi.fn(), deleteAlbumPhotos: vi.fn() },
	photosService: {
		getPhotos: vi.fn(),
		deletePhoto: vi.fn(),
		getPhotoUrl: (id: string) => `/api/images/${id}.jpg`,
		getPhotoThumbUrl: (id: string) => `/api/thumbs/${id}.jpg`,
		getPortraitUrl: (id: string) => `/api/portraits/${id}.jpg`,
		getLandscapeUrl: (id: string) => `/api/landscapes/${id}.jpg`,
		getSquareUrl: (id: string) => `/api/squares/${id}.jpg`,
		getDynamicImageUrl: (p: PhotoMetadata, isPortrait: boolean, isMobile: boolean) => {
			if (!isMobile) return `/api/images/${p.id}.jpg`;
			if (isPortrait) return `/api/portraits/${p.id}.jpg`;
			return `/api/landscapes/${p.id}.jpg`;
		}
	}
}));

function photo(id: string, over: Partial<PhotoMetadata> = {}): PhotoMetadata {
	return {
		id,
		title: `Title ${id}`,
		fileName: `${id}.jpg`,
		width: 3000,
		height: 2000,
		...over
	} as PhotoMetadata;
}

const photos = [photo('a'), photo('b'), photo('c')];

function appState(config: Partial<UXConfig> = {}): AppState {
	const s = new AppState();
	s.uxConfig = { ...defaultUXConfig, photoStreamAlbumId: 'stream', ...config };
	s.loading = false;
	return s;
}

function photoStore(streamIds: string[] = []): PhotoState {
	const p = new PhotoState();
	for (const id of streamIds) p.streamIds.add(id);
	p.allPhotos = photos;
	p.loading = false;
	return p;
}

const base = { photos, urlPrefix: '/photo/', searchQuery: '' };
const shown = () => screen.getByRole('img') as HTMLImageElement;

beforeEach(() => {
	vi.mocked(goto).mockReset();
	vi.mocked(guestsService.getPhotoLikes).mockReset().mockResolvedValue([]);
	vi.mocked(guestsService.getPhotoComments).mockReset().mockResolvedValue([]);
	vi.mocked(guestsService.getGuestLike).mockReset().mockResolvedValue(false);
	vi.mocked(photosService.deletePhoto).mockReset().mockResolvedValue(photo('a'));
	vi.mocked(userService.updateUserPic)
		.mockReset()
		.mockResolvedValue({ name: '', bio: '', pic: '' });
	vi.mocked(albumsService.addAlbumPhotos).mockReset().mockResolvedValue({ numItems: 1 });
	vi.mocked(albumsService.deleteAlbumPhotos).mockReset().mockResolvedValue({ numItems: 1 });
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('PhotoDeck', () => {
	it('shows an empty state with no photos', () => {
		renderWithApp(PhotoDeck, {
			state: appState(),
			props: { ...base, photos: [], photoId: 'a' }
		});
		expect(screen.getByText('No photos available')).toBeInTheDocument();
	});

	it('shows the photo named in the url', () => {
		renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'b' } });
		expect(screen.getByAltText('Title b')).toBeInTheDocument();
	});

	it('falls back to the first photo for an unknown id', () => {
		renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'nope' } });
		expect(screen.getByAltText('Title a')).toBeInTheDocument();
	});

	describe('the url owns the photo', () => {
		it('follows the id it is given, without remounting', async () => {
			// This is what browser back/forward does — the route param changes and the deck
			// must follow. The React version seeded an index once and never re-read it, so
			// the URL and the picture drifted apart.
			const { rerender } = renderWithApp(PhotoDeck, {
				state: appState(),
				props: { ...base, photoId: 'a' }
			});
			expect(screen.getByAltText('Title a')).toBeInTheDocument();

			await rerender({ ...base, photoId: 'c' });

			expect(screen.getByAltText('Title c')).toBeInTheDocument();
		});

		it('navigates rather than changing the photo itself', async () => {
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });

			await fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

			expect(goto).toHaveBeenCalledWith('/photo/b');
			// Still showing 'a': only a new photoId moves the deck.
			expect(screen.getByAltText('Title a')).toBeInTheDocument();
		});
	});

	describe('wraparound', () => {
		it('goes from the first photo back to the last', async () => {
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });

			await fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));

			expect(goto).toHaveBeenCalledWith('/photo/c');
		});

		it('goes from the last photo on to the first', async () => {
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'c' } });

			await fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

			expect(goto).toHaveBeenCalledWith('/photo/a');
		});

		it('never disables the chevrons', () => {
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });

			expect(screen.getByRole('button', { name: 'Previous photo' })).toBeEnabled();
			expect(screen.getByRole('button', { name: 'Next photo' })).toBeEnabled();
		});

		it('appends the search query when navigating', async () => {
			renderWithApp(PhotoDeck, {
				state: appState(),
				props: { ...base, photoId: 'a', searchQuery: '?q=x' }
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

			expect(goto).toHaveBeenCalledWith('/photo/b?q=x');
		});
	});

	describe('images', () => {
		it('serves the full image on desktop', () => {
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });
			expect(shown().getAttribute('src')).toBe('/api/images/a.jpg');
		});

		it('serves a crop on a portrait phone, first time', () => {
			// The React version assumed desktop until an effect corrected it, so phones
			// fetched the full-size image and then swapped.
			setViewport({ mobile: true, portrait: true });
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });

			expect(shown().getAttribute('src')).toBe('/api/portraits/a.jpg');
		});

		it('serves a landscape crop on a phone held sideways', () => {
			setViewport({ mobile: true, portrait: false });
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });

			expect(shown().getAttribute('src')).toBe('/api/landscapes/a.jpg');
		});
	});

	describe('keyboard', () => {
		it('pages with the arrow keys', async () => {
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'b' } });

			await fireEvent.keyDown(window, { key: 'ArrowRight' });
			expect(goto).toHaveBeenCalledWith('/photo/c');

			await fireEvent.keyDown(window, { key: 'ArrowLeft' });
			expect(goto).toHaveBeenCalledWith('/photo/a');
		});

		it('does not page while a comment is being typed', async () => {
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'b' } });
			const box = await screen.findByLabelText('Add comment...');

			await fireEvent.keyDown(box, { key: 'ArrowRight' });

			expect(goto).not.toHaveBeenCalled();
		});
	});

	describe('fullscreen', () => {
		it('opens and closes the overlay', async () => {
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });

			await fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
			expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeInTheDocument();

			await fireEvent.click(screen.getByRole('button', { name: 'Exit fullscreen' }));
			expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeInTheDocument();
		});

		it('shows the full image, not a crop', async () => {
			setViewport({ mobile: true, portrait: true });
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });

			await fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));

			expect(shown().getAttribute('src')).toBe('/api/images/a.jpg');
		});

		it('closes on Escape', async () => {
			// The React overlay had no keyboard exit at all.
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });
			await fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));

			await fireEvent.keyDown(window, { key: 'Escape' });

			expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeInTheDocument();
		});

		it('still navigates by url from inside the overlay', async () => {
			// The React overlay set its index directly, so leaving it left a stale url.
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });
			await fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));

			await fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

			expect(goto).toHaveBeenCalledWith('/photo/b');
		});
	});

	describe('owner controls', () => {
		const owner = { ...base, photoId: 'a', editControls: true };

		it('are hidden from visitors', () => {
			renderWithApp(PhotoDeck, { state: appState(), props: { ...base, photoId: 'a' } });
			expect(screen.queryByRole('button', { name: 'Delete photo' })).toBeNull();
		});

		it('set the profile picture', async () => {
			const { toast } = renderWithApp(PhotoDeck, { state: appState(), props: owner });

			await fireEvent.click(screen.getByRole('button', { name: 'Set as profile picture' }));

			await vi.waitFor(() =>
				expect(userService.updateUserPic).toHaveBeenCalledWith('/api/thumbs/a.jpg')
			);
			await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('success'));
		});

		it('add to the photostream with a targeted call', async () => {
			const { toast } = renderWithApp(PhotoDeck, {
				state: appState(),
				photos: photoStore(),
				props: owner
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Add to photostream' }));

			await vi.waitFor(() =>
				expect(albumsService.addAlbumPhotos).toHaveBeenCalledWith('stream', ['a'])
			);
			await vi.waitFor(() => expect(toast.toasts[0]?.message).toBe('Added to photostream'));
		});

		it('read the photostream state from the store, without a request', async () => {
			// The React version asked the server which albums the photo was in on every
			// single navigation — for every visitor, to feed an icon only the owner sees.
			renderWithApp(PhotoDeck, {
				state: appState(),
				photos: photoStore(['a']),
				props: owner
			});

			expect(screen.getByRole('button', { name: 'Remove from photostream' })).toBeInTheDocument();
		});

		it('only toast once when the photostream call fails', async () => {
			// The React version toasted success before awaiting, so a failure produced both.
			vi.mocked(albumsService.addAlbumPhotos).mockRejectedValue(new Error('nope'));
			const { toast } = renderWithApp(PhotoDeck, {
				state: appState(),
				photos: photoStore(),
				props: owner
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Add to photostream' }));

			await vi.waitFor(() => expect(toast.toasts).toHaveLength(1));
			expect(toast.toasts[0].severity).toBe('error');
		});

		describe('deleting', () => {
			it('lands on the next photo', async () => {
				// The React version picked the neighbour out of the pre-deletion list, so it
				// landed one photo further along than intended.
				const store = photoStore();
				renderWithApp(PhotoDeck, { state: appState(), photos: store, props: owner });

				await fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }));
				await fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

				await vi.waitFor(() => expect(photosService.deletePhoto).toHaveBeenCalledWith('a', true));
				expect(goto).toHaveBeenCalledWith('/photo/b');
			});

			it('wraps to the first photo when deleting the last', async () => {
				const store = photoStore();
				renderWithApp(PhotoDeck, {
					state: appState(),
					photos: store,
					props: { ...owner, photoId: 'c' }
				});

				await fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }));
				await fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

				await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/photo/a'));
			});

			it('leaves the deck when the last photo goes', async () => {
				renderWithApp(PhotoDeck, {
					state: appState(),
					photos: photoStore(),
					props: { ...owner, photos: [photo('a')] }
				});

				await fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }));
				await fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

				await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/photo'));
			});

			it('toasts and stays put on failure', async () => {
				vi.mocked(photosService.deletePhoto).mockRejectedValue(new Error('nope'));
				const { toast } = renderWithApp(PhotoDeck, {
					state: appState(),
					photos: photoStore(),
					props: owner
				});

				await fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }));
				await fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

				await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('error'));
				expect(goto).not.toHaveBeenCalled();
			});
		});
	});

	describe('the details', () => {
		const rich = photo('a', {
			title: 'Sunrise',
			originalDate: '2026-03-04T06:00:00Z',
			cameraModel: 'LEICA Q2',
			lensModel: 'Summilux 28mm',
			focalLength: '28mm',
			focalLength35: '35mm',
			fNumber: 8,
			iso: 100,
			exposure: '1/250'
		});

		it('shows the title, date, camera, lens, focal length and settings', () => {
			renderWithApp(PhotoDeck, {
				state: appState(),
				props: { ...base, photos: [rich], photoId: 'a' }
			});

			expect(screen.getByRole('heading', { name: 'Sunrise' })).toBeInTheDocument();
			expect(screen.getByText(/Taken on March 4, 2026/)).toBeInTheDocument();
			expect(screen.getByRole('link', { name: 'LEICA Q2' })).toHaveAttribute(
				'href',
				'/camera/leica-q2'
			);
			expect(screen.getByText(/Summilux 28mm/)).toBeInTheDocument();
			// Restored: the port dropped focal length, and the unit off the exposure.
			expect(screen.getByText('Focal length: 28mm (35mm).')).toBeInTheDocument();
			expect(screen.getByText('Settings: f8, iso100, 1/250 secs.')).toBeInTheDocument();
		});

		it('drops the 35mm equivalent when there is none', () => {
			renderWithApp(PhotoDeck, {
				state: appState(),
				props: {
					...base,
					photos: [photo('a', { focalLength: '28mm', focalLength35: '' })],
					photoId: 'a'
				}
			});

			expect(screen.getByText('Focal length: 28mm.')).toBeInTheDocument();
		});

		it('falls back to Untitled and hides missing fields', () => {
			renderWithApp(PhotoDeck, {
				state: appState(),
				props: { ...base, photos: [photo('a', { title: '' })], photoId: 'a' }
			});

			expect(screen.getByRole('heading', { name: 'Untitled' })).toBeInTheDocument();
			expect(screen.queryByText(/Focal length/)).toBeNull();
			expect(screen.queryByText(/Taken on/)).toBeNull();
		});
	});

	describe('appearance', () => {
		it('uses light controls on a dark background', () => {
			renderWithApp(PhotoDeck, {
				state: appState({ photoBackgroundColor: Colors.Black }),
				props: { ...base, photoId: 'a' }
			});

			expect(screen.getByRole('button', { name: 'Next photo' }).className).toContain('text-white');
		});

		it('uses dark controls on a light background', () => {
			renderWithApp(PhotoDeck, {
				state: appState({ photoBackgroundColor: Colors.White }),
				props: { ...base, photoId: 'a' }
			});

			expect(screen.getByRole('button', { name: 'Next photo' }).className).toContain(
				'text-gray-900'
			);
		});

		it('keeps the overlay controls legible on a light background', async () => {
			// The React overlay hardcoded text-white, so its controls vanished here.
			renderWithApp(PhotoDeck, {
				state: appState({ photoBackgroundColor: Colors.White }),
				props: { ...base, photoId: 'a' }
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));

			expect(screen.getByRole('button', { name: 'Next photo' }).className).toContain(
				'text-gray-900'
			);
		});
	});
});
