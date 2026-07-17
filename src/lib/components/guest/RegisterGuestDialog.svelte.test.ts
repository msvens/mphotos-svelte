import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { guestsService } from '$lib/api/services';
import type { Guest } from '$lib/api/types';
import RegisterGuestDialog from './RegisterGuestDialog.svelte';

vi.mock('$lib/api/services', () => ({
	guestsService: { registerGuest: vi.fn(), updateGuest: vi.fn() }
}));

const guest: Guest = { name: 'Martin', email: 'm@example.com', verified: false, verifyTime: '' };

const ok = () => screen.getByRole('button', { name: 'OK' });

beforeEach(() => {
	vi.mocked(guestsService.registerGuest).mockReset().mockResolvedValue(guest);
	vi.mocked(guestsService.updateGuest)
		.mockReset()
		.mockResolvedValue({ ...guest, name: 'New' });
});

describe('RegisterGuestDialog', () => {
	describe('the form', () => {
		it('opens on the registration form', () => {
			render(RegisterGuestDialog, { props: { onClose: vi.fn() } });

			expect(screen.getByRole('heading', { name: 'Register User' })).toBeInTheDocument();
			expect(screen.getByLabelText('Name')).toBeInTheDocument();
			expect(screen.getByLabelText('Email')).toBeInTheDocument();
		});

		it('seeds the fields from the initial values', () => {
			render(RegisterGuestDialog, {
				props: { onClose: vi.fn(), initialName: 'Martin', initialEmail: 'm@example.com' }
			});

			expect(screen.getByLabelText('Name')).toHaveValue('Martin');
			expect(screen.getByLabelText('Email')).toHaveValue('m@example.com');
		});

		it('cancels without registering', async () => {
			const onClose = vi.fn();
			render(RegisterGuestDialog, { props: { onClose } });

			await fireEvent.click(screen.getByRole('button', { name: 'CANCEL' }));

			expect(onClose).toHaveBeenCalled();
			expect(guestsService.registerGuest).not.toHaveBeenCalled();
		});
	});

	describe('registering', () => {
		it('submits what was typed', async () => {
			render(RegisterGuestDialog, { props: { onClose: vi.fn() } });

			await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Martin' } });
			await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'm@example.com' } });
			await fireEvent.click(ok());

			await vi.waitFor(() =>
				expect(guestsService.registerGuest).toHaveBeenCalledWith({
					name: 'Martin',
					email: 'm@example.com'
				})
			);
		});

		it('asks the guest to check their email', async () => {
			render(RegisterGuestDialog, { props: { onClose: vi.fn() } });

			await fireEvent.click(ok());

			expect(await screen.findByRole('heading', { name: 'Check Your Email' })).toBeInTheDocument();
			expect(screen.getByText(/Thank you for registering, Martin/)).toBeInTheDocument();
			expect(screen.getByText('m@example.com')).toBeInTheDocument();
		});

		it('stays open on success so the message can be read', async () => {
			const onClose = vi.fn();
			render(RegisterGuestDialog, { props: { onClose } });

			await fireEvent.click(ok());

			await screen.findByRole('heading', { name: 'Check Your Email' });
			expect(onClose).not.toHaveBeenCalled();
		});
	});

	describe('updating', () => {
		it('locks the email and calls updateGuest', async () => {
			render(RegisterGuestDialog, {
				props: { onClose: vi.fn(), isUpdate: true, initialEmail: 'm@example.com' }
			});

			expect(screen.getByRole('heading', { name: 'Update User' })).toBeInTheDocument();
			expect(screen.getByLabelText('Email')).toBeDisabled();

			await fireEvent.click(ok());

			await vi.waitFor(() => expect(guestsService.updateGuest).toHaveBeenCalled());
			expect(guestsService.registerGuest).not.toHaveBeenCalled();
			expect(await screen.findByRole('heading', { name: 'Guest Updated' })).toBeInTheDocument();
		});
	});

	describe('errors', () => {
		it('shows the failure message', async () => {
			vi.mocked(guestsService.registerGuest).mockRejectedValue(new Error('Email already taken'));
			render(RegisterGuestDialog, { props: { onClose: vi.fn() } });

			await fireEvent.click(ok());

			expect(await screen.findByRole('heading', { name: 'Error' })).toBeInTheDocument();
			expect(screen.getByText('Email already taken')).toBeInTheDocument();
		});

		it('falls back to the form rather than closing', async () => {
			vi.mocked(guestsService.registerGuest).mockRejectedValue(new Error('nope'));
			const onClose = vi.fn();
			render(RegisterGuestDialog, { props: { onClose } });
			await fireEvent.click(ok());
			await screen.findByRole('heading', { name: 'Error' });

			await fireEvent.click(screen.getByRole('button', { name: 'Close' }));

			expect(await screen.findByRole('heading', { name: 'Register User' })).toBeInTheDocument();
			expect(onClose).not.toHaveBeenCalled();
		});

		it('restores the initial values after a failure', async () => {
			vi.mocked(guestsService.registerGuest).mockRejectedValue(new Error('nope'));
			render(RegisterGuestDialog, {
				props: { onClose: vi.fn(), initialName: 'Martin', initialEmail: 'm@example.com' }
			});
			await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Typo' } });

			await fireEvent.click(ok());
			await screen.findByRole('heading', { name: 'Error' });
			await fireEvent.click(screen.getByRole('button', { name: 'Close' }));

			expect(screen.getByLabelText('Name')).toHaveValue('Martin');
		});

		it('copes with a non-Error rejection', async () => {
			vi.mocked(guestsService.registerGuest).mockRejectedValue('just a string');
			render(RegisterGuestDialog, { props: { onClose: vi.fn() } });

			await fireEvent.click(ok());

			expect(await screen.findByText('Unknown error occurred')).toBeInTheDocument();
		});
	});
});
