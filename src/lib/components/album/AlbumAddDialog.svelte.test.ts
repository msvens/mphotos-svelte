import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { PhotoOrder } from '$lib/api/types';
import AlbumAddDialog from './AlbumAddDialog.svelte';

describe('AlbumAddDialog', () => {
	it('hides the code field until the album is marked hidden', async () => {
		render(AlbumAddDialog, { props: { open: true, onClose: vi.fn() } });
		expect(screen.queryByLabelText('Share code')).toBeNull();

		await fireEvent.click(screen.getByRole('checkbox', { name: /hidden/i }));

		const codeField = screen.getByLabelText('Share code');
		expect(codeField).toBeInTheDocument();
		// A code is prefilled so the owner doesn't have to invent one.
		expect((codeField as HTMLInputElement).value).not.toBe('');
	});

	it('returns a public album (no code) when not hidden', async () => {
		const onClose = vi.fn();
		render(AlbumAddDialog, { props: { open: true, onClose } });

		await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Trip' } });
		await fireEvent.input(screen.getByLabelText('Description'), { target: { value: 'Summer' } });
		await fireEvent.click(screen.getByRole('button', { name: 'ADD' }));

		expect(onClose).toHaveBeenCalledWith({
			name: 'Trip',
			description: 'Summer',
			code: '',
			orderBy: PhotoOrder.None,
			coverPic: ''
		});
	});

	it('returns the entered code when hidden', async () => {
		const onClose = vi.fn();
		render(AlbumAddDialog, { props: { open: true, onClose } });

		await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Trip' } });
		await fireEvent.click(screen.getByRole('checkbox', { name: /hidden/i }));
		await fireEvent.input(screen.getByLabelText('Share code'), { target: { value: 'xyz' } });
		await fireEvent.click(screen.getByRole('button', { name: 'ADD' }));

		expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ name: 'Trip', code: 'xyz' }));
	});

	it('returns undefined on cancel', async () => {
		const onClose = vi.fn();
		render(AlbumAddDialog, { props: { open: true, onClose } });

		await fireEvent.click(screen.getByRole('button', { name: 'CANCEL' }));

		expect(onClose).toHaveBeenCalledWith(undefined);
	});
});
