import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Checkbox from './Checkbox.svelte';

describe('Checkbox', () => {
	it('renders a labelled checkbox', () => {
		render(Checkbox, { props: { label: 'Hidden' } });
		const box = screen.getByRole('checkbox', { name: 'Hidden' });
		expect(box).toBeInTheDocument();
		expect(box).not.toBeChecked();
	});

	it('reflects the checked prop', () => {
		render(Checkbox, { props: { label: 'Hidden', checked: true } });
		expect(screen.getByRole('checkbox', { name: 'Hidden' })).toBeChecked();
	});

	it('fires onchange with the new state when toggled', async () => {
		const onchange = vi.fn();
		render(Checkbox, { props: { label: 'Hidden', onchange } });

		await fireEvent.click(screen.getByRole('checkbox', { name: 'Hidden' }));

		expect(onchange).toHaveBeenCalledOnce();
		expect(screen.getByRole('checkbox', { name: 'Hidden' })).toBeChecked();
	});

	it('can be disabled via a passthrough attribute', () => {
		render(Checkbox, { props: { label: 'Hidden', disabled: true } });
		expect(screen.getByRole('checkbox', { name: 'Hidden' })).toBeDisabled();
	});
});
