import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TextField from './TextField.svelte';

describe('TextField', () => {
	it('associates the label with the input', () => {
		render(TextField, { props: { label: 'Grid Columns' } });
		expect(screen.getByLabelText('Grid Columns')).toBeInstanceOf(HTMLInputElement);
	});

	it('renders without a label', () => {
		render(TextField, { props: { value: 'x' } });
		expect(screen.getByRole('textbox')).toHaveValue('x');
	});

	it('shows the given value', () => {
		render(TextField, { props: { label: 'Name', value: 'Martin' } });
		expect(screen.getByLabelText('Name')).toHaveValue('Martin');
	});

	it('writes typed input back through the binding', async () => {
		render(TextField, { props: { label: 'Name', value: 'a' } });

		await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'ab' } });

		expect(screen.getByLabelText('Name')).toHaveValue('ab');
	});

	it('passes rest props through to the input', () => {
		render(TextField, {
			props: { label: 'Cols', type: 'number', min: 1, max: 12, step: 1, placeholder: 'n' }
		});

		const input = screen.getByLabelText('Cols');
		expect(input).toHaveAttribute('type', 'number');
		expect(input).toHaveAttribute('min', '1');
		expect(input).toHaveAttribute('max', '12');
		expect(input).toHaveAttribute('placeholder', 'n');
	});

	it('honours disabled from rest props', () => {
		render(TextField, { props: { label: 'Name', disabled: true } });
		expect(screen.getByLabelText('Name')).toBeDisabled();
	});

	it('applies w-full only when fullWidth is set', () => {
		const { unmount } = render(TextField, { props: { label: 'A', fullWidth: true } });
		expect(screen.getByLabelText('A').className).toContain('w-full');
		unmount();

		render(TextField, { props: { label: 'B' } });
		expect(screen.getByLabelText('B').className).not.toContain('w-full');
	});

	it('prefers an explicit id over the generated one', () => {
		render(TextField, { props: { label: 'Cols', id: 'cols' } });
		expect(screen.getByLabelText('Cols')).toHaveAttribute('id', 'cols');
	});

	it('gives each instance a unique id when none is supplied', () => {
		render(TextField, { props: { label: 'One' } });
		render(TextField, { props: { label: 'Two' } });

		const a = screen.getByLabelText('One').getAttribute('id');
		const b = screen.getByLabelText('Two').getAttribute('id');
		expect(a).toBeTruthy();
		expect(a).not.toBe(b);
	});
});
