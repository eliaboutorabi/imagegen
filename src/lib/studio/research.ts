import { createSseParser } from './stream';
import type { ResearchTrace, WebCitation, WebSearch, WebSource } from './types';

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function webSource(value: unknown): WebSource | null {
	const source = record(value);
	if (typeof source.url !== 'string') return null;
	try {
		const url = new URL(source.url);
		if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
		return {
			url: url.href,
			title: typeof source.title === 'string' && source.title.trim() ? source.title : url.hostname
		};
	} catch {
		return null;
	}
}

type TextPart = { text: string; annotations: unknown[] };

/** Capture hosted tool metadata before LangChain's text-only projections discard it. */
export function createResearchTracker(onChange: (trace: ResearchTrace) => void) {
	const searches = new Map<string, WebSearch>();
	const responses: Array<Map<string, TextPart>> = [];
	let lastSnapshot = '';
	function publish() {
		let offset = 0;
		const citations: WebCitation[] = [];
		for (const response of responses) {
			let responseText = '';
			for (const [, part] of [...response].sort(([a], [b]) =>
				a.localeCompare(b, undefined, { numeric: true })
			)) {
				for (const value of part.annotations) {
					const annotation = record(value);
					const source = webSource(annotation);
					const start = annotation.start_index;
					const end = annotation.end_index;
					if (
						annotation.type !== 'url_citation' ||
						!source ||
						typeof start !== 'number' ||
						typeof end !== 'number' ||
						!Number.isInteger(start) ||
						!Number.isInteger(end) ||
						start < 0 ||
						end < start ||
						end > part.text.length
					)
						continue;
					citations.push({ ...source, startIndex: offset + start, endIndex: offset + end });
				}
				offset += part.text.length;
				responseText += part.text;
			}
			// Match the conversation stream's separator between model messages.
			if (responseText && !responseText.endsWith('\n')) offset++;
		}
		const trace: ResearchTrace = {
			searches: [...searches.values()].map((search) => ({
				...search,
				queries: [...search.queries],
				sources: [...search.sources]
			})),
			citations
		};
		const snapshot = JSON.stringify(trace);
		if (snapshot !== lastSnapshot && (trace.searches.length || trace.citations.length)) {
			lastSnapshot = snapshot;
			onChange(trace);
		}
	}
	return {
		startResponse() {
			const parts = new Map<string, TextPart>();
			responses.push(parts);
			return (value: unknown) => {
				const event = record(value);
				const type = typeof event.type === 'string' ? event.type : '';
				const item = record(event.item);
				if (type.startsWith('response.web_search_call.') || item.type === 'web_search_call') {
					const id = typeof item.id === 'string' ? item.id : event.item_id;
					if (typeof id === 'string') {
						const previous = searches.get(id);
						const action = record(item.action);
						const queries = [
							action.query,
							...(Array.isArray(action.queries) ? action.queries : []),
							action.url
						].filter((query): query is string => typeof query === 'string');
						const sources = Array.isArray(action.sources)
							? action.sources
									.map(webSource)
									.filter((source): source is WebSource => source !== null)
							: [];
						searches.set(id, {
							id,
							status:
								item.status === 'failed'
									? 'failed'
									: item.status === 'completed' || type.endsWith('.completed')
										? 'complete'
										: (previous?.status ?? 'searching'),
							queries: queries.length ? [...new Set(queries)] : (previous?.queries ?? []),
							sources: sources.length ? sources : (previous?.sources ?? [])
						});
					}
				}
				const key = `${event.output_index ?? 0}:${event.content_index ?? 0}`;
				if (type === 'response.output_text.delta' && typeof event.delta === 'string') {
					const part = parts.get(key) ?? { text: '', annotations: [] };
					part.text += event.delta;
					parts.set(key, part);
				}
				if (type === 'response.output_text.annotation.added') {
					const part = parts.get(key) ?? { text: '', annotations: [] };
					part.annotations.push(event.annotation);
					parts.set(key, part);
				}
				if (
					type === 'response.output_item.done' &&
					item.type === 'message' &&
					Array.isArray(item.content)
				) {
					item.content.forEach((value, index) => {
						const part = record(value);
						if (part.type === 'output_text' && typeof part.text === 'string')
							parts.set(`${event.output_index ?? 0}:${index}`, {
								text: part.text,
								annotations: Array.isArray(part.annotations) ? part.annotations : []
							});
					});
				}
				publish();
			};
		}
	};
}

/** One pass through the original bytes: no tee, extra request, or buffered response. */
export function researchFetch(tracker: ReturnType<typeof createResearchTracker>): typeof fetch {
	return async (input, init) => {
		const response = await fetch(input, init);
		if (
			!response.ok ||
			!response.body ||
			!response.headers.get('content-type')?.includes('text/event-stream')
		)
			return response;
		const decoder = new TextDecoder();
		const parser = createSseParser(tracker.startResponse());
		const body = response.body.pipeThrough(
			new TransformStream<Uint8Array, Uint8Array>({
				transform(chunk, controller) {
					parser.push(decoder.decode(chunk, { stream: true }));
					controller.enqueue(chunk);
				},
				flush() {
					parser.push(decoder.decode());
					parser.finish();
				}
			})
		);
		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers
		});
	};
}

export function citationSegments(text: string, citations: WebCitation[] = []) {
	const segments: Array<{ text: string; source?: WebSource; number?: number }> = [];
	const sources: string[] = [];
	let offset = 0;
	for (const citation of [...citations].sort((a, b) => a.startIndex - b.startIndex)) {
		const source = webSource(citation);
		if (
			!source ||
			citation.startIndex < offset ||
			citation.endIndex > text.length ||
			citation.endIndex < citation.startIndex
		)
			continue;
		if (!sources.includes(source.url)) sources.push(source.url);
		const number = sources.indexOf(source.url) + 1;
		segments.push({ text: text.slice(offset, citation.startIndex) });
		const label = text.slice(citation.startIndex, citation.endIndex);
		segments.push({
			text: !label || /[【】]/.test(label) ? `[${number}]` : label,
			source,
			number
		});
		offset = citation.endIndex;
	}
	segments.push({ text: text.slice(offset) });
	return segments;
}

export function researchSources(trace?: ResearchTrace): WebSource[] {
	const sources = new Map<string, WebSource>();
	for (const value of [
		...(trace?.citations ?? []),
		...(trace?.searches.flatMap((search) => search.sources) ?? [])
	]) {
		const source = webSource(value);
		if (source && !sources.has(source.url)) sources.set(source.url, source);
	}
	return [...sources.values()];
}
