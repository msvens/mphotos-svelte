import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Button from './Button.svelte';

// A minimal text snippet to use as Button children.
function textSnippet(text: string) {
	return createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));
}

describe('Button', () => {
	it('renders an anchor when href is set', () => {
		render(Button, { props: { href: '/account', children: textSnippet('Account') } });
		const link = screen.getByRole('link', { name: 'Account' });
		expect(link).toHaveAttribute('href', '/account');
	});

	it('renders a button element when no href', () => {
		render(Button, { props: { children: textSnippet('Save') } });
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
		expect(screen.queryByRole('link')).toBeNull();
	});

	it('applies outlined variant classes', () => {
		render(Button, { props: { variant: 'outlined', children: textSnippet('Edit') } });
		expect(screen.getByRole('button', { name: 'Edit' }).className).toContain('border');
	});
});
