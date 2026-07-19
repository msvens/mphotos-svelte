import { describe, it, expect } from 'vitest';
import { displayName, formatValue, buildSpecs } from './cameraSpec';
import type { Camera } from '$lib/api/types';

describe('displayName', () => {
	it('maps known keys to labels', () => {
		expect(displayName('effectivePixels')).toBe('Effective Pixels');
		expect(displayName('gps')).toBe('GPS');
		expect(displayName('iso')).toBe('ISO');
	});

	it('falls back to the key for unknown fields', () => {
		expect(displayName('somethingNew')).toBe('somethingNew');
	});
});

describe('formatValue', () => {
	it('renders booleans as Yes/No', () => {
		expect(formatValue('raw', true)).toBe('Yes');
		expect(formatValue('gps', false)).toBe('No');
	});

	it('formats megapixels', () => {
		expect(formatValue('effectivePixels', 24000000)).toBe('24M');
		expect(formatValue('totalPixels', 25500000)).toBe('25.5M');
	});

	it('formats optical zoom and focus ranges', () => {
		expect(formatValue('opticalZoom', 3)).toBe('3x');
		expect(formatValue('focusRange', 30)).toBe('30 cm');
		expect(formatValue('macroFocusRange', 5)).toBe('5 cm');
	});

	it('suppresses zeros for numeric specs', () => {
		expect(formatValue('year', 0)).toBe('');
		expect(formatValue('effectivePixels', 0)).toBe('');
		expect(formatValue('opticalZoom', 0)).toBe('');
		expect(formatValue('cropFactor', 0)).toBe('');
	});

	it('passes strings through and empties nullish', () => {
		expect(formatValue('sensorType', 'CMOS')).toBe('CMOS');
		expect(formatValue('sensorType', '')).toBe('');
		expect(formatValue('sensorType', undefined)).toBe('');
	});
});

describe('buildSpecs', () => {
	const camera = {
		id: 'nikon-z6',
		model: 'Z6',
		make: 'Nikon',
		year: 2018,
		effectivePixels: 24000000,
		totalPixels: 0,
		sensorType: 'CMOS',
		sensorSize: '',
		raw: true,
		gps: false,
		image: '/api/cameras/nikon-z6/image'
	} as unknown as Camera;

	it('excludes id and image, drops empty values, formats the rest', () => {
		const specs = buildSpecs(camera);
		const keys = specs.map((s) => s.key);

		expect(keys).not.toContain('id');
		expect(keys).not.toContain('image');
		expect(keys).not.toContain('totalPixels'); // zero suppressed
		expect(keys).not.toContain('sensorSize'); // empty suppressed

		expect(specs).toContainEqual({ key: 'make', displayName: 'Make', value: 'Nikon' });
		expect(specs).toContainEqual({
			key: 'effectivePixels',
			displayName: 'Effective Pixels',
			value: '24M'
		});
		expect(specs).toContainEqual({ key: 'raw', displayName: 'Supports Raw', value: 'Yes' });
		expect(specs).toContainEqual({ key: 'gps', displayName: 'GPS', value: 'No' });
	});
});
