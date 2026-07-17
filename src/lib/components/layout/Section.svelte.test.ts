import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Section from './Section.svelte';

function textSnippet(text: string) {
	return createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));
}

describe('Section', () => {
	it('renders its children', () => {
		render(Section, { props: { children: textSnippet('content') } });
		expect(screen.getByText('content')).toBeInTheDocument();
	});

	it('has no divider by default', () => {
		render(Section, { props: { children: textSnippet('content') } });
		expect(screen.queryByRole('separator')).toBeNull();
	});

	it('renders a divider when asked', () => {
		render(Section, { props: { children: textSnippet('content'), showDivider: true } });
		expect(screen.getByRole('separator')).toBeInTheDocument();
	});

	it.each([
		['sm', 'mb-4'],
		['md', 'mb-8'],
		['lg', 'mb-12'],
		['xl', 'mb-16']
	])('spacing %s applies %s', (spacing, expected) => {
		const { container } = render(Section, {
			props: { children: textSnippet('c'), spacing: spacing as 'sm' | 'md' | 'lg' | 'xl' }
		});
		expect(container.querySelector('div')?.className).toContain(expected);
	});

	it('defaults to md spacing', () => {
		const { container } = render(Section, { props: { children: textSnippet('c') } });
		expect(container.querySelector('div')?.className).toContain('mb-8');
	});

	it("matches the divider's top margin to the section spacing", () => {
		render(Section, { props: { children: textSnippet('c'), spacing: 'lg', showDivider: true } });
		// lg → mt-12 → 3rem
		expect(screen.getByRole('separator')).toHaveStyle({ marginTop: '3rem', marginBottom: '0rem' });
	});

	it('passes through extra classes', () => {
		const { container } = render(Section, {
			props: { children: textSnippet('c'), class: 'text-center' }
		});
		expect(container.querySelector('div')?.className).toContain('text-center');
	});
});
