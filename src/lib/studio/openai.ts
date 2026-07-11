import { ASPECT_SIZES } from './styles';
import { recordDiagnostic } from './diagnostics';
import type { Aspect, Generation, ImageFormat, ImageQuality, ReferenceAsset } from './types';

interface GenerateImageInput {
	apiKey: string;
	model: string;
	prompt: string;
	quality: ImageQuality;
	aspect: Aspect;
	width: number;
	height: number;
	variation: number;
	totalVariations: number;
	references: ReferenceAsset[];
	outputFormat: ImageFormat;
}

interface OpenAIErrorBody {
	error?: { message?: string; code?: string; type?: string; param?: string };
}

function apiError(response: Response, body: OpenAIErrorBody, fallback: string) {
	const error = new Error(body.error?.message ?? fallback);
	Object.assign(error, {
		status: response.status,
		code: body.error?.code,
		type: body.error?.type,
		param: body.error?.param,
		request_id: response.headers.get('x-request-id') ?? undefined
	});
	return error;
}

function dataUrlToBlob(dataUrl: string, fallbackType: string) {
	const comma = dataUrl.indexOf(',');
	if (comma === -1) throw new Error('A reference image could not be read.');
	const header = dataUrl.slice(0, comma);
	const payload = dataUrl.slice(comma + 1);
	const mimeType = header.match(/^data:([^;,]+)/)?.[1] || fallbackType;
	const binary = header.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
	return new Blob([bytes], { type: mimeType });
}

function promptWithReferences(prompt: string, references: ReferenceAsset[]) {
	if (!references.length) return prompt;
	const index = references
		.map((asset, position) => `Image ${position + 1}: ${asset.name}`)
		.join('; ');
	return `${prompt}\n\nReference images are attached in this order: ${index}. Use the relevant subjects, visual identity, palette, composition, and layout cues from these images as reference material while following the requested infographic brief.`;
}

export async function generateImage(input: GenerateImageInput): Promise<string> {
	const variationDirection =
		input.totalVariations > 1
			? `\n\nVariation ${input.variation} of ${input.totalVariations}: preserve the core information and art direction, but make the composition and visual rhythm meaningfully distinct from sibling variations.`
			: '';

	const prompt = promptWithReferences(`${input.prompt}${variationDirection}`, input.references);
	const size = input.model.startsWith('gpt-image-2')
		? `${input.width}x${input.height}`
		: ASPECT_SIZES[input.aspect];
	let response: Response;

	if (input.references.length) {
		const form = new FormData();
		form.append('model', input.model);
		form.append('prompt', prompt);
		form.append('quality', input.quality);
		form.append('size', size);
		form.append('output_format', input.outputFormat);
		form.append('background', 'opaque');
		for (const [index, reference] of input.references.entries()) {
			const blob = dataUrlToBlob(reference.dataUrl, reference.mimeType);
			const safeName = reference.name.replace(/[^a-z0-9._-]+/gi, '-');
			form.append('image[]', blob, safeName || `reference-${index + 1}.png`);
		}
		response = await fetch('https://api.openai.com/v1/images/edits', {
			method: 'POST',
			headers: { Authorization: `Bearer ${input.apiKey}` },
			body: form
		});
	} else {
		response = await fetch('https://api.openai.com/v1/images/generations', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${input.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: input.model,
				prompt,
				quality: input.quality,
				size,
				output_format: input.outputFormat,
				background: 'opaque'
			})
		});
	}

	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as OpenAIErrorBody;
		throw apiError(response, body, `Image generation failed (${response.status}).`);
	}

	const result = (await response.json()) as { data?: Array<{ b64_json?: string }> };
	const image = result.data?.[0]?.b64_json;
	if (!image) throw new Error('OpenAI returned no image data.');
	const mimeType = input.outputFormat === 'jpeg' ? 'image/jpeg' : `image/${input.outputFormat}`;
	return `data:${mimeType};base64,${image}`;
}

export async function runGenerationBatch(
	generations: Generation[],
	options: {
		apiKey: string;
		model: string;
		quality: ImageQuality;
		aspect: Aspect;
		width: number;
		height: number;
		references: ReferenceAsset[];
		outputFormat: ImageFormat;
	},
	onUpdate: (generation: Generation) => void
) {
	await Promise.allSettled(
		generations.map(async (generation) => {
			onUpdate({ ...generation, status: 'generating' });
			try {
				const imageUrl = await generateImage({
					...options,
					quality: generation.quality ?? options.quality,
					outputFormat: generation.outputFormat ?? options.outputFormat,
					prompt: generation.prompt,
					variation: generation.variation,
					totalVariations: generation.totalVariations,
					width: generation.width ?? options.width,
					height: generation.height ?? options.height,
					references: options.references.filter((asset) =>
						(generation.referenceIds ?? []).includes(asset.id)
					)
				});
				onUpdate({ ...generation, status: 'complete', imageUrl });
			} catch (error) {
				recordDiagnostic('image-generation', error, {
					model: options.model,
					quality: generation.quality ?? options.quality,
					outputFormat: generation.outputFormat ?? options.outputFormat,
					aspect: options.aspect,
					variation: generation.variation
				});
				onUpdate({
					...generation,
					status: 'error',
					error: error instanceof Error ? error.message : 'Image generation failed.'
				});
			}
		})
	);
}
