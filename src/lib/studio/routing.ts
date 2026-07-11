export type ComposerStage = 'topic' | 'style' | 'brief' | 'planning' | 'concepts';
export type ComposerIntent = 'edit-reference' | 'start-topic' | 'refine-concepts' | 'replace-topic';

export function routeComposerIntent({
	stage,
	activeReferenceCount
}: {
	stage: ComposerStage;
	activeReferenceCount: number;
}): ComposerIntent {
	// An explicitly attached reference is the strongest UI signal. Treat the
	// next instruction as an image edit instead of restarting creative planning.
	if (activeReferenceCount > 0) return 'edit-reference';
	if (stage === 'topic') return 'start-topic';
	if (stage === 'concepts') return 'refine-concepts';
	return 'replace-topic';
}
