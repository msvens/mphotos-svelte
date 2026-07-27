import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { PhotoOrder, type Album } from '$lib/api/types';
import AlbumEditDialog from './AlbumEditDialog.svelte';

const album: Album = {
	id: 'a1',
	name: 'Old name',
	description: 'Old desc',
	coverPic: '/c.jpg',
	code: 'c0',
	orderBy: PhotoOrder.UploadDate
};

describe('AlbumEditDialog', () => {
	it('seeds the form from the album and marks a coded album hidden', () => {
		render(AlbumEditDialog, { props: { open: true, album, onClose: vi.fn() } });
		expect(screen.getByLabelText('Name')).toHaveValue('Old name');
		expect(screen.getByRole('checkbox', { name: /hidden/i })).toBeChecked();
		expect(screen.getByLabelText('Share code')).toHaveValue('c0');
	});

	it('clears the code when unhidden, republishing the album', async () => {
		const onClose = vi.fn();
		render(AlbumEditDialog, { props: { open: true, album, onClose } });

		await fireEvent.click(screen.getByRole('checkbox', { name: /hidden/i }));
		await fireEvent.click(screen.getByRole('button', { name: 'OK' }));

		expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ code: '' }));
		expect(screen.queryByLabelText('Share code')).toBeNull();
	});

	it('returns the edited album on OK, preserving id and cover', async () => {
		const onClose = vi.fn();
		render(AlbumEditDialog, { props: { open: true, album, onClose } });

		await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'New name' } });
		await fireEvent.click(screen.getByRole('button', { name: 'OK' }));

		expect(onClose).toHaveBeenCalledWith({
			...album,
			name: 'New name',
			description: 'Old desc',
			code: 'c0',
			orderBy: PhotoOrder.UploadDate
		});
	});

	it('returns undefined on cancel', async () => {
		const onClose = vi.fn();
		render(AlbumEditDialog, { props: { open: true, album, onClose } });

		await fireEvent.click(screen.getByRole('button', { name: 'CANCEL' }));

		expect(onClose).toHaveBeenCalledWith(undefined);
	});
});
