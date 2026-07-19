import { afterEach, describe, expect, it, vi } from 'vitest';
import { partialConceptsFromJson, planInfographics } from './agent';
import type { AgentEvent, PlanInput } from './types';

const input: PlanInput = {
	topic: 'How urban trees cool cities',
	styleId: 'editorial',
	styleLabel: 'Editorial',
	audience: 'Everyone',
	aspect: 'landscape',
	imageWidth: 1536,
	imageHeight: 1024,
	density: 2,
	count: 3
};

afterEach(() => vi.unstubAllGlobals());

describe('infographic planning', () => {
	it('creates three usable offline directions before an API key is connected', async () => {
		const result = await planInfographics(input, '', () => undefined);

		expect(result.concepts).toHaveLength(3);
		expect(result.researched).toBe(false);
		expect(result.concepts.every((concept) => concept.prompt.includes('urban trees'))).toBe(true);
		expect(new Set(result.concepts.map((concept) => concept.layout)).size).toBe(3);
	});

	it('streams a strict Responses plan without loading a Node agent runtime', async () => {
		const concepts = Array.from({ length: 3 }, (_, index) => ({
			title: `Direction ${index + 1}`,
			strapline: `Hook ${index + 1}`,
			prompt: `Production prompt ${index + 1}`,
			rationale: `Rationale ${index + 1}`,
			layout: `Layout ${index + 1}`,
			palette: ['#111111', '#eeeeee', '#ff5533']
		}));
		const payload = JSON.stringify({
			intro: 'Three live directions.',
			researched: false,
			researchNote: '',
			concepts
		});
		const encoder = new TextEncoder();
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(
							encoder.encode(
								`event: response.output_text.delta\ndata: ${JSON.stringify({ type: 'response.output_text.delta', delta: payload })}\n\n`
							)
						);
						controller.enqueue(
							encoder.encode(
								'event: response.completed\ndata: {"type":"response.completed","response":{}}\n\n'
							)
						);
						controller.close();
					}
				}),
				{ headers: { 'content-type': 'text/event-stream' } }
			)
		);
		vi.stubGlobal('fetch', fetchMock);
		const events: AgentEvent[] = [];

		const result = await planInfographics(
			{ ...input, plannerModel: 'gpt-5.6-luna' },
			'test-key',
			(event) => events.push(event)
		);

		expect(result.concepts.map((concept) => concept.title)).toEqual([
			'Direction 1',
			'Direction 2',
			'Direction 3'
		]);
		expect(events.filter((event) => event.type === 'direction-progress')).toHaveLength(3);
		expect(events.filter((event) => event.type === 'direction-ready')).toHaveLength(3);
		const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
		expect(request).toMatchObject({
			model: 'gpt-5.6-luna',
			stream: true,
			text: { format: { type: 'json_schema', strict: true } }
		});
	});

	it('extracts complete fields while a concept JSON document is still streaming', () => {
		const partial = partialConceptsFromJson(
			'{"concepts":[{"title":"Signal map","strapline":"A clear hook","prompt":"Still writing',
			3
		);
		expect(partial[0]).toEqual({ title: 'Signal map', strapline: 'A clear hook' });
	});
});
