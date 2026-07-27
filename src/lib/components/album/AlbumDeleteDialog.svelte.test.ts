import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { PhotoOrder, type Album } from '$lib/api/types';
import AlbumDeleteDialog from './AlbumDeleteDialog.svelte';

const album: Album = {
	id: 'a1',
	name: 'Trip',
	description: '',
	coverPic: '',
	code: '',
	orderBy: PhotoOrder.None
};

describe('AlbumDeleteDialog', () => {
	it('returns the album on DELETE', async () => {
		const onClose = vi.fn();
		render(AlbumDeleteDialog, { props: { open: true, album, onClose } });

		await fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

		expect(onClose).toHaveBeenCalledWith(album);
	});

	it('returns undefined on cancel', async () => {
		const onClose = vi.fn();
		render(AlbumDeleteDialog, { props: { open: true, album, onClose } });

		await fireEvent.click(screen.getByRole('button', { name: 'CANCEL' }));

		expect(onClose).toHaveBeenCalledWith(undefined);
	});
});
