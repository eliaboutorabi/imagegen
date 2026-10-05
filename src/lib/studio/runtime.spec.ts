import { describe, expect, it } from 'vitest';
import { canvasContext, createToolGate, STUDIO_SYSTEM_PROMPT } from './runtime';
import { DEFAULT_SETTINGS } from './storage';
import type { StudioProject } from './types';

describe('studio agent safety', () => {
	it('deduplicates concurrent identical effects, including paid jobs', async () => {
		const gate = createToolGate(new AbortController().signal);
		let calls = 0;
		const action = async () => {
			calls++;
			return 'queued';
		};
		const result = await Promise.all([
			gate('generate', { count: 1 }, action),
			gate('generate', { count: 1 }, action)
		]);
		expect(result).toEqual(['queued', 'queued']);
		expect(calls).toBe(1);
	});
	it('does not retry a failed effect and bounds tool loops', async () => {
		const gate = createToolGate(new AbortController().signal, 1);
		let calls = 0;
		const fail = () => {
			calls++;
			throw new Error('failed');
		};
		await expect(gate('image', {}, fail)).rejects.toThrow('failed');
		await expect(gate('image', {}, fail)).rejects.toThrow('failed');
		expect(calls).toBe(1);
		expect(() => gate('image', { changed: true }, fail)).toThrow('tool-call limit');
	});
	it('cannot act after a run is stopped', () => {
		const controller = new AbortController();
		const gate = createToolGate(controller.signal);
		controller.abort();
		expect(() => gate('image', {}, () => 'queued')).toThrow();
	});
	it('exposes reference provenance but never image bytes or credentials in canvas metadata', () => {
		const project = {
			topic: 'Test',
			styleIds: [],
			customDirection: '',
			audience: 'Everyone',
			imageWidth: 1536,
			imageHeight: 1024,
			density: 2,
			concepts: [],
			generations: [],
			activeReferenceIds: ['ref'],
			referenceAssets: [
				{ id: 'ref', name: 'Reference', sourcePrompt: 'Original prompt', dataUrl: 'private-bytes' }
			]
		} as unknown as StudioProject;
		const context = canvasContext(project, { ...DEFAULT_SETTINGS, apiKey: 'secret-key' });
		expect(context).toContain('Original prompt');
		expect(context).not.toContain('private-bytes');
		expect(context).not.toContain('secret-key');
		expect(STUDIO_SYSTEM_PROMPT).toContain('A reference can be discussed without being edited');
	});
});
