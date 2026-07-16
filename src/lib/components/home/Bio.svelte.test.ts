import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { renderWithApp } from '$lib/test-utils';
import { AppState } from '$lib/stores/app.svelte';
import Bio from './Bio.svelte';

function stateWith(overrides: Partial<AppState>): AppState {
	const s = new AppState();
	Object.assign(s, overrides);
	return s;
}

describe('Bio', () => {
	it('shows the user name and bio', () => {
		const state = stateWith({ user: { name: 'Test User', bio: 'Test bio text', pic: '' } });
		renderWithApp(Bio, { state });
		expect(screen.getByRole('heading', { name: 'Test User' })).toBeInTheDocument();
		expect(screen.getByText('Test bio text')).toBeInTheDocument();
	});

	it('renders the profile image when pic is set', () => {
		const state = stateWith({
			user: { name: 'Test User', bio: '', pic: '/test-pic.jpg' }
		});
		renderWithApp(Bio, { state });
		const img = screen.getByRole('img', { name: 'Test User' });
		expect(img).toHaveAttribute('src', '/test-pic.jpg');
	});

	it('falls back to the ProfileIcon when pic is empty', () => {
		const state = stateWith({ user: { name: 'Test User', bio: '', pic: '' } });
		const { container } = renderWithApp(Bio, { state });
		// no <img>, an inline <svg> placeholder instead
		expect(screen.queryByRole('img')).toBeNull();
		expect(container.querySelector('svg')).not.toBeNull();
	});

	it('shows the Account button only when the owner is logged in', () => {
		const loggedOut = stateWith({ isUser: false, user: { name: 'Test User', bio: '', pic: '' } });
		const { unmount } = renderWithApp(Bio, { state: loggedOut });
		expect(screen.queryByRole('link', { name: 'Account' })).toBeNull();
		unmount();

		const loggedIn = stateWith({ isUser: true, user: { name: 'Test User', bio: '', pic: '' } });
		renderWithApp(Bio, { state: loggedIn });
		const account = screen.getByRole('link', { name: 'Account' });
		expect(account).toHaveAttribute('href', '/account');
	});
});
