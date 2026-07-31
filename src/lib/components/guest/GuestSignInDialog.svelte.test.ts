import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { guestsService } from '$lib/api/services';
import { ApiError } from '$lib/api/client';
import type { Guest } from '$lib/api/types';
import GuestSignInDialog from './GuestSignInDialog.svelte';

vi.mock('$lib/api/services', () => ({
	guestsService: { loginGuest: vi.fn(), loginVerifyGuest: vi.fn(), registerGuest: vi.fn() }
}));

const guest: Guest = {
	email: 'a@b.c',
	name: 'Ada',
	fullName: '',
	description: '',
	verified: true,
	verifyTime: ''
};

beforeEach(() => {
	vi.mocked(guestsService.loginGuest)
		.mockReset()
		.mockResolvedValue({ message: 'if that email is registered, a login code has been sent' });
	vi.mocked(guestsService.loginVerifyGuest).mockReset().mockResolvedValue(guest);
	vi.mocked(guestsService.registerGuest).mockReset().mockResolvedValue(guest);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GuestSignInDialog', () => {
	it('logs in with an email then a 6-digit code', async () => {
		const onClose = vi.fn();
		render(GuestSignInDialog, { props: { onClose } });

		await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'a@b.c' } });
		await fireEvent.click(screen.getByRole('button', { name: 'SEND CODE' }));

		await vi.waitFor(() => expect(guestsService.loginGuest).toHaveBeenCalledWith('a@b.c'));
		await fireEvent.input(await screen.findByLabelText('6-digit code'), {
			target: { value: '123456' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'LOG IN' }));

		await vi.waitFor(() =>
			expect(guestsService.loginVerifyGuest).toHaveBeenCalledWith('a@b.c', '123456')
		);
		expect(onClose).toHaveBeenCalledWith(true);
	});

	it('shows an error for a bad code and stays open', async () => {
		vi.mocked(guestsService.loginVerifyGuest).mockRejectedValue(
			new ApiError(401, 'invalid email or code')
		);
		const onClose = vi.fn();
		render(GuestSignInDialog, { props: { onClose } });

		await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'a@b.c' } });
		await fireEvent.click(screen.getByRole('button', { name: 'SEND CODE' }));
		await fireEvent.input(await screen.findByLabelText('6-digit code'), {
			target: { value: '000000' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'LOG IN' }));

		expect(await screen.findByText('invalid email or code')).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalledWith(true);
	});

	it('signs up and shows the check-your-email screen', async () => {
		render(GuestSignInDialog, { props: { onClose: vi.fn() } });

		await fireEvent.click(screen.getByRole('button', { name: 'New here? Sign up' }));
		await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'a@b.c' } });
		await fireEvent.input(screen.getByLabelText('Nickname'), { target: { value: 'Ada' } });
		await fireEvent.click(screen.getByRole('button', { name: 'SIGN UP' }));

		await vi.waitFor(() =>
			expect(guestsService.registerGuest).toHaveBeenCalledWith({
				email: 'a@b.c',
				name: 'Ada',
				fullName: '',
				description: ''
			})
		);
		expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
	});
});
