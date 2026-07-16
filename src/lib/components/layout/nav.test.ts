import { describe, it, expect } from 'vitest';
import { isActiveRoute, navigation } from './nav';

describe('isActiveRoute', () => {
	it('matches Home only on the exact root path', () => {
		expect(isActiveRoute('/', '/')).toBe(true);
		expect(isActiveRoute('/photo', '/')).toBe(false);
		expect(isActiveRoute('/album/123', '/')).toBe(false);
	});

	it('matches non-home items by prefix', () => {
		expect(isActiveRoute('/photo', '/photo')).toBe(true);
		expect(isActiveRoute('/photo/123', '/photo')).toBe(true);
		expect(isActiveRoute('/album', '/photo')).toBe(false);
	});
});

describe('navigation', () => {
	it('lists the five top-level destinations', () => {
		expect(navigation.map((n) => n.href)).toEqual(['/', '/photo', '/album', '/camera', '/guest']);
	});
});
