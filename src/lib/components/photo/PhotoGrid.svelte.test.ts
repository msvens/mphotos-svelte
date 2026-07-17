import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import type { PhotoMetadata } from '$lib/api/types';
import PhotoGrid from './PhotoGrid.svelte';

function photo(id: string, over: Partial<PhotoMetadata> = {}): PhotoMetadata {
	return { id, title: `Title ${id}`, fileName: `${id}.jpg`, ...over } as PhotoMetadata;
}

const photos = [photo('a'), photo('b'), photo('c')];

/** An overlay that reports the args it was handed, so we can assert the index. */
const overlay = createRawSnippet((p: () => PhotoMetadata, i: () => number) => ({
	render: () => `<button>toggle ${p().id} @ ${i()}</button>`
}));

const gridStyle = () => screen.getByRole('link', { name: 'Title a' }).closest('[style]');

describe('PhotoGrid', () => {
	it('shows an empty state with no photos', () => {
		render(PhotoGrid, { props: { photos: [], columns: 3, spacing: 0, linkTo: '/photo' } });
		expect(screen.getByText('No photos available')).toBeInTheDocument();
	});

	it('renders one link per photo, pointing at the right url', () => {
		render(PhotoGrid, { props: { photos, columns: 3, spacing: 0, linkTo: '/photo' } });

		const links = screen.getAllByRole('link');
		expect(links).toHaveLength(3);
		expect(links[0]).toHaveAttribute('href', '/photo/a');
		expect(links[2]).toHaveAttribute('href', '/photo/c');
	});

	it('uses the thumbnail and the title as alt text', () => {
		render(PhotoGrid, { props: { photos, columns: 3, spacing: 0, linkTo: '/photo' } });

		const img = screen.getByAltText('Title a');
		expect(img).toHaveAttribute('src', '/api/thumbs/a.jpg');
		expect(img).toHaveAttribute('loading', 'lazy');
	});

	it('falls back to the filename when a photo has no title', () => {
		render(PhotoGrid, {
			props: { photos: [photo('x', { title: '' })], columns: 3, spacing: 0, linkTo: '/photo' }
		});
		expect(screen.getByAltText('x.jpg')).toBeInTheDocument();
	});

	describe('layout', () => {
		it('lays out the requested number of columns', () => {
			render(PhotoGrid, { props: { photos, columns: 4, spacing: 0, linkTo: '/photo' } });
			expect(gridStyle()?.getAttribute('style')).toContain('repeat(4, minmax(0, 1fr))');
		});

		it('spaces tiles in pixels', () => {
			// mphotos-web treated the config value as px; the Next port rendered
			// `spacing * 0.1rem`, so "Thin" (5) came out at 8px.
			render(PhotoGrid, { props: { photos, columns: 3, spacing: 10, linkTo: '/photo' } });
			expect(gridStyle()?.getAttribute('style')).toContain('gap: 10px');
		});

		it('supports a zero gap', () => {
			render(PhotoGrid, { props: { photos, columns: 3, spacing: 0, linkTo: '/photo' } });
			expect(gridStyle()?.getAttribute('style')).toContain('gap: 0px');
		});
	});

	describe('dimming', () => {
		it('dims only the photos the caller marks', () => {
			render(PhotoGrid, {
				props: {
					photos,
					columns: 3,
					spacing: 0,
					linkTo: '/photo',
					dimPhoto: (p: PhotoMetadata) => p.id === 'b'
				}
			});

			expect(screen.getByAltText('Title b').className).toContain('opacity-25');
			expect(screen.getByAltText('Title a').className).toContain('opacity-100');
		});

		it('dims nothing without a dimPhoto', () => {
			render(PhotoGrid, { props: { photos, columns: 3, spacing: 0, linkTo: '/photo' } });
			expect(screen.getByAltText('Title a').className).toContain('opacity-100');
		});
	});

	describe('overlay', () => {
		it('renders nothing extra when no overlay is passed', () => {
			render(PhotoGrid, { props: { photos, columns: 3, spacing: 0, linkTo: '/photo' } });
			expect(screen.queryByRole('button')).toBeNull();
		});

		it('renders the overlay per tile with the photo and its index', () => {
			render(PhotoGrid, { props: { photos, columns: 3, spacing: 0, linkTo: '/photo', overlay } });

			// The index comes from the {#each}; callers no longer need findIndex per cell.
			expect(screen.getByRole('button', { name: 'toggle a @ 0' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'toggle c @ 2' })).toBeInTheDocument();
		});

		it('keeps overlay buttons outside the anchor', () => {
			// A <button> inside an <a> is invalid HTML. The React original nested them and
			// relied on preventDefault; here they're siblings.
			render(PhotoGrid, { props: { photos, columns: 3, spacing: 0, linkTo: '/photo', overlay } });

			const link = screen.getByRole('link', { name: 'Title a' });
			const button = screen.getByRole('button', { name: 'toggle a @ 0' });
			expect(link).not.toContainElement(button);
		});

		it('does not swallow clicks on the overlay button', () => {
			const onclick = vi.fn();
			const clickable = createRawSnippet(() => ({
				render: () => `<button data-testid="ov">x</button>`,
				setup: (node: Element) => {
					node.addEventListener('click', onclick);
				}
			}));
			render(PhotoGrid, {
				props: {
					photos: [photo('a')],
					columns: 3,
					spacing: 0,
					linkTo: '/photo',
					overlay: clickable
				}
			});

			screen.getByTestId('ov').click();

			expect(onclick).toHaveBeenCalledOnce();
		});
	});
});
