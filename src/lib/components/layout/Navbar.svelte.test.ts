import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import Navbar from './Navbar.svelte';

// Navbar reads the current path from $app/state; provide a stub on the home page.
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/') } }));

function denseState(dense: boolean): AppState {
	const s = new AppState();
	s.uxConfig = { ...s.uxConfig, denseTopBar: dense };
	return s;
}

describe('Navbar', () => {
	it('renders the brand and a link to every destination', () => {
		renderWithApp(Navbar);

		expect(screen.getByText('Mellowtech')).toBeInTheDocument();
		expect(screen.getByText('Photos')).toBeInTheDocument();

		const hrefs = screen
			.getAllByRole('link')
			.map((a) => a.getAttribute('href'))
			.filter((h): h is string => h !== null);
		for (const href of ['/', '/photo', '/album', '/camera', '/guest']) {
			expect(hrefs).toContain(href);
		}
	});

	it('anchors the mobile drawer to the real navbar height', () => {
		// The drawer stays fixed, so it reads --nav-height rather than hardcoding a value.
		const { container } = renderWithApp(Navbar);
		const drawer = container.querySelector('.md\\:hidden.fixed');

		expect(drawer?.className).toContain('top-[var(--nav-height)]');
		expect(drawer?.className).toContain('h-[calc(100dvh-var(--nav-height))]');
	});

	it('sizes the desktop nav icons to fill the row', () => {
		// 'nav' = 48px button, fills the h-12 row so the hover circle stays inside the bar.
		renderWithApp(Navbar, { state: denseState(false) });

		const homeButton = screen.getByRole('button', { name: 'Home' });
		expect(homeButton.className).toContain('w-12');
		expect(homeButton.className).toContain('h-12');
	});

	it('uses the smaller icon size in dense mode', () => {
		renderWithApp(Navbar, { state: denseState(true) });

		const homeButton = screen.getByRole('button', { name: 'Home' });
		expect(homeButton.className).toContain('w-10');
		expect(homeButton.className).toContain('h-10');
	});
});
