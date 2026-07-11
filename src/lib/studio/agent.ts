import { tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import type { AgentEvent, InfographicConcept, PlanInput, PlanResult } from './types';

const conceptSchema = z.object({
	title: z.string().describe('A short, memorable concept title'),
	strapline: z.string().describe('A crisp one-sentence creative hook'),
	prompt: z.string().describe('A complete production-ready image generation prompt'),
	rationale: z.string().describe('Why this visual structure helps explain the topic'),
	layout: z.string().describe('A compact description of the information layout'),
	palette: z.array(z.string()).min(3).max(4).describe('Three or four hex colors')
});

const planSummarySchema = z.object({
	intro: z.string().describe('A short creative-director introduction to the concepts'),
	researched: z.boolean(),
	researchNote: z
		.string()
		.describe('A concise note about research performed, or an empty string when none was needed')
});

const directionBriefSchema = z.object({
	index: z.number().int().min(1).max(3),
	creativeAngle: z.string().describe('A distinct editorial or explanatory angle'),
	storyStructure: z.string().describe('The unique narrative structure for this direction'),
	informationArchitecture: z.string().describe('A layout approach unlike the other directions'),
	visualMetaphor: z.string().describe('A topic-specific visual metaphor or design device')
});

function uid() {
	return crypto.randomUUID();
}

function extractResponseText(response: unknown) {
	const candidate = response as {
		output_text?: string;
		output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
	};
	if (candidate.output_text) return candidate.output_text;
	return (candidate.output ?? [])
		.flatMap((item) => item.content ?? [])
		.filter((item) => item.type === 'output_text')
		.map((item) => item.text ?? '')
		.join('\n');
}

async function performWebSearch(apiKey: string, query: string, model: string) {
	const response = await fetch('https://api.openai.com/v1/responses', {
		method: 'POST',
		headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model,
			input: `Research only the current, verifiable facts needed to design an accurate infographic about: ${query}. Return a concise fact sheet with source names and dates.`,
			tools: [{ type: 'web_search' }],
			reasoning: { effort: 'low' }
		})
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as {
			error?: { message?: string; code?: string; type?: string };
		};
		const error = new Error(body.error?.message ?? `Web research failed (${response.status}).`);
		Object.assign(error, {
			status: response.status,
			code: body.error?.code,
			type: body.error?.type,
			request_id: response.headers.get('x-request-id') ?? undefined,
			modyfiStage: 'web-research'
		});
		throw error;
	}
	return extractResponseText(await response.json());
}

