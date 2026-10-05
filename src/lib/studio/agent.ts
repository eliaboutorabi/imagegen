import { z } from 'zod';
import { DEFAULT_TEXT_MODEL } from './models';
import { readSseStream, type OpenAIStreamEvent } from './stream';
import type { AgentEvent, InfographicConcept, PlanInput, PlanResult } from './types';

const REQUEST_TIMEOUT = 180_000;

const conceptSchema = z.object({
	title: z.string().min(1),
	strapline: z.string().min(1),
	prompt: z.string().min(1),
	rationale: z.string().min(1),
	layout: z.string().min(1),
	palette: z.array(z.string()).min(3).max(4)
});

const planSchema = z.object({
	intro: z.string().min(1),
	researched: z.boolean(),
	researchNote: z.string(),
	concepts: z.array(conceptSchema)
});

function uid() {
	return crypto.randomUUID();
}

function planJsonSchema(count: number) {
	return {
		type: 'object',
		additionalProperties: false,
		required: ['intro', 'researched', 'researchNote', 'concepts'],
		properties: {
			intro: { type: 'string' },
			researched: { type: 'boolean' },
			researchNote: { type: 'string' },
			concepts: {
				type: 'array',
				minItems: count,
				maxItems: count,
				items: {
					type: 'object',
					additionalProperties: false,
					required: ['title', 'strapline', 'prompt', 'rationale', 'layout', 'palette'],
					properties: {
						title: { type: 'string' },
						strapline: { type: 'string' },
						prompt: { type: 'string' },
						rationale: { type: 'string' },
						layout: { type: 'string' },
						palette: {
							type: 'array',
							minItems: 3,
							maxItems: 4,
							items: { type: 'string' }
						}
					}
				}
			}
		}
	};
}

function extractResponseText(response: unknown) {
	const candidate = response as {
		output_text?: string;
		output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
	};
	if (candidate?.output_text) return candidate.output_text;
	return (candidate?.output ?? [])
		.flatMap((item) => item.content ?? [])
		.filter((item) => item.type === 'output_text')
		.map((item) => item.text ?? '')
		.join('');
}

function decodeJsonString(value: string) {
	try {
		return JSON.parse(`"${value}"`) as string;
	} catch {
		return value.replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
	}
}

function stringValues(raw: string, field: string) {
	const values: string[] = [];
	const pattern = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'g');
	for (const match of raw.matchAll(pattern)) values.push(decodeJsonString(match[1]));
	// Publish the unfinished last string too: a prompt should grow token by
	// token, not appear only once its closing quote has arrived.
	const open = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)$`).exec(raw);
	if (open) values.push(decodeJsonString(open[1]));
	return values;
}

export function partialConceptsFromJson(raw: string, count: number) {
	const fields = {
		title: stringValues(raw, 'title'),
		strapline: stringValues(raw, 'strapline'),
		prompt: stringValues(raw, 'prompt'),
		rationale: stringValues(raw, 'rationale'),
		layout: stringValues(raw, 'layout')
	};
	const palettes: string[][] = [];
	for (const match of raw.matchAll(/"palette"\s*:\s*\[([^\]]*)\]/g)) {
		palettes.push(
			[...match[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((color) => decodeJsonString(color[1]))
		);
	}
	return Array.from({ length: count }, (_, index) => ({
		...(fields.title[index] ? { title: fields.title[index] } : {}),
		...(fields.strapline[index] ? { strapline: fields.strapline[index] } : {}),
		...(fields.prompt[index] ? { prompt: fields.prompt[index] } : {}),
		...(fields.rationale[index] ? { rationale: fields.rationale[index] } : {}),
		...(fields.layout[index] ? { layout: fields.layout[index] } : {}),
		...(palettes[index]?.length ? { palette: palettes[index] } : {})
	}));
}

async function throwApiError(response: Response) {
	const body = (await response.json().catch(() => ({}))) as {
		error?: { message?: string; code?: string; type?: string; param?: string };
	};
	const error = new Error(body.error?.message ?? `OpenAI request failed (${response.status}).`);
	Object.assign(error, {
		status: response.status,
		code: body.error?.code,
		type: body.error?.type,
		param: body.error?.param,
		request_id: response.headers.get('x-request-id') ?? undefined
	});
	throw error;
}

function streamError(event: OpenAIStreamEvent) {
	const failed = event.response as { error?: { message?: string; code?: string; type?: string } };
	const details = event.error ?? failed?.error;
	const error = new Error(details?.message ?? 'OpenAI stopped the response before it completed.');
	Object.assign(error, { code: details?.code, type: details?.type });
	return error;
}

function isUnavailableModelError(error: unknown) {
	if (!error || typeof error !== 'object') return false;
	const candidate = error as { status?: number; code?: string; message?: string };
	return (
		candidate.code === 'model_not_found' ||
		/MODEL_NOT_FOUND|model [`'"]?.+[`'"]? does not exist|do not have access to it/i.test(
			candidate.message ?? ''
		)
	);
}

