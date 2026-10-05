import { describe, expect, it } from 'vitest';
import { referenceCanvas } from './canvas';

describe('reference canvas sizing', () => {
	it.each([
		[1, 1],
		[1902, 1246],
		[9000, 6000],
		[600, 2000]
	])('normalizes %s × %s without sending invalid API sizes', (w, h) => {
		const size = referenceCanvas(w, h);
		expect(size.width % 16).toBe(0);
		expect(size.height % 16).toBe(0);
		expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(3840);
		expect(size.width * size.height).toBeGreaterThanOrEqual(655_360);
		expect(size.width * size.height).toBeLessThanOrEqual(8_294_400);
		expect(
			Math.max(size.width, size.height) / Math.min(size.width, size.height)
		).toBeLessThanOrEqual(3);
	});
	it('keeps standard generated dimensions and flags extreme panoramas for letterboxing', () => {
		expect(referenceCanvas(1536, 1024)).toEqual({ width: 1536, height: 1024, letterboxed: false });
		expect(referenceCanvas(6000, 1000).letterboxed).toBe(true);
	});
});
