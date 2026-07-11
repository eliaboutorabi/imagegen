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
			output_format: 'webp'
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
			source: 'upload'
		};

		await generateImage({ ...baseInput, references: [reference] });

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://api.openai.com/v1/images/edits');
		expect(init.body).toBeInstanceOf(FormData);
		const form = init.body as FormData;
		expect(form.get('size')).toBe('2048x1152');
		expect(form.getAll('image[]')).toHaveLength(1);
		expect(String(form.get('prompt'))).toContain('Image 1: brand-board.png');
		expect(new Headers(init.headers).has('Content-Type')).toBe(false);
	});
});
