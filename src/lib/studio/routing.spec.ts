import { describe, expect, it } from 'vitest';
import { routeComposerIntent, type ComposerStage } from './routing';

describe('routeComposerIntent', () => {
	it.each<ComposerStage>(['topic', 'style', 'brief', 'planning', 'concepts'])(
		'routes an attached reference directly to editing from %s',
		(stage) => {
			expect(routeComposerIntent({ stage, activeReferenceCount: 1 })).toBe('edit-reference');
		}
	);

	it('keeps the normal planning routes when there is no reference', () => {
		expect(routeComposerIntent({ stage: 'topic', activeReferenceCount: 0 })).toBe('start-topic');
		expect(routeComposerIntent({ stage: 'concepts', activeReferenceCount: 0 })).toBe(
			'refine-concepts'
		);
		expect(routeComposerIntent({ stage: 'brief', activeReferenceCount: 0 })).toBe('replace-topic');
	});
});
