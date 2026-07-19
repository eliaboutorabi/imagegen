export interface OpenAIStreamEvent {
	type: string;
	delta?: string;
	b64_json?: string;
	partial_image_index?: number;
	response?: unknown;
	error?: { message?: string; code?: string; type?: string };
}

function parseEventBlock(block: string): OpenAIStreamEvent | null {
	let eventName = '';
	const data: string[] = [];
	for (const line of block.split('\n')) {
		if (line.startsWith('event:')) eventName = line.slice(6).trim();
		if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
	}
	const payload = data.join('\n').trim();
	if (!payload || payload === '[DONE]') return null;
	const parsed = JSON.parse(payload) as Partial<OpenAIStreamEvent>;
	return { ...parsed, type: parsed.type || eventName } as OpenAIStreamEvent;
}

export function createSseParser(onEvent: (event: OpenAIStreamEvent) => void) {
	let buffer = '';

	function drain(complete = false) {
		buffer = buffer.replace(/\r\n/g, '\n');
		let boundary = buffer.indexOf('\n\n');
		while (boundary >= 0) {
			const event = parseEventBlock(buffer.slice(0, boundary));
			buffer = buffer.slice(boundary + 2);
			if (event) onEvent(event);
			boundary = buffer.indexOf('\n\n');
		}
		if (complete && buffer.trim()) {
			const event = parseEventBlock(buffer);
			if (event) onEvent(event);
			buffer = '';
		}
	}

	return {
		push(chunk: string) {
			buffer += chunk;
			drain();
		},
		finish() {
			drain(true);
		}
	};
}

export async function readSseStream(
	response: Response,
	onEvent: (event: OpenAIStreamEvent) => void
) {
	if (!response.body) throw new Error('OpenAI returned an empty streaming response.');
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	const parser = createSseParser(onEvent);
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		parser.push(decoder.decode(value, { stream: true }));
	}
	parser.push(decoder.decode());
	parser.finish();
}
