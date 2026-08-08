import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { guestsService } from '$lib/api/services';
import type { Guest } from '$lib/api/types';
import GuestProfileDialog from './GuestProfileDialog.svelte';

vi.mock('$lib/api/services', () => ({ guestsService: { updateGuest: vi.fn() } }));

const guest: Guest = {
	guestId: 'g-ada',
	email: 'a@b.c',
	name: 'Ada',
	fullName: 'Ada Lovelace',
	description: 'maths',
	avatar: '',
	verified: true,
	verifyTime: ''
};

beforeEach(() => {
	vi.mocked(guestsService.updateGuest).mockReset().mockResolvedValue(guest);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GuestProfileDialog', () => {
	it('seeds the fields and keeps the email read-only', () => {
		render(GuestProfileDialog, { props: { guest, onClose: vi.fn() } });
		expect(screen.getByLabelText('Nickname')).toHaveValue('Ada');
		expect(screen.getByLabelText('Full name (optional)')).toHaveValue('Ada Lovelace');
		expect(screen.getByLabelText('About you (optional)')).toHaveValue('maths');
		expect(screen.getByLabelText('Email')).toBeDisabled();
	});

	it('saves the profile (name/fullName/description, no email)', async () => {
		const onClose = vi.fn();
		render(GuestProfileDialog, { props: { guest, onClose } });

		await fireEvent.input(screen.getByLabelText('Nickname'), { target: { value: 'Ada2' } });
		await fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));

		await vi.waitFor(() =>
			expect(guestsService.updateGuest).toHaveBeenCalledWith({
				name: 'Ada2',
				fullName: 'Ada Lovelace',
				description: 'maths'
			})
		);
		expect(onClose).toHaveBeenCalledWith(true);
	});
});
