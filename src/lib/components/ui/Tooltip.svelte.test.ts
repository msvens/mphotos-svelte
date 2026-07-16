import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Tooltip from './Tooltip.svelte';

const child = createRawSnippet(() => ({ render: () => `<button>trigger</button>` }));

afterEach(() => {
	vi.useRealTimers();
});

describe('Tooltip', () => {
	it('is hidden until hovered, then shows the title (no delay)', async () => {
		const { container } = render(Tooltip, { props: { title: 'Home', delay: 0, children: child } });
		expect(screen.queryByRole('tooltip')).toBeNull();

		await fireEvent.mouseEnter(container.firstElementChild as Element);
		expect(screen.getByRole('tooltip')).toHaveTextContent('Home');

		await fireEvent.mouseLeave(container.firstElementChild as Element);
		expect(screen.queryByRole('tooltip')).toBeNull();
	});

	it('waits for the delay before showing', async () => {
		vi.useFakeTimers();
		const { container } = render(Tooltip, {
			props: { title: 'Home', delay: 500, children: child }
		});

		await fireEvent.mouseEnter(container.firstElementChild as Element);
		// not yet — delay has not elapsed
		expect(screen.queryByRole('tooltip')).toBeNull();

		vi.advanceTimersByTime(500);
		await vi.waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('Home'));
	});

	it('cancels the pending tooltip if the pointer leaves first', async () => {
		vi.useFakeTimers();
		const { container } = render(Tooltip, {
			props: { title: 'Home', delay: 500, children: child }
		});

		await fireEvent.mouseEnter(container.firstElementChild as Element);
		vi.advanceTimersByTime(200);
		await fireEvent.mouseLeave(container.firstElementChild as Element);
		vi.advanceTimersByTime(500);
		expect(screen.queryByRole('tooltip')).toBeNull();
	});
});