function plannerCandidates(requested?: string) {
	return [
		...new Set([
			requested || DEFAULT_TEXT_MODEL,
			DEFAULT_TEXT_MODEL,
			'gpt-5.6-luna',
			'gpt-5.4',
			'gpt-5'
		])
	];
}

function demoPlan(input: PlanInput): PlanResult {
	const topic = input.topic.replace(/[.!?]+$/, '');
	const styles = input.styleLabels.length ? input.styleLabels : ['Editorial narrative'];
	const shared = (index: number) =>
		`Create a premium ${input.imageWidth}×${input.imageHeight} ${input.aspect} infographic about “${topic}” for ${input.audience.toLowerCase()}. Use ${styles[index % styles.length]} as the primary visual language${
			styles.length > input.count
				? `, thoughtfully borrowing compatible details from ${
						styles
							.filter((_, styleIndex) => styleIndex % input.count === index)
							.slice(1)
							.join(' and ') || 'the approved shortlist'
					}`
				: ''
		}. ${input.customDirection ? `Additional art direction: ${input.customDirection}. ` : ''}Use impeccable typography, clear information hierarchy, generous negative space, concise editorial copy, and accurate legible labels. Density ${input.density}/3. No logos, mockups, watermarks, or decorative filler.`;
	const concepts: InfographicConcept[] = [
		{
			id: uid(),
			title: 'The signal map',
			strapline: 'One idea, revealed through connected evidence.',
			prompt: `${shared(0)} Organize the story as a central signal map: one bold thesis in the center, four connected evidence nodes, a slim annotation rail, and a decisive takeaway footer. Use restrained data marks and subtle directional lines.`,
			rationale: 'A connected map makes relationships and causality easy to scan.',
			layout: 'Central thesis · four evidence nodes · takeaway rail',
			palette: ['#F2F0E8', '#141414', '#FF5A3D', '#7357FF']
		},
		{
			id: uid(),
			title: 'Then / now / next',
			strapline: 'A cinematic timeline with a point of view.',
			prompt: `${shared(1)} Tell the story as a three-act horizontal timeline labeled THEN, NOW, and NEXT. Give each act a distinct scale and rhythm, with one hero statistic, two supporting facts, and a small visual metaphor. Finish with one forward-looking conclusion.`,
			rationale: 'The temporal structure turns a broad topic into a memorable narrative.',
			layout: 'Three-act timeline · hero statistics · closing forecast',
			palette: ['#11141A', '#F2F0E8', '#CBFF58', '#6A5CFF']
		},
		{
			id: uid(),
			title: 'The field guide',
			strapline: 'A collectible visual system for the essential ideas.',
			prompt: `${shared(2)} Design a modular field guide with six numbered cards in an asymmetric grid. Each card pairs a concise insight with a tiny diagram or symbol. Add a strong title block, a one-line legend, and a final “remember this” panel.`,
			rationale: 'Modular cards make dense information approachable and reusable.',
			layout: 'Title block · six modular cards · memory panel',
			palette: ['#E8F2E5', '#214F3B', '#D97954', '#F2C85B']
		}
	];
	return {
		intro: `I shaped three distinct ways to make ${topic} immediately understandable.`,
		concepts,
		researched: false,
		researchNote: 'Demo concepts use your brief only. Connect OpenAI to research and generate.',
		modelUsed: null
	};
}

