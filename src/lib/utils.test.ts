import { describe, it, expect } from 'vitest';
import { formatDuration, modelToId } from './utils';

describe('modelToId', () => {
	it('lowercases and hyphenates', () => {
		expect(modelToId('LEICA Q2')).toBe('leica-q2');
	});

	it('collapses runs of whitespace', () => {
		expect(modelToId('Canon  EOS   R5')).toBe('canon-eos-r5');
	});

	it('leaves a model with no spaces alone', () => {
		expect(modelToId('ILCE-7M3')).toBe('ilce-7m3');
	});

	it('keeps punctuation', () => {
		expect(modelToId('ILCE-7M3 (v2)')).toBe('ilce-7m3-(v2)');
	});

	it('handles an empty string', () => {
		expect(modelToId('')).toBe('');
	});
});

describe('formatDuration', () => {
	it('formats minutes and zero-padded seconds', () => {
		expect(formatDuration(0)).toBe('0:00');
		expect(formatDuration(7)).toBe('0:07');
		expect(formatDuration(65)).toBe('1:05');
		expect(formatDuration(599)).toBe('9:59');
	});

	it('rounds down fractional seconds', () => {
		expect(formatDuration(12.9)).toBe('0:12');
	});

	it('adds hours from an hour up', () => {
		expect(formatDuration(3600)).toBe('1:00:00');
		expect(formatDuration(3725)).toBe('1:02:05');
	});

	it('treats a missing duration as zero', () => {
		expect(formatDuration(undefined)).toBe('0:00');
	});
});
