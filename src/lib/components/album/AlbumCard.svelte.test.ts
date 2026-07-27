import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { PhotoOrder, type Album } from '$lib/api/types';
import AlbumCard from './AlbumCard.svelte';

function album(over: Partial<Album> = {}): Album {
	return {
		id: 'a1',
		name: 'Summer',
		description: 'Warm days',
		coverPic: '/api/covers/a1.jpg',
		code: '',
		orderBy: PhotoOrder.None,
		...over
	};
}

describe('AlbumCard', () => {
	it('shows the name, description and cover', () => {
		render(AlbumCard, { props: { album: album() } });

		expect(screen.getByRole('heading', { name: 'Summer' })).toBeInTheDocument();
		expect(screen.getByText('Warm days')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: 'Summer' })).toHaveAttribute(
			'src',
			'/api/covers/a1.jpg'
		);
	});

	it('links to the album without a code when public', () => {
		render(AlbumCard, { props: { album: album() } });
		expect(screen.getByRole('link')).toHaveAttribute('href', '/album/a1');
	});

	it('carries the access code in the link when private', () => {
		render(AlbumCard, { props: { album: album({ code: 'se cret' }) } });
		expect(screen.getByRole('link')).toHaveAttribute('href', '/album/a1?code=se%20cret');
	});

	it('falls back to the placeholder when no cover is set', () => {
		render(AlbumCard, { props: { album: album({ coverPic: '' }) } });
		expect(screen.getByRole('img', { name: 'Summer' })).toHaveAttribute('src', '/photo-album.jpg');
	});

	it('falls back to the placeholder when the cover fails to load', async () => {
		render(AlbumCard, { props: { album: album() } });
		const img = screen.getByRole('img', { name: 'Summer' });

		await fireEvent.error(img);

		expect(img).toHaveAttribute('src', '/photo-album.jpg');
	});
});
