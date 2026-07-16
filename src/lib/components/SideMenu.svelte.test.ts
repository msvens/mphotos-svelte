import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SideMenu, { type MenuItem } from './SideMenu.svelte';

const items: MenuItem[] = [
	{ id: 'profile', name: 'Profile' },
	{ id: 'logout', name: 'Logout' }
];

describe('SideMenu', () => {
	it('renders each item and marks the active one', () => {
		render(SideMenu, { props: { items, activeItem: 'profile', onItemChange: vi.fn() } });
		const active = screen.getByRole('button', { name: 'Profile' });
		const inactive = screen.getByRole('button', { name: 'Logout' });
		expect(active.className).toContain('bg-gray-200');
		expect(inactive.className).not.toContain('bg-gray-200');
	});

	it('fires onItemChange with the clicked id', async () => {
		const onItemChange = vi.fn();
		render(SideMenu, { props: { items, activeItem: 'profile', onItemChange } });
		await fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
		expect(onItemChange).toHaveBeenCalledWith('logout');
	});
});
