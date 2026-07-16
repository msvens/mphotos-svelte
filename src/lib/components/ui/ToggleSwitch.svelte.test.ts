import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ToggleSwitch from './ToggleSwitch.svelte';

describe('ToggleSwitch', () => {
	it('renders a real checkbox associated with its label', () => {
		render(ToggleSwitch, { props: { label: 'Show Bio' } });

		const input = screen.getByLabelText('Show Bio');
		expect(input).toBeInstanceOf(HTMLInputElement);
		expect(input).toHaveAttribute('type', 'checkbox');
	});

	it('reflects the checked prop', () => {
		render(ToggleSwitch, { props: { label: 'Show Bio', checked: true } });
		expect(screen.getByLabelText('Show Bio')).toBeChecked();
	});

	it('toggles when the label text is clicked', async () => {
		// The React original put its click handler on the track div only, so clicking the
		// text did nothing. A real input inside a <label> fixes that.
		render(ToggleSwitch, { props: { label: 'Show Bio', checked: false } });

		await fireEvent.click(screen.getByText('Show Bio'));

		expect(screen.getByLabelText('Show Bio')).toBeChecked();
	});

	it('toggles on click and back again', async () => {
		render(ToggleSwitch, { props: { label: 'Dense Topbar', checked: false } });
		const input = screen.getByLabelText('Dense Topbar');

		await fireEvent.click(input);
		expect(input).toBeChecked();

		await fireEvent.click(input);
		expect(input).not.toBeChecked();
	});

	it('is focusable, so it can be reached and toggled by keyboard', () => {
		// The div-based original had no focusable control at all. Space-to-toggle is the
		// browser's job for a real checkbox; what the port must guarantee is that one exists
		// and can take focus.
		render(ToggleSwitch, { props: { label: 'Dense Topbar' } });
		const input = screen.getByLabelText('Dense Topbar') as HTMLInputElement;

		input.focus();

		expect(input).toHaveFocus();
	});

	it('marks the input disabled', () => {
		// Browsers don't dispatch click on a disabled control; fireEvent bypasses that, so
		// asserting the attribute is the meaningful check here.
		render(ToggleSwitch, { props: { label: 'Show Bio', disabled: true } });
		expect(screen.getByLabelText('Show Bio')).toBeDisabled();
	});

	it('renders without a label', () => {
		render(ToggleSwitch, { props: { checked: true } });
		expect(screen.getByRole('checkbox')).toBeChecked();
	});
});
