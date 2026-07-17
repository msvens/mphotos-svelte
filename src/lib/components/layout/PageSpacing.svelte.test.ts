import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import PageSpacing from './PageSpacing.svelte';

/** The rendered spacer div. */
function spacer(props: Record<string, unknown> = {}) {
	const { container } = render(PageSpacing, { props });
	return container.querySelector('div') as HTMLDivElement;
}

describe('PageSpacing', () => {
	it('defaults to 32px', () => {
		// The nav clears itself now; this is pure breathing room, and 32 is what the site
		// shipped with (the old 96px spacer minus the real 65px navbar).
		expect(spacer()).toHaveStyle({ height: '32px' });
	});

	it.each([
		['none', '0px'],
		['small', '16px'],
		['default', '32px'],
		['large', '48px']
	])('resolves %s to %s', (height, expected) => {
		expect(spacer({ height })).toHaveStyle({ height: expected });
	});

	it('passes through an extra class', () => {
		expect(spacer({ class: 'shrink-0' }).className).toContain('shrink-0');
	});
});
