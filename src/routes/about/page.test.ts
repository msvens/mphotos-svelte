import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import About from './+page.svelte';

describe('about page', () => {
	it('renders the content sections', () => {
		render(About);
		expect(screen.getByRole('heading', { name: 'Technical Detail' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Mellowtech' })).toBeInTheDocument();
	});

	it('links to the external resume in a new tab', () => {
		render(About);
		const resume = screen.getByRole('link', { name: 'resume.msvens.com' });
		expect(resume).toHaveAttribute('href', 'https://resume.msvens.com/');
		expect(resume).toHaveAttribute('target', '_blank');
	});

	it('points at the Svelte frontend repo, not the old React one', () => {
		render(About);
		expect(screen.getByRole('link', { name: 'mphotos-svelte' })).toHaveAttribute(
			'href',
			'https://github.com/msvens/mphotos-svelte'
		);
		expect(screen.queryByRole('link', { name: 'mphotos-ui' })).toBeNull();
	});
});
