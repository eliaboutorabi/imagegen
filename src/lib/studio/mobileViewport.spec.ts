import { afterEach, describe, expect, it, vi } from 'vitest';
import { mobileViewport } from './mobileViewport';

afterEach(() => vi.unstubAllGlobals());

describe('mobile visual viewport', () => {
	function setup() {
		const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0, scale: 1 });
		const media = { matches: true };
		const properties = new Map<string, string>();
		const window = Object.assign(new EventTarget(), {
			visualViewport: viewport,
			innerHeight: 844,
			matchMedia: () => media
		});
		vi.stubGlobal('window', window);
		vi.stubGlobal('document', {
			documentElement: {
				style: {
					setProperty: (name: string, value: string) => properties.set(name, value),
					removeProperty: (name: string) => properties.delete(name)
				}
			}
		});
		return { viewport, media, properties, window };
	}

	it('tracks keyboard height and viewport offset, then removes its listeners', () => {
		const { viewport, properties } = setup();
		const cleanup = mobileViewport();
		expect(properties.get('--mobile-viewport-height')).toBe('844px');
		viewport.height = 420;
		viewport.offsetTop = 20;
		viewport.dispatchEvent(new Event('resize'));
		expect(properties.get('--mobile-viewport-height')).toBe('420px');
		expect(properties.get('--mobile-viewport-top')).toBe('20px');
		cleanup();
		viewport.dispatchEvent(new Event('scroll'));
		expect(properties.size).toBe(0);
	});
	it('does not resize the workspace while the user pinch-zooms the page', () => {
		const { viewport, properties } = setup();
		const cleanup = mobileViewport();
		viewport.scale = 2;
		viewport.height = 422;
		viewport.dispatchEvent(new Event('resize'));
		expect(properties.get('--mobile-viewport-height')).toBe('844px');
		cleanup();
	});
	it('leaves desktop sizing to CSS', () => {
		const { media, properties, window } = setup();
		const cleanup = mobileViewport();
		media.matches = false;
		window.dispatchEvent(new Event('resize'));
		expect(properties.size).toBe(0);
		cleanup();
	});
});
