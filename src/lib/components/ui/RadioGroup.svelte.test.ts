import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import RadioGroup, { type RadioOption } from './RadioGroup.svelte';

const borders: RadioOption[] = [
	{ value: 'none', label: 'None' },
	{ value: 'left-right', label: 'Left-Right' },
	{ value: 'all', label: 'All' }
];

const themes: RadioOption[] = [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' }
];

describe('RadioGroup', () => {
	it('renders real radios, one per option', () => {
		render(RadioGroup, { props: { options: borders, label: 'Photo Borders' } });

		const radios = screen.getAllByRole('radio');
		expect(radios).toHaveLength(3);
		expect(radios[0]).toHaveAttribute('type', 'radio');
	});

	it('exposes the group and its label to assistive tech', () => {
		render(RadioGroup, { props: { options: borders, label: 'Photo Borders' } });
		expect(screen.getByRole('radiogroup', { name: 'Photo Borders' })).toBeInTheDocument();
	});

	it('checks the option matching value', () => {
		render(RadioGroup, { props: { options: borders, value: 'all' } });

		expect(screen.getByLabelText('All')).toBeChecked();
		expect(screen.getByLabelText('None')).not.toBeChecked();
	});

	it('checks nothing when value matches no option', () => {
		render(RadioGroup, { props: { options: borders, value: 'bogus' } });
		expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
	});

	it('selects when the option text is clicked', async () => {
		// The React original's handler sat on the 20px circle only, so clicking the text
		// did nothing. A real radio inside a <label> fixes that.
		render(RadioGroup, { props: { options: borders, value: 'none' } });

		await fireEvent.click(screen.getByText('Left-Right'));

		expect(screen.getByLabelText('Left-Right')).toBeChecked();
		expect(screen.getByLabelText('None')).not.toBeChecked();
	});

	it('moves selection between options', async () => {
		render(RadioGroup, { props: { options: borders, value: 'none' } });

		await fireEvent.click(screen.getByLabelText('All'));

		expect(screen.getByLabelText('All')).toBeChecked();
		expect(screen.getByLabelText('None')).not.toBeChecked();
	});

	it('radios are focusable', () => {
		render(RadioGroup, { props: { options: borders, value: 'none' } });
		const radio = screen.getByLabelText('None') as HTMLInputElement;

		radio.focus();

		expect(radio).toHaveFocus();
	});

	it('gives each group a distinct name so two groups do not interfere', async () => {
		render(RadioGroup, { props: { options: borders, value: 'none', label: 'Photo Borders' } });
		render(RadioGroup, { props: { options: themes, value: 'dark', label: 'Site Theme' } });

		const bordersGroup = screen.getByRole('radiogroup', { name: 'Photo Borders' });
		const themeGroup = screen.getByRole('radiogroup', { name: 'Site Theme' });

		const borderName = within(bordersGroup).getByLabelText('None').getAttribute('name');
		const themeName = within(themeGroup).getByLabelText('Dark').getAttribute('name');
		expect(borderName).toBeTruthy();
		expect(borderName).not.toBe(themeName);

		// Selecting in one group must leave the other alone.
		await fireEvent.click(within(bordersGroup).getByLabelText('All'));

		expect(within(themeGroup).getByLabelText('Dark')).toBeChecked();
	});

	it('honours an explicit name', () => {
		render(RadioGroup, { props: { options: themes, name: 'theme' } });
		expect(screen.getByLabelText('Light')).toHaveAttribute('name', 'theme');
	});
});
