import { describe, it, expect } from 'vitest';
import { Colors, colorScheme, alpha } from './colors';

describe('colorScheme', () => {
	it.each([
		[Colors.White, '#000000'],
		[Colors.Light, '#000000'],
		[Colors.Grey, '#000000']
	])('puts black text on %s', (bg, text) => {
		expect(colorScheme(bg)).toEqual({ backgroundColor: bg, color: text });
	});

	it.each([
		[Colors.Dark, '#ffffff'],
		[Colors.Black, '#ffffff']
	])('puts white text on %s', (bg, text) => {
		expect(colorScheme(bg)).toEqual({ backgroundColor: bg, color: text });
	});

	describe('unrecognised input', () => {
		// Documenting a sharp edge rather than asserting it's desirable: the match is on
		// five exact lowercase 6-hex strings, so anything else loses the requested
		// background entirely. Unreachable from the UX Config picker.
		it.each([['#FFFFFF'], ['#fff'], ['blue'], ['']])(
			'silently discards %s and falls back to Light',
			(bg) => {
				expect(colorScheme(bg)).toEqual({ backgroundColor: Colors.Light, color: '#000000' });
			}
		);
	});
});

describe('alpha', () => {
	it('converts hex to rgba', () => {
		expect(alpha('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
	});

	it('handles the dark palette values', () => {
		expect(alpha(Colors.Black, 0.5)).toBe('rgba(18, 18, 18, 0.5)');
		expect(alpha(Colors.Dark, 0.5)).toBe('rgba(48, 48, 48, 0.5)');
	});

	it('passes the opacity through unchanged', () => {
		expect(alpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
		expect(alpha('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
	});

	it('is safe for every value colorScheme can produce', () => {
		for (const bg of Object.values(Colors)) {
			expect(alpha(colorScheme(bg).backgroundColor, 0.5)).not.toContain('NaN');
		}
	});
});
