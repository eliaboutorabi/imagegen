import { describe, expect, it } from 'vitest';
import { createSseParser, type OpenAIStreamEvent } from './stream';

describe('OpenAI SSE parser', () => {
	it('parses response deltas across arbitrary network chunks', () => {
		const events: OpenAIStreamEvent[] = [];
		const parser = createSseParser((event) => events.push(event));
		parser.push('event: response.output_text.delta\r\ndata: {"type":"response.output_');
		parser.push('text.delta","delta":"Hel"}\r\n\r\nevent: response.output_text.delta\n');
		parser.push('data: {"type":"response.output_text.delta","delta":"lo"}\n\n');
		parser.finish();
		expect(events.map((event) => event.delta).join('')).toBe('Hello');
	});

	it('parses partial and completed image events', () => {
		const events: OpenAIStreamEvent[] = [];
		const parser = createSseParser((event) => events.push(event));
		parser.push(
			'event: image_generation.partial_image\ndata: {"type":"image_generation.partial_image","b64_json":"partial","partial_image_index":0}\n\n'
		);
		parser.push(
			'event: image_generation.completed\ndata: {"type":"image_generation.completed","b64_json":"final"}\n\n'
		);
		parser.finish();
		expect(events.map((event) => event.type)).toEqual([
			'image_generation.partial_image',
			'image_generation.completed'
		]);
		expect(events[1].b64_json).toBe('final');
	});
});