function isUnavailableModelError(error: unknown) {
	if (!error || typeof error !== 'object') return false;
	const candidate = error as { status?: number; code?: string; message?: string };
	const message = candidate.message ?? '';
	return (
		candidate.code === 'model_not_found' ||
		/MODEL_NOT_FOUND|model [`'"]?.+[`'"]? does not exist|do not have access to it/i.test(message)
	);
}

function plannerCandidates(requested?: string) {
	return [...new Set([requested || 'gpt-5.4', 'gpt-5.4', 'gpt-5', 'gpt-4.1'])];
}

function streamedText(payload: unknown) {
	if (!Array.isArray(payload)) return '';
	const message = payload[0] as {
		content?: unknown;
		tool_call_chunks?: Array<{ args?: string }>;
	};
	let text = '';

	if (typeof message?.content === 'string') text += message.content;
	if (Array.isArray(message?.content)) {
		text += message.content
			.map((part) =>
				part && typeof part === 'object' && 'text' in part
					? String((part as { text?: unknown }).text ?? '')
					: ''
			)
			.join('');
	}
	text += (message?.tool_call_chunks ?? []).map((chunk) => chunk.args ?? '').join('');
	return text;
}

function demoPlan(input: PlanInput): PlanResult {
	const topic = input.topic.replace(/[.!?]+$/, '');
	const shared = `Create a premium ${input.imageWidth}×${input.imageHeight} ${input.aspect} infographic about “${topic}” for ${input.audience.toLowerCase()}. Use a ${input.styleLabel.toLowerCase()} visual language, impeccable typography, clear information hierarchy, generous negative space, concise editorial copy, and accurate legible labels. Density ${input.density}/3. No logos, mockups, watermarks, or decorative filler.`;
	const concepts: InfographicConcept[] = [
		{
			id: uid(),
			title: 'The signal map',
			strapline: 'One idea, revealed through connected evidence.',
			prompt: `${shared} Organize the story as a central signal map: one bold thesis in the center, four connected evidence nodes, a slim annotation rail, and a decisive takeaway footer. Use restrained data marks and subtle directional lines.`,
			rationale: 'A connected map makes relationships and causality easy to scan.',
			layout: 'Central thesis · four evidence nodes · takeaway rail',
			palette: ['#F2F0E8', '#141414', '#FF5A3D', '#7357FF']
		},
		{
			id: uid(),
			title: 'Then / now / next',
			strapline: 'A cinematic timeline with a point of view.',
			prompt: `${shared} Tell the story as a three-act horizontal timeline labeled THEN, NOW, and NEXT. Give each act a distinct scale and rhythm, with one hero statistic, two supporting facts, and a small visual metaphor. Finish with one forward-looking conclusion.`,
			rationale: 'The temporal structure turns a broad topic into a memorable narrative.',
			layout: 'Three-act timeline · hero statistics · closing forecast',
			palette: ['#11141A', '#F2F0E8', '#CBFF58', '#6A5CFF']
		},
		{
			id: uid(),
			title: 'The field guide',
			strapline: 'A collectible visual system for the essential ideas.',
			prompt: `${shared} Design a modular field guide with six numbered cards in an asymmetric grid. Each card pairs a concise insight with a tiny diagram or symbol. Add a strong title block, a one-line legend, and a final “remember this” panel.`,
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

export async function planInfographics(
	input: PlanInput,
	apiKey: string,
	onEvent: (event: AgentEvent) => void
): Promise<PlanResult> {
	if (!apiKey) return demoPlan(input);

	let runtimeStage = 'initializing-agent';
	let activeModel = input.plannerModel || 'gpt-5.4';
	const attemptedModels: string[] = [];

	try {
		onEvent({ type: 'thinking', label: 'Reading the brief' });

		runtimeStage = 'loading-deep-agents';
		const [{ createDeepAgent }, { MemorySaver }] = await Promise.all([
			import('deepagents/browser'),
			import('@langchain/langgraph')
		]);

		for (const [index, modelName] of plannerCandidates(input.plannerModel).entries()) {
			activeModel = modelName;
			attemptedModels.push(modelName);

			if (index > 0) {
				onEvent({ type: 'planning', label: `Trying compatible planner ${modelName}` });
				console.warn(
					`[Lattice] Planner ${attemptedModels[index - 1]} is unavailable; trying ${modelName}.`
				);
			}

			try {
				let publishedPlan:
					| (z.infer<typeof planSummarySchema> & { concepts: z.infer<typeof conceptSchema>[] })
					| undefined;
				const developedDirections = new Map<number, z.infer<typeof conceptSchema>>();
				const searchWeb = tool(
					async ({ query }: { query: string }) => {
						onEvent({ type: 'research-start', query });
						const result = await performWebSearch(apiKey, query, modelName);
						onEvent({ type: 'research-complete', query });
						return result;
					},
					{
						name: 'search_web',
						description:
							'Search current sources when the requested infographic depends on recent facts, dates, rankings, statistics, people, products, or events. Skip this for timeless conceptual topics.',
						schema: z.object({ query: z.string() })
					}
				);
				const developDirection = tool(
					async (brief: z.infer<typeof directionBriefSchema>) => {
						onEvent({
							type: 'direction-start',
							index: brief.index,
							label: brief.creativeAngle,
							model: modelName
						});
						const directionModel = model.withStructuredOutput(conceptSchema, {
							name: `infographic_direction_${brief.index}`,
							method: 'jsonSchema',
							strict: true
						});
						const directionStream = await directionModel.stream([
							{
								role: 'system',
								content:
									'You are a senior infographic designer. Return one complete, production-ready direction matching the provided schema. Write the image prompt from scratch for this exact subject. Include the concise on-canvas copy and precise information architecture needed by the image model.'
							},
							{
								role: 'user',
								content: `Topic: ${input.topic}\nCreative strategy: ${input.styleLabel}\nAudience: ${input.audience}\nCanvas: ${input.imageWidth}×${input.imageHeight}\nDensity: ${input.density}/3\nDirection ${brief.index}: ${brief.creativeAngle}\nStory structure: ${brief.storyStructure}\nInformation architecture: ${brief.informationArchitecture}\nVisual metaphor: ${brief.visualMetaphor}`
							}
						]);

						let partial: Partial<z.infer<typeof conceptSchema>> = {};
						for await (const chunk of directionStream) {
							partial = { ...partial, ...chunk };
							onEvent({
								type: 'direction-progress',
								index: brief.index,
								partial: { ...partial },
								model: modelName
							});
						}

						const concept = conceptSchema.parse(partial);
						developedDirections.set(brief.index, concept);
						onEvent({
							type: 'direction-ready',
							index: brief.index,
							concept: { ...concept, id: uid() },
							model: modelName
						});
						return JSON.stringify(concept);
					},
					{
						name: 'develop_infographic_direction',
						description:
							'Develop one original infographic direction with a dedicated model call. Issue exactly three calls together so they run in parallel.',
						schema: directionBriefSchema
					}
				);
				const publishPlan = tool(
					async (summary: z.infer<typeof planSummarySchema>) => {
						const concepts = [...developedDirections.entries()]
							.sort(([left], [right]) => left - right)
							.map(([, concept]) => concept);
						if (concepts.length !== input.count) {
							throw new Error(
								`Publish blocked: expected ${input.count} developed directions, received ${concepts.length}.`
							);
						}
						publishedPlan = { ...summary, concepts };
						return `Published ${concepts.length} validated infographic directions.`;
					},
					{
						name: 'publish_infographic_plan',
						description:
							'Publish the complete, final infographic plan to the generative UI. Call this exactly once after research and creative development are complete.',
						schema: planSummarySchema
					}
				);

				runtimeStage = 'creating-openai-model';
				const model = new ChatOpenAI({
					model: modelName,
					apiKey,
					useResponsesApi: true,
					reasoning: { effort: 'low' },
					configuration: { dangerouslyAllowBrowser: true }
				});

				runtimeStage = 'creating-deep-agent';
				const agent = createDeepAgent({
					name: 'infographic-director',
					model,
					tools: [searchWeb, developDirection, publishPlan],
					checkpointer: new MemorySaver(),
					systemPrompt: `You are an exceptional infographic creative director orchestrating a generative UI. Decide first whether fresh web research is materially necessary, and call search_web only when it is. Then design exactly ${input.count} sharply differentiated creative briefs. In ONE assistant turn, issue exactly ${input.count} develop_infographic_direction tool calls together so the harness executes their dedicated model calls in parallel. Each call must use a different story structure, information architecture, and topic-specific visual metaphor. Never call them sequentially. Once all direction tools return, call publish_infographic_plan exactly once with only the concise intro and research metadata; the publish tool already owns the validated directions. After publishing, reply with one short confirmation sentence.`
				});

				onEvent({ type: 'planning', label: `Planning with ${modelName}` });
				runtimeStage = 'invoking-deep-agent';
				const stream = (await agent.stream(
					{
						messages: [
							{
								role: 'user',
								content: `Topic: ${input.topic}\nCreative strategy: ${input.styleLabel}\nAudience: ${input.audience}\nFormat: ${input.aspect}\nInformation density: ${input.density}/3\nCreate ${input.count} original concepts. Write every image prompt from scratch for this exact brief.`
							}
						]
					},
					{
						configurable: { thread_id: `project-${crypto.randomUUID()}` },
						streamMode: ['messages', 'values']
					}
				)) as unknown as AsyncIterable<unknown>;

				for await (const chunk of stream) {
					if (!Array.isArray(chunk)) continue;
					const [mode, payload] = chunk;
					if (mode === 'messages') {
						const delta = streamedText(payload);
						if (delta) onEvent({ type: 'drafting', delta, model: modelName });
					}
				}

				if (!publishedPlan) {
					throw new Error(
						'The creative director finished without publishing a validated infographic plan.'
					);
				}
				const structured = publishedPlan as z.infer<typeof planSummarySchema> & {
					concepts: z.infer<typeof conceptSchema>[];
				};
				return {
					...structured,
					concepts: structured.concepts.map((concept) => ({ ...concept, id: uid() })),
					modelUsed: modelName
				};
			} catch (error) {
				if (
					isUnavailableModelError(error) &&
					index < plannerCandidates(input.plannerModel).length - 1
				) {
					continue;
				}
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
