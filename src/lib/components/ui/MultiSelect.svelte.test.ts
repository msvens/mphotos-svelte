import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import MultiSelect, { type MultiSelectOption } from './MultiSelect.svelte';

const albums: MultiSelectOption[] = [
	{ value: 'a1', label: 'Summer' },
	{ value: 'a2', label: 'Winter' },
	{ value: 'a3', label: 'Trips' }
];

const trigger = () => screen.getByRole('combobox');
const listbox = () => screen.getByRole('listbox');
const activeOptionId = () => trigger().getAttribute('aria-activedescendant');

function open() {
	return fireEvent.click(trigger());
}

describe('MultiSelect', () => {
	describe('display', () => {
		it('shows the placeholder when nothing is selected', () => {
			render(MultiSelect, { props: { options: albums, placeholder: 'Pick albums...' } });
			expect(trigger()).toHaveTextContent('Pick albums...');
		});

		it('comma-joins selected labels in option order', () => {
			render(MultiSelect, { props: { options: albums, value: ['a3', 'a1'] } });
			expect(trigger()).toHaveTextContent('Summer, Trips');
		});

		it('is labelled by its label', () => {
			render(MultiSelect, { props: { options: albums, label: 'Albums' } });
			expect(screen.getByRole('combobox', { name: /Albums/ })).toBeInTheDocument();
		});
	});

	describe('opening and closing', () => {
		it('starts closed', () => {
			render(MultiSelect, { props: { options: albums } });
			expect(trigger()).toHaveAttribute('aria-expanded', 'false');
			expect(screen.queryByRole('listbox', { hidden: false })).toBeNull();
		});

		it('opens on click and marks the listbox multiselectable', async () => {
			render(MultiSelect, { props: { options: albums } });

			await open();

			expect(trigger()).toHaveAttribute('aria-expanded', 'true');
			expect(listbox()).toHaveAttribute('aria-multiselectable', 'true');
			expect(screen.getAllByRole('option')).toHaveLength(3);
		});

		it('closes on Escape', async () => {
			render(MultiSelect, { props: { options: albums } });
			await open();

			await fireEvent.keyDown(trigger(), { key: 'Escape' });

			expect(trigger()).toHaveAttribute('aria-expanded', 'false');
		});

		it('closes on an outside mousedown', async () => {
			render(MultiSelect, { props: { options: albums } });
			await open();

			await fireEvent.mouseDown(document.body);

			expect(trigger()).toHaveAttribute('aria-expanded', 'false');
		});

		it('shows an empty state when there are no options', async () => {
			render(MultiSelect, { props: { options: [] } });

			await open();

			expect(screen.getByText('No options available')).toBeInTheDocument();
			expect(screen.queryAllByRole('option')).toHaveLength(0);
		});
	});

	describe('toggling', () => {
		it('adds an option and stays open', async () => {
			const onChange = vi.fn();
			render(MultiSelect, { props: { options: albums, value: [], onChange } });
			await open();

			await fireEvent.click(screen.getByRole('option', { name: 'Winter' }));

			expect(onChange).toHaveBeenCalledWith(['a2']);
			expect(trigger()).toHaveAttribute('aria-expanded', 'true'); // stays open
			expect(screen.getByRole('option', { name: 'Winter' })).toHaveAttribute(
				'aria-selected',
				'true'
			);
		});

		it('removes an already-selected option', async () => {
			const onChange = vi.fn();
			render(MultiSelect, { props: { options: albums, value: ['a1', 'a2'], onChange } });
			await open();

			await fireEvent.click(screen.getByRole('option', { name: 'Summer' }));

			expect(onChange).toHaveBeenCalledWith(['a2']);
			expect(screen.getByRole('option', { name: 'Summer' })).toHaveAttribute(
				'aria-selected',
				'false'
			);
		});

		it('reflects selection in aria-selected per option', async () => {
			render(MultiSelect, { props: { options: albums, value: ['a2'] } });
			await open();

			expect(screen.getByRole('option', { name: 'Summer' })).toHaveAttribute(
				'aria-selected',
				'false'
			);
			expect(screen.getByRole('option', { name: 'Winter' })).toHaveAttribute(
				'aria-selected',
				'true'
			);
		});

		it('lets several be toggled in one open session', async () => {
			const onChange = vi.fn();
			render(MultiSelect, { props: { options: albums, value: [], onChange } });
			await open();

			await fireEvent.click(screen.getByRole('option', { name: 'Summer' }));
			await fireEvent.click(screen.getByRole('option', { name: 'Trips' }));

			expect(onChange).toHaveBeenLastCalledWith(['a1', 'a3']);
			expect(trigger()).toHaveAttribute('aria-expanded', 'true');
		});
	});

	describe('keyboard', () => {
		it('opens on ArrowDown', async () => {
			render(MultiSelect, { props: { options: albums } });

			await fireEvent.keyDown(trigger(), { key: 'ArrowDown' });

			expect(trigger()).toHaveAttribute('aria-expanded', 'true');
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'Summer' }).id);
		});

		it('moves the active option with arrows and Home/End', async () => {
			render(MultiSelect, { props: { options: albums } });
			await open();

			await fireEvent.keyDown(trigger(), { key: 'End' });
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'Trips' }).id);

			await fireEvent.keyDown(trigger(), { key: 'Home' });
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'Summer' }).id);

			await fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
			expect(activeOptionId()).toBe(screen.getByRole('option', { name: 'Winter' }).id);
		});

		it('toggles the active option with Enter without closing', async () => {
			const onChange = vi.fn();
			render(MultiSelect, { props: { options: albums, value: [], onChange } });
			await open();
			await fireEvent.keyDown(trigger(), { key: 'Home' }); // active = Summer

			await fireEvent.keyDown(trigger(), { key: 'Enter' });

			expect(onChange).toHaveBeenCalledWith(['a1']);
			expect(trigger()).toHaveAttribute('aria-expanded', 'true');
		});

		it('toggles with Space too', async () => {
			const onChange = vi.fn();
			render(MultiSelect, { props: { options: albums, value: [], onChange } });
			await open();
			await fireEvent.keyDown(trigger(), { key: 'End' }); // active = Trips

			await fireEvent.keyDown(trigger(), { key: ' ' });

			expect(onChange).toHaveBeenCalledWith(['a3']);
		});
	});

	it('round-trips a bound value as the array changes', async () => {
		const { rerender } = render(MultiSelect, { props: { options: albums, value: ['a1'] } });
		expect(trigger()).toHaveTextContent('Summer');

		await rerender({ options: albums, value: ['a1', 'a2'] });
		await tick();

		expect(trigger()).toHaveTextContent('Summer, Winter');
	});
});
