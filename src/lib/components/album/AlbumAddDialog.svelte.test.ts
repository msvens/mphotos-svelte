import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { PhotoOrder } from '$lib/api/types';
import AlbumAddDialog from './AlbumAddDialog.svelte';

describe('AlbumAddDialog', () => {
	it('returns the entered fields on ADD', async () => {
		const onClose = vi.fn();
		render(AlbumAddDialog, { props: { open: true, onClose } });

		await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Trip' } });
		await fireEvent.input(screen.getByLabelText('Description'), { target: { value: 'Summer' } });
		await fireEvent.input(screen.getByLabelText('Code'), { target: { value: 'xyz' } });
		await fireEvent.click(screen.getByRole('button', { name: 'ADD' }));

		expect(onClose).toHaveBeenCalledWith({
			name: 'Trip',
			description: 'Summer',
			code: 'xyz',
			orderBy: PhotoOrder.None,
			coverPic: ''
		});
	});

	it('returns undefined on cancel', async () => {
		const onClose = vi.fn();
		render(AlbumAddDialog, { props: { open: true, onClose } });

		await fireEvent.click(screen.getByRole('button', { name: 'CANCEL' }));

		expect(onClose).toHaveBeenCalledWith(undefined);
	});
});
