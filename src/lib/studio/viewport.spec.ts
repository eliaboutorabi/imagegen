import { describe, expect, it } from 'vitest';
import { clampViewerPan, clampViewerZoom, getViewerMinimap, wheelZoomFactor } from './viewport';

describe('image viewer viewport', () => {
	it('turns a subtle trackpad delta into a subtle multiplicative zoom', () => {
		expect(wheelZoomFactor(-2, 0, 800)).toBeCloseTo(1.0028, 4);
		expect(wheelZoomFactor(2, 0, 800)).toBeCloseTo(0.9972, 4);
	});

	it('caps unusually large wheel events instead of jumping aggressively', () => {
		expect(wheelZoomFactor(-1000, 0, 800)).toBe(1.08);
		expect(wheelZoomFactor(1000, 0, 800)).toBe(0.92);
		expect(clampViewerZoom(8)).toBe(5);
		expect(clampViewerZoom(0.2)).toBe(1);
	});

	it('keeps the image inside the viewport while panning', () => {
		expect(clampViewerPan(800, -800, 2, 600, 400, 800, 500)).toEqual({
			x: 200,
			y: -150
		});
		expect(clampViewerPan(40, 40, 1, 600, 400, 800, 500)).toEqual({ x: 0, y: 0 });
	});

	it('maps the visible image area into the minimap', () => {
		const centered = getViewerMinimap(600, 400, 800, 500, 2, 0, 0)!;
		const moved = getViewerMinimap(600, 400, 800, 500, 2, -200, 0)!;
		expect(centered.width / centered.height).toBeCloseTo(1.5, 1);
		expect(centered.viewportWidth).toBeLessThan(centered.width);
		expect(moved.viewportLeft).toBeGreaterThan(centered.viewportLeft);
	});
});
