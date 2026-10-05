import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	citationSegments,
	createResearchTracker,
	researchFetch,
	researchSources,
	webSource
} from './research';
import type { ResearchTrace } from './types';

afterEach(() => vi.unstubAllGlobals());

describe('hosted web research', () => {
	it('reports search activity before completion and retains safe sources', () => {
		const traces: ResearchTrace[] = [];
		const consume = createResearchTracker((trace) => traces.push(trace)).startResponse();
		consume({ type: 'response.web_search_call.in_progress', item_id: 'search-1' });
		expect(traces.at(-1)?.searches[0].status).toBe('searching');
		consume({
			type: 'response.output_item.done',
			item: {
				id: 'search-1',
				type: 'web_search_call',
				status: 'completed',
				action: {
					queries: ['urban trees', 'shade'],
					sources: [{ url: 'https://example.com/trees' }, { url: 'javascript:alert(1)' }]
				}
			}
		});
		expect(traces.at(-1)?.searches[0]).toMatchObject({
			status: 'complete',
			queries: ['urban trees', 'shade'],
			sources: [{ url: 'https://example.com/trees', title: 'example.com' }]
		});
	});

	it('maps citations across model turns and deduplicates the source list', () => {
		let trace: ResearchTrace = { searches: [], citations: [] };
		const tracker = createResearchTracker((next) => (trace = next));
		const first = tracker.startResponse();
		first({
			type: 'response.output_text.delta',
			output_index: 0,
			content_index: 0,
			delta: 'I will look that up.'
		});
		const second = tracker.startResponse();
		const text = 'Trees provide shade. [1]';
		second({ type: 'response.output_text.delta', output_index: 1, content_index: 0, delta: text });
		second({
			type: 'response.output_text.annotation.added',
			output_index: 1,
			content_index: 0,
			annotation: {
				type: 'url_citation',
				url: 'https://example.com/trees',
				title: 'Trees',
				start_index: 21,
				end_index: 24
			}
		});
		const full = `I will look that up.\n${text}`;
		expect(trace.citations[0].startIndex).toBe(full.indexOf('[1]'));
		const segments = citationSegments(full, trace.citations);
		expect(segments.map((part) => part.text).join('')).toBe(full);
		expect(segments.find((part) => part.source)?.text).toBe('[1]');
		expect(
			researchSources({ ...trace, citations: [...trace.citations, ...trace.citations] })
		).toHaveLength(1);
	});

	it('rejects unsafe links and out-of-range citation spans', () => {
		expect(webSource({ url: 'javascript:alert(1)' })).toBeNull();
		expect(webSource({ url: 'https://name:secret@example.com/' })).toBeNull();
		expect(webSource({ url: 'data:text/html,hello' })).toBeNull();
		expect(
			citationSegments('Hello', [
				{ url: 'https://example.com', title: 'Test', startIndex: 10, endIndex: 12 }
			])
		).toEqual([{ text: 'Hello' }]);
	});

	it('observes a streaming response without changing its bytes or making another request', async () => {
		const source =
			'event: response.web_search_call.in_progress\ndata: {"type":"response.web_search_call.in_progress","item_id":"search-1"}\n\n';
		const fetchMock = vi.fn(
			async () =>
				new Response(source, {
					headers: { 'content-type': 'text/event-stream', 'x-request-id': 'req-test' }
				})
		);
		vi.stubGlobal('fetch', fetchMock);
		const notify = vi.fn();
		const response = await researchFetch(createResearchTracker(notify))(
			'https://api.openai.com/v1/responses'
		);
		expect(await response.text()).toBe(source);
		expect(response.headers.get('x-request-id')).toBe('req-test');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith({
			searches: [{ id: 'search-1', status: 'searching', queries: [], sources: [] }],
			citations: []
		});
	});

	it('leaves API errors untouched and propagates cancellation to the upstream stream', async () => {
		const error = new Response('{"error":{"message":"Not available"}}', { status: 400 });
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => error)
		);
		const fetchWithResearch = researchFetch(createResearchTracker(() => {}));
		expect(await fetchWithResearch('https://api.openai.com/v1/responses')).toBe(error);
		const canceled = vi.fn();
		const stream = new ReadableStream({ cancel: canceled });
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(stream, { headers: { 'content-type': 'text/event-stream' } }))
		);
		const response = await fetchWithResearch('https://api.openai.com/v1/responses');
		await response.body!.cancel();
		await vi.waitFor(() => expect(canceled).toHaveBeenCalledOnce());
	});
});
