import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateImage } from './openai';
import type { ReferenceAsset } from './types';

const baseInput = {
	apiKey: 'test-key',
	model: 'gpt-image-2',
	prompt: 'Create an infographic',
	quality: 'medium' as const,
	aspect: 'landscape' as const,
	width: 2048,
	height: 1152,
	variation: 1,
	totalVariations: 1,
	outputFormat: 'webp' as const
};

function successfulFetch() {
	return vi.fn().mockResolvedValue(
		new Response(JSON.stringify({ data: [{ b64_json: 'generated-image' }] }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		})
	);
}

afterEach(() => vi.unstubAllGlobals());

describe('GPT Image requests', () => {
	it('uses generations for a text-only prompt', async () => {
		const fetchMock = successfulFetch();
		vi.stubGlobal('fetch', fetchMock);

		await generateImage({ ...baseInput, references: [] });

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://api.openai.com/v1/images/generations');
		expect(JSON.parse(String(init.body))).toMatchObject({
			model: 'gpt-image-2',
			size: '2048x1152',
			prompt: 'Create an infographic',
			output_format: 'webp',
			stream: true,
			partial_images: 2
		});
	});

	it('uses multipart edits and ordered image inputs when references are attached', async () => {
		const fetchMock = successfulFetch();
		vi.stubGlobal('fetch', fetchMock);
		const reference: ReferenceAsset = {
			id: 'reference-1',
			name: 'brand-board.png',
			mimeType: 'image/png',
			dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
			width: 100,
			height: 100,
			createdAt: 1,
			source: 'generation',
			sourcePrompt: 'A precise cobalt and cream systems diagram'
		};

		await generateImage({ ...baseInput, references: [reference] });

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://api.openai.com/v1/images/edits');
		expect(init.body).toBeInstanceOf(FormData);
		const form = init.body as FormData;
		expect(form.get('size')).toBe('2048x1152');
		expect(form.getAll('image[]')).toHaveLength(1);
		expect(String(form.get('prompt'))).toContain('Image 1: brand-board.png');
		expect(String(form.get('prompt'))).toContain('A precise cobalt and cream systems diagram');
		expect(form.get('stream')).toBe('true');
		expect(form.get('partial_images')).toBe('2');
		expect(new Headers(init.headers).has('Content-Type')).toBe(false);
	});

	it('surfaces partial images before returning the completed render', async () => {
		const encoder = new TextEncoder();
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					new ReadableStream({
						start(controller) {
							controller.enqueue(
								encoder.encode(
									'event: image_generation.partial_image\ndata: {"type":"image_generation.partial_image","b64_json":"partial","partial_image_index":0}\n\n'
								)
							);
							controller.enqueue(
								encoder.encode(
									'event: image_generation.completed\ndata: {"type":"image_generation.completed","b64_json":"final"}\n\n'
								)
							);
							controller.close();
						}
					}),
					{ headers: { 'content-type': 'text/event-stream' } }
				)
			)
		);
		const partials: Array<{ imageUrl: string; index: number }> = [];
		const image = await generateImage({
			...baseInput,
			references: [],
			onPartial: (imageUrl, index) => partials.push({ imageUrl, index })
		});

		expect(partials).toEqual([{ imageUrl: 'data:image/webp;base64,partial', index: 0 }]);
		expect(image).toBe('data:image/webp;base64,final');
	});
});