async function requestPlan(
	input: PlanInput,
	apiKey: string,
	model: string,
	onEvent: (event: AgentEvent) => void,
	signal?: AbortSignal
) {
	const response = await fetch('https://api.openai.com/v1/responses', {
		method: 'POST',
		headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model,
			store: false,
			stream: true,
			instructions:
				'You are a senior infographic creative director. Produce sharply differentiated, production-ready directions with accurate, concise on-canvas copy. Use web search only when current facts materially affect accuracy. Every direction must use a different story structure, information architecture, and topic-specific visual metaphor. Treat every visual language in the approved shortlist as intentional user input: distribute them across the directions, give each direction a clear primary style, combine compatible shortlisted styles only when needed to represent a shortlist longer than the direction count, and never silently discard an approved style.',
			input: `Topic: ${input.topic}\nApproved visual-language shortlist:\n${input.styleLabels.map((style, index) => `${index + 1}. ${style}`).join('\n')}\n${input.customDirection ? `Additional art direction: ${input.customDirection}\n` : ''}Audience: ${input.audience}\nFormat: ${input.aspect}\nCanvas: ${input.imageWidth}×${input.imageHeight}\nInformation density: ${input.density}/3\n${input.researchContext ? `Verified research (cite sources in the rationale; never invent data):\n${input.researchContext}\n` : 'Use stable facts only. Never fabricate statistics.\n'}Create exactly ${input.count} original directions. Each image prompt must include the actual on-canvas text, a topic-specific visual metaphor, hierarchy, layout, typography and color guidance. Explicitly name its primary approved visual language.`,
			...(/^gpt-[56]/.test(model) ? { reasoning: { effort: 'low' } } : {}),
			text: {
				format: {
					type: 'json_schema',
					name: 'infographic_plan',
					strict: true,
					schema: planJsonSchema(input.count)
				}
			}
		}),
		signal: signal
			? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT)])
			: AbortSignal.timeout(REQUEST_TIMEOUT)
	});
	if (!response.ok) await throwApiError(response);

	let raw = '';
	let completedResponse: unknown;
	let usedSearch = false;
	const started = new Set<number>();
	const ready = new Map<number, InfographicConcept>();
	const previous = new Map<number, string>();

	function publishProgress() {
		const partials = partialConceptsFromJson(raw, input.count);
		for (const [offset, partial] of partials.entries()) {
			const index = offset + 1;
			if (!Object.keys(partial).length) continue;
			if (!started.has(index)) {
				started.add(index);
				onEvent({
					type: 'direction-start',
					index,
					label: partial.title || `Direction ${index}`,
					model
				});
			}
			const serialized = JSON.stringify(partial);
			if (previous.get(index) !== serialized) {
				previous.set(index, serialized);
				onEvent({ type: 'direction-progress', index, partial, model });
			}
		}
		// Never spend on an unfinished prompt. Only publish a renderable card
		// once the whole JSON document is valid (before the final SSE event).
		try {
			const complete = planSchema.safeParse(JSON.parse(raw));
			if (complete.success && complete.data.concepts.length === input.count) {
				for (const [offset, data] of complete.data.concepts.entries()) {
					const index = offset + 1;
					if (ready.has(index)) continue;
					const concept = { ...data, id: uid() };
					ready.set(index, concept);
					onEvent({ type: 'direction-ready', index, concept, model });
				}
			}
		} catch {
			/* A partial JSON document is expected while streaming. */
		}
	}

	if (response.headers.get('content-type')?.includes('application/json')) {
		raw = extractResponseText(await response.json());
		publishProgress();
	} else {
		await readSseStream(response, (event) => {
			if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
				raw += event.delta;
				onEvent({ type: 'drafting', delta: event.delta, model });
				publishProgress();
			}
			if (event.type === 'response.completed') completedResponse = event.response;
			if (event.type.includes('web_search_call')) {
				if (!usedSearch) {
					usedSearch = true;
					onEvent({ type: 'research-start', query: input.topic });
				}
				if (event.type.endsWith('.completed'))
					onEvent({ type: 'research-complete', query: input.topic });
			}
			if (event.type === 'error' || event.type === 'response.failed') throw streamError(event);
		});
	}

	if (!raw && completedResponse) raw = extractResponseText(completedResponse);
	if (!raw) throw new Error('OpenAI completed the plan without returning direction text.');
	const parsed = planSchema.parse(JSON.parse(raw));
	if (parsed.concepts.length !== input.count) {
		throw new Error(`Expected ${input.count} directions, received ${parsed.concepts.length}.`);
	}
	return {
		...parsed,
		concepts: parsed.concepts.map(
			(concept, index) => ready.get(index + 1) ?? { ...concept, id: uid() }
		),
		researched: parsed.researched || usedSearch || Boolean(input.researchContext)
	};
}

