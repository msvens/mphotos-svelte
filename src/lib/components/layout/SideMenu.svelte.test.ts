import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SideMenu from './SideMenu.svelte';

const items = [
	{ id: 'leica-q2', name: 'Leica Q2' },
	{ id: 'nikon-z6', name: 'Nikon Z6' }
];

describe('SideMenu', () => {
	it('renders an item per entry', () => {
		render(SideMenu, { props: { items, activeItem: 'leica-q2', onItemChange: vi.fn() } });
		expect(screen.getByRole('button', { name: 'Leica Q2' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Nikon Z6' })).toBeInTheDocument();
	});

	it('marks the active item', () => {
		render(SideMenu, { props: { items, activeItem: 'nikon-z6', onItemChange: vi.fn() } });
		expect(screen.getByRole('button', { name: 'Nikon Z6' })).toHaveAttribute(
			'aria-current',
			'true'
		);
		expect(screen.getByRole('button', { name: 'Leica Q2' })).not.toHaveAttribute('aria-current');
	});

	it('fires onItemChange with the id when clicked', async () => {
		const onItemChange = vi.fn();
		render(SideMenu, { props: { items, activeItem: 'leica-q2', onItemChange } });

		await fireEvent.click(screen.getByRole('button', { name: 'Nikon Z6' }));

		expect(onItemChange).toHaveBeenCalledWith('nikon-z6');
	});
});
