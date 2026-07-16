import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { authService, userService } from '$lib/api/services';
import { AppState, defaultUXConfig } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { User } from '$lib/api/types';
import Profile from './Profile.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { updateUser: vi.fn(), getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() }
}));

const savedUser: User = { name: 'Martin', bio: 'Photographer', pic: '/me.jpg' };

/** An AppState already populated, as it would be behind the page's loading gate. */
function loggedInState(user: Partial<User> = {}): AppState {
	const state = new AppState();
	state.user = { ...savedUser, ...user };
	state.isUser = true;
	state.loading = false;
	return state;
}

beforeEach(() => {
	vi.mocked(userService.updateUser).mockReset().mockResolvedValue(savedUser);
	vi.mocked(authService.isLoggedIn).mockResolvedValue(true);
	vi.mocked(userService.getUser).mockResolvedValue(savedUser);
	vi.mocked(userService.getUserConfig).mockResolvedValue(defaultUXConfig);
});

describe('Profile', () => {
	it('prefills the fields from the saved user', () => {
		renderWithApp(Profile, { state: loggedInState() });

		expect(screen.getByLabelText('Name')).toHaveValue('Martin');
		expect(screen.getByLabelText('Bio')).toHaveValue('Photographer');
		expect(screen.getByLabelText('Profile Picture')).toHaveValue('/me.jpg');
	});

	it('submits the edited values and toasts success', async () => {
		const { toast } = renderWithApp(Profile, { state: loggedInState() });

		await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'New Name' } });
		await fireEvent.input(screen.getByLabelText('Bio'), { target: { value: 'New bio' } });
		screen.getByRole('button', { name: 'UPDATE PROFILE' }).click();
		await vi.waitFor(() => expect(userService.updateUser).toHaveBeenCalled());

		expect(userService.updateUser).toHaveBeenCalledWith('New Name', 'New bio', '/me.jpg');
		await vi.waitFor(() => expect(toast.toasts).toHaveLength(1));
		expect(toast.toasts[0]).toMatchObject({
			severity: 'success',
			message: 'Profile updated successfully'
		});
	});

	it('refreshes auth after a successful update', async () => {
		renderWithApp(Profile, { state: loggedInState() });

		screen.getByRole('button', { name: 'UPDATE PROFILE' }).click();

		await vi.waitFor(() => expect(authService.isLoggedIn).toHaveBeenCalled());
	});

	it('toasts an error when the update fails', async () => {
		vi.mocked(userService.updateUser).mockRejectedValue(new Error('nope'));
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const { toast } = renderWithApp(Profile, { state: loggedInState() });

		screen.getByRole('button', { name: 'UPDATE PROFILE' }).click();

		await vi.waitFor(() => expect(toast.toasts).toHaveLength(1));
		expect(toast.toasts[0]).toMatchObject({
			severity: 'error',
			message: 'Failed to update profile'
		});
	});

	it('shows the fallback icon when there is no saved picture', () => {
		renderWithApp(Profile, { state: loggedInState({ pic: '' }) });

		expect(screen.queryByAltText('Profile preview')).toBeNull();
	});

	it('warns and falls back when the saved picture fails to load', async () => {
		renderWithApp(Profile, { state: loggedInState() });

		await fireEvent.error(screen.getByAltText('Profile preview'));

		expect(screen.getByText(/picture is broken/)).toBeInTheDocument();
		expect(screen.queryByAltText('Profile preview')).toBeNull();
	});

	it('clears the broken-picture warning when the saved picture changes', async () => {
		const state = loggedInState();
		renderWithApp(Profile, { state });

		await fireEvent.error(screen.getByAltText('Profile preview'));
		expect(screen.getByText(/picture is broken/)).toBeInTheDocument();

		// No remount: the error is derived from the current URL, so pointing the user at a
		// different picture clears it on its own.
		state.user = { ...state.user, pic: '/other.jpg' };
		await tick();

		expect(screen.queryByText(/picture is broken/)).toBeNull();
		expect(screen.getByAltText('Profile preview')).toHaveAttribute('src', '/other.jpg');
	});
});
