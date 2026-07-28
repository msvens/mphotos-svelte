import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { renderWithApp } from '$lib/test-utils';
import Footer from './Footer.svelte';

describe('Footer', () => {
	it('links to About, Mellowtech.org and Account', () => {
		renderWithApp(Footer);
		expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
		expect(screen.getByRole('link', { name: 'Mellowtech.org' })).toHaveAttribute('href', '/');
		expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');
	});

	it('no longer shows a Resume link', () => {
		renderWithApp(Footer);
		expect(screen.queryByRole('link', { name: 'Resume' })).toBeNull();
	});
});
