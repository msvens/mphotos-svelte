import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Select, { type SelectOption } from './Select.svelte';

const spacings: SelectOption[] = [
	{ value: '0', label: 'None' },
	{ value: '5', label: 'Thin' },
	{ value: '10', label: 'Normal' },
	{ value: '15', label: 'Thick' }
];

const trigger = () => screen.getByRole('combobox');
const activeOptionId = () => trigger().getAttribute('aria-activedescendant');

function open() {
	return fireEvent.click(trigger());
}

describe('Select', () => {
	describe('display', () => {
		it('shows the label of the selected option', () => {
			render(Select, { props: { options: spacings, value: '10' } });
			expect(trigger()).toHaveTextContent('Normal');
		});

		it('shows the placeholder when the value matches no option', () => {
			// This is exactly how the photoGridSpacing:1 default surfaced — the control
			// looks unset rather than wrong.
			render(Select, { props: { options: spacings, value: '1', placeholder: 'Select...' } });
			expect(trigger()).toHaveTextContent('Select...');
		});

		it('shows the placeholder when there is no value', () => {
			render(Select, { props: { options: spacings, placeholder: 'Select an album...' } });
			expect(trigger()).toHaveTextContent('Select an album...');
		});

		it('is labelled by its label', () => {
			render(Select, { props: { options: spacings, label: 'Grid Spacing', value: '0' } });
			expect(screen.getByRole('combobox', { name: /Grid Spacing/ })).toBeInTheDocument();
		});
	});

	describe('opening and closing', () => {
		it('starts closed', () => {
			render(Select, { props: { options: spacings } });
			expect(trigger()).toHaveAttribute('aria-expanded', 'false');
			expect(screen.queryByRole('listbox')).toBeNull();
		});

		it('opens on click and exposes the options', async () => {
			render(Select, { props: { options: spacings } });

			await open();

			expect(trigger()).toHaveAttribute('aria-expanded', 'true');
			expect(screen.getByRole('listbox')).toBeInTheDocument();
			expect(screen.getAllByRole('option')).toHaveLength(4);
		});

		it('closes on a second click', async () => {
			render(Select, { props: { options: spacings } });

			await open();
			await open();

			expect(trigger()).toHaveAttribute('aria-expanded', 'false');
		});

		it('closes on an outside mousedown', async () => {
			render(Select, { props: { options: spacings } });
			await open();

			await fireEvent.mouseDown(document.body);

			expect(trigger()).toHaveAttribute('aria-expanded', 'false');
		});

		it('stays open on a mousedown inside', async () => {
			render(Select, { props: { options: spacings } });
			await open();

			await fireEvent.mouseDown(screen.getByRole('listbox'));

			expect(trigger()).toHaveAttribute('aria-expanded', 'true');
		});

		it('shows an empty state when there are no options', async () => {
			render(Select, { props: { options: [] } });

			await open();

			expect(screen.getByText('No options available')).toBeInTheDocument();
			expect(screen.queryAllByRole('option')).toHaveLength(0);
		});
	});

	describe('selection', () => {
		it('marks the selected option', async () => {
			render(Select, { props: { options: spacings, value: '5' } });
			await open();

			expect(screen.getByRole('option', { name: 'Thin' })).toHaveAttribute('aria-selected', 'true');
			expect(screen.getByRole('option', { name: 'None' })).toHaveAttribute(
				'aria-selected',
				'false'
			);
		});

		it('selects on click, closes, and reports the value', async () => {
			const onChange = vi.fn();
			render(Select, { props: { options: spacings, value: '0', onChange } });
			await open();

			await fireEvent.click(screen.getByRole('option', { name: 'Thick' }));

			expect(onChange).toHaveBeenCalledWith('15');
			expect(trigger()).toHaveTextContent('Thick');
			expect(trigger()).toHaveAttribute('aria-expanded', 'false');
		});

		it('works without an onChange', async () => {
			render(Select, { props: { options: spacings, value: '0' } });
			await open();

			await fireEvent.click(screen.getByRole('option', { name: 'Normal' }));

			expect(trigger()).toHaveTextContent('Normal');
		});
	});

	describe('keyboard', () => {
		it('opens on ArrowDown, seeding the active option to the selected one', async () => {
			render(Select, { props: { options: spacings, value: '10' } });

			await fireEvent.keyDown(trigger(), { key: 'ArrowDown' });

			expect(trigger()).toHaveAttribute('aria-expanded', 'true');
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'Normal' }).id);
		});

		it('seeds the active option to the first when nothing is selected', async () => {
			render(Select, { props: { options: spacings } });

			await fireEvent.keyDown(trigger(), { key: 'ArrowDown' });

			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'None' }).id);
		});

		it('ArrowDown and ArrowUp move the active option', async () => {
			render(Select, { props: { options: spacings, value: '0' } });
			await open();

			await fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'Thin' }).id);

			await fireEvent.keyDown(trigger(), { key: 'ArrowUp' });
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'None' }).id);
		});

		it('clamps rather than wraps at the ends', async () => {
			render(Select, { props: { options: spacings, value: '0' } });
			await open();

			await fireEvent.keyDown(trigger(), { key: 'ArrowUp' });
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'None' }).id);

			await fireEvent.keyDown(trigger(), { key: 'End' });
			await fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'Thick' }).id);
		});

		it('Home and End jump to the ends', async () => {
			render(Select, { props: { options: spacings, value: '5' } });
			await open();

			await fireEvent.keyDown(trigger(), { key: 'End' });
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'Thick' }).id);

			await fireEvent.keyDown(trigger(), { key: 'Home' });
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'None' }).id);
		});

		it('Enter commits the active option', async () => {
			const onChange = vi.fn();
			render(Select, { props: { options: spacings, value: '0', onChange } });
			await open();

			await fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
			await fireEvent.keyDown(trigger(), { key: 'Enter' });

			expect(onChange).toHaveBeenCalledWith('5');
			expect(trigger()).toHaveTextContent('Thin');
			expect(trigger()).toHaveAttribute('aria-expanded', 'false');
		});

		it('Space commits the active option', async () => {
			render(Select, { props: { options: spacings, value: '0' } });
			await open();

			await fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
			await fireEvent.keyDown(trigger(), { key: ' ' });

			expect(trigger()).toHaveTextContent('Thin');
		});

		it('Escape closes without committing', async () => {
			const onChange = vi.fn();
			render(Select, { props: { options: spacings, value: '0', onChange } });
			await open();
			await fireEvent.keyDown(trigger(), { key: 'ArrowDown' });

			await fireEvent.keyDown(trigger(), { key: 'Escape' });

			expect(trigger()).toHaveAttribute('aria-expanded', 'false');
			expect(onChange).not.toHaveBeenCalled();
			expect(trigger()).toHaveTextContent('None');
		});

		it('Tab closes the list', async () => {
			render(Select, { props: { options: spacings } });
			await open();

			await fireEvent.keyDown(trigger(), { key: 'Tab' });

			expect(trigger()).toHaveAttribute('aria-expanded', 'false');
		});

		it('drops aria-activedescendant when closed', async () => {
			render(Select, { props: { options: spacings, value: '0' } });
			await open();
			expect(activeOptionId()).toBeTruthy();

			await fireEvent.keyDown(trigger(), { key: 'Escape' });

			expect(activeOptionId()).toBeNull();
		});
	});
});