export async function planInfographics(
	input: PlanInput,
	apiKey: string,
	onEvent: (event: AgentEvent) => void,
	signal?: AbortSignal
): Promise<PlanResult> {
	if (!apiKey) return demoPlan(input);

	const runtimeStage = 'requesting-streamed-plan';
	let activeModel = input.plannerModel || DEFAULT_TEXT_MODEL;
	const attemptedModels: string[] = [];
	try {
		onEvent({ type: 'thinking', label: 'Reading the brief' });
		const candidates = plannerCandidates(input.plannerModel);
		for (const [index, model] of candidates.entries()) {
			activeModel = model;
			attemptedModels.push(model);
			onEvent({ type: 'planning', label: `Planning with ${model}` });
			try {
				const structures = [
					'a relationship / systems map',
					'a narrative sequence or comparison',
					'a practical visual field guide',
					'a data-led hierarchy',
					'a process diagram',
					'a visual explainer'
				];
				const results = await Promise.allSettled(
					Array.from({ length: input.count }, async (_, offset) => {
						const styles = input.styleLabels.filter((_, index) => index % input.count === offset);
						const labels = styles.length
							? styles
							: [input.styleLabels[offset % input.styleLabels.length] || 'Editorial narrative'];
						onEvent({
							type: 'direction-start',
							index: offset + 1,
							label: `Direction ${offset + 1}`,
							model
						});
						return requestPlan(
							{
								...input,
								count: 1,
								styleLabels: labels,
								customDirection: `${input.customDirection || ''}\nThis is independent direction ${offset + 1}. Explore ${structures[offset % structures.length]}; do not use a generic template.`
							},
							apiKey,
							model,
							(event) => {
								if ('index' in event) onEvent({ ...event, index: offset + 1 });
								else onEvent(event);
							},
							signal
						);
					})
				);
				if (signal?.aborted) throw signal.reason;
				const fulfilled = results.flatMap((result) =>
					result.status === 'fulfilled' ? [result.value] : []
				);
				if (!fulfilled.length) throw (results[0] as PromiseRejectedResult).reason;
				const warnings = results.flatMap((result, offset) => {
					if (result.status === 'fulfilled') return [];
					const message =
						result.reason instanceof Error
							? result.reason.message
							: 'This direction could not be completed.';
					onEvent({ type: 'direction-error', index: offset + 1, message });
					return [`Direction ${offset + 1}: ${message}`];
				});
				return {
					intro: `${fulfilled.length} distinct visual direction${fulfilled.length === 1 ? '' : 's'}, written for your brief.`,
					concepts: fulfilled.flatMap((plan) => plan.concepts),
					researched: fulfilled.some((plan) => plan.researched),
					researchNote: input.researchContext || '',
					modelUsed: model,
					warnings
				};
			} catch (error) {
				if (isUnavailableModelError(error) && index < candidates.length - 1) continue;
				throw error;
			}
		}
		throw new Error('No compatible creative-director model is available for this project.');
	} catch (error) {
		if (error && typeof error === 'object') {
			Object.assign(error, {
				modyfiStage: runtimeStage,
				modyfiModel: activeModel,
				modyfiAttemptedModels: attemptedModels
			});
		}
		throw error;
	}
}
