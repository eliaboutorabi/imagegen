import { describe, expect, it } from 'vitest';
import { toCloneSafe } from './clone';

describe('clone-safe persistence boundary', () => {
	it('removes reactive-style proxies before structured cloning', () => {
		const project = new Proxy(
			{
				id: 'project-1',
				concepts: new Proxy([{ id: 'concept-1', palette: new Proxy(['#fff'], {}) }], {})
			},
			{}
		);
		expect(() => structuredClone(project)).toThrow();
		const safe = toCloneSafe(project);
		expect(() => structuredClone(safe)).not.toThrow();
		expect(safe.concepts[0].id).toBe('concept-1');
	});
});
