import { describe, it, expect } from 'vitest';
import { modelToId } from './utils';

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
