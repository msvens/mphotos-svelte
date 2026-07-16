import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import { renderWithApp } from '$lib/test-utils';
import Navbar from './Navbar.svelte';

// Navbar reads the current path from $app/state; provide a stub on the home page.
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/') } }));

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
});
