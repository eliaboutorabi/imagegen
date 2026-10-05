<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import Icon from '$lib/components/Icon.svelte';
	import {
		ArrowDownToLineIcon as ArrowDownToLine,
		ArrowRight02Icon as ArrowRight,
		ChevronDownIcon as ChevronDown,
		ChevronLeftIcon as ChevronLeft,
		ChevronRightIcon as ChevronRight,
		Copy01Icon as Copy,
		FileTextIcon as FileText,
		GalleryHorizontalEndIcon as GalleryHorizontalEnd,
		Home01Icon as Home,
		Image02Icon as ImageIcon,
		ImagePlusIcon as ImagePlus,
		Loading03Icon as LoaderCircle,
		Menu01Icon as Menu,
		MinusSignIcon as Minus,
		MoonIcon as Moon,
		PanelLeftCloseIcon as PanelLeftClose,
		PlusSignIcon as Plus,
		RotateCcwIcon as RotateCcw,
		Settings04Icon as Settings2,
		SparklesIcon as Sparkles,
		SquareIcon as Square,
		Sun03Icon as Sun,
		Delete02Icon as Trash2,
		Cancel01Icon as X,
		ZoomInIcon as ZoomIn,
		ZoomOutIcon as ZoomOut
	} from '@hugeicons/core-free-icons';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import BriefWidget from '$lib/components/BriefWidget.svelte';
	import ConversationFeed from '$lib/components/ConversationFeed.svelte';
	import GenerationWall from '$lib/components/GenerationWall.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import StylePicker from '$lib/components/StylePicker.svelte';
	import StudioComposer from '$lib/components/StudioComposer.svelte';
	import { planInfographics } from '$lib/studio/agent';
	import { referenceCanvas } from '$lib/studio/canvas';
	import {
		formatDiagnostic,
		recordDiagnostic,
		type DiagnosticRecord
	} from '$lib/studio/diagnostics';
	import { imageQualities, imageQualityName } from '$lib/studio/models';
	import { runGenerationBatch } from '$lib/studio/openai';
	import type { ImageToolInput } from '$lib/studio/runtime';
	import { getStyle } from '$lib/studio/styles';
	import {
		activateProject,
		clearProject,
		DEFAULT_SETTINGS,
		listProjects,
		loadProject,
		loadSettings,
		saveProject,
		saveSettings
	} from '$lib/studio/storage';
	import type {
		AgentEvent,
		Aspect,
		Audience,
		Generation,
		ImageFormat,
		ImageQuality,
		InfographicConcept,
		ReferenceAsset,
		StudioProject,
		StudioSettings,
		StyleId
	} from '$lib/studio/types';
	import {
		clampViewerPan,
		clampViewerZoom,
		getViewerMinimap,
		wheelZoomFactor
	} from '$lib/studio/viewport';

	type Step = 'topic' | 'style' | 'brief' | 'planning' | 'concepts';
	type PendingReferenceEdit = { instruction: string; referenceIds: string[] };

	const starterTopics = [
		'The hidden cost of meetings',
		'How cities stay cool',
		'A beginner’s map of AI agents'
	];
	const MAX_ACTIVE_REFERENCES = 8;
	const MAX_REFERENCE_BYTES = 20 * 1024 * 1024;
	const SUPPORTED_REFERENCE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

	function newProject(): StudioProject {
		const now = Date.now();
		return {
			id: crypto.randomUUID(),
			topic: '',
			styleId: null,
			styleIds: [],
			customDirection: '',
			audience: 'Everyone',
			aspect: 'landscape',
			imageWidth: 1536,
			imageHeight: 1024,
			density: 2,
			concepts: [],
			notes: [],
			selectedConceptId: null,
			generations: [],
			referenceAssets: [],
			activeReferenceIds: [],
			createdAt: now,
			updatedAt: now,
			messages: [],
			activePanel: null
		};
	}

	let project = $state<StudioProject>(newProject());
	let settings = $state<StudioSettings>({ ...DEFAULT_SETTINGS });
	let step = $state<Step>('topic');
	let composerText = $state('');
	let settingsOpen = $state(false);
	let sidebarOpen = $state(false);
	let projectMenuOpen = $state(false);
	let wallOpen = $state(false);
	let hydrated = $state(false);
	let agentStatus = $state('');
	let agentDetail = $state('');
	let agentError = $state('');
	let agentDiagnostic = $state<DiagnosticRecord | null>(null);
	let errorExpanded = $state(false);
	let diagnosticCopied = $state(false);
	let batchSize = $state(4);
	let openGeneration = $state<Generation | null>(null);
	let pendingConcept = $state<InfographicConcept | null>(null);
	let recentProjects = $state<StudioProject[]>([]);
	let streamingConcepts = $state<Array<InfographicConcept | null>>([null, null, null]);
	let streamingPartials = $state<Array<Partial<InfographicConcept>>>([{}, {}, {}]);
	let partialImages = $state<Record<string, { imageUrl: string; index: number }>>({});
	let openPrompt = $state<InfographicConcept | null>(null);
	let promptCopied = $state(false);
	let resetArmed = $state(false);
	let resizingWall = $state(false);
	let attachmentMessage = $state('');
	let batchPrompt = $state('');
	let batchQuality = $state<ImageQuality>('medium');
	let batchFormat = $state<ImageFormat>('webp');
	let pendingReferenceEdit = $state<PendingReferenceEdit | null>(null);
	let focusedGenerationId = $state<string | null>(null);
	let lightboxZoom = $state(1);
	let lightboxBaseWidth = $state(0);
	let lightboxBaseHeight = $state(0);
	let lightboxNaturalWidth = $state(0);
	let lightboxNaturalHeight = $state(0);
	let lightboxCopied = $state(false);
	let lightboxFilmstripOpen = $state(true);
	let lightboxDragging = $state(false);
	let lightboxPanX = $state(0);
	let lightboxPanY = $state(0);
	let lightboxStageWidth = $state(0);
	let lightboxStageHeight = $state(0);
	let lightboxMinimapDragging = $state(false);
	let lightboxDragX = 0;
	let lightboxDragY = 0;
	let lightboxDragPanX = 0;
	let lightboxDragPanY = 0;
	let lightboxTargetZoom = $state(1);
	let lightboxTargetPanX = 0;
	let lightboxTargetPanY = 0;
	let lightboxAnimationFrame = 0;
	let lightboxStage = $state<HTMLDivElement>();
	let agentBusy = $state(false);
	let followChat = $state(true);
	let lastAgentRequest = $state('');
	let streamingErrors = $state<Record<number, string>>({});
	let agentController: AbortController | null = null;
	const generationControllers = new SvelteMap<string, SvelteSet<AbortController>>();
	const deletedCanvasIds = new SvelteSet<string>();
	let activeAssistantId = $state<string | null>(null);

	let selectedConcept = $derived(
		project.concepts.find((concept) => concept.id === project.selectedConceptId) ?? null
	);
	let projectStyles = $derived(
		(project.styleIds?.length ? project.styleIds : project.styleId ? [project.styleId] : []).map(
			(styleId) => getStyle(styleId)
		)
	);
	let activeJobs = $derived(
		project.generations.filter((item) => item.status === 'queued' || item.status === 'generating')
			.length
	);
	let completedJobs = $derived(
		project.generations.filter((item) => item.status === 'complete').length
	);
	let agentDiagnosticText = $derived(agentDiagnostic ? formatDiagnostic(agentDiagnostic) : '');
	let activeReferences = $derived(
		project.activeReferenceIds
			.map((id) => project.referenceAssets.find((asset) => asset.id === id))
			.filter((asset): asset is ReferenceAsset => Boolean(asset))
	);
	let lightboxGenerations = $derived(
		project.generations.filter((generation) => Boolean(generation.imageUrl))
	);
	let lightboxIndex = $derived(
		openGeneration
			? lightboxGenerations.findIndex((generation) => generation.id === openGeneration?.id)
			: -1
	);
	let lightboxMinimap = $derived(
		getViewerMinimap(
			lightboxBaseWidth,
			lightboxBaseHeight,
			lightboxStageWidth,
			lightboxStageHeight,
			lightboxZoom,
			lightboxPanX,
			lightboxPanY
		)
	);

	onMount(async () => {
		sidebarOpen = window.matchMedia('(min-width: 1180px)').matches;
		wallOpen = window.matchMedia('(min-width: 1000px)').matches;
		settings = loadSettings();
		clampWallWidth();
		applyTheme(settings.theme);
		batchSize = settings.defaultBatchSize;
		batchQuality = settings.quality;
		const saved = await loadProject();
		if (saved) {
			applyLoadedProject(saved);
		} else {
			await saveProject($state.snapshot(project));
		}
		recentProjects = await listProjects();
		// An interrupted paid request must never be silently replayed on reload.
		for (const canvas of recentProjects) {
			let changed = false;
			for (const generation of canvas.generations) {
				if (generation.status === 'queued' || generation.status === 'generating') {
					generation.status = 'error';
					generation.error =
						'Interrupted when the app closed. Check your OpenAI usage before retrying.';
					changed = true;
				}
			}
			if (changed) {
				await saveProject(canvas, false);
				if (canvas.id === project.id) applyLoadedProject(canvas);
			}
		}
		hydrated = true;
	});
	onMount(() => () => agentController?.abort());

	function stepForProject(value: StudioProject): Step {
		if (value.activePanel !== undefined)
			return value.activePanel ?? (value.concepts.length ? 'concepts' : 'topic');
		return value.concepts?.length
			? 'concepts'
			: value.styleIds?.length || value.styleId
				? 'brief'
				: value.topic
					? 'style'
					: 'topic';
	}

	function applyLoadedProject(value: StudioProject) {
		const restoredReferences = (value.referenceAssets ?? []).map((asset) => ({
			...asset,
			sourcePrompt:
				asset.sourcePrompt ??
				value.generations.find((generation) => generation.id === asset.sourceGenerationId)?.prompt
		}));
		project = {
			...newProject(),
			...value,
			notes: value.notes ?? [],
			styleIds: value.styleIds?.length ? value.styleIds : value.styleId ? [value.styleId] : [],
			referenceAssets: restoredReferences,
			activeReferenceIds: value.activeReferenceIds ?? [],
			messages:
				value.messages ??
				(value.topic
					? [
							{
								id: crypto.randomUUID(),
								role: 'user',
								content: value.topic,
								createdAt: value.createdAt
							},
							...(value.concepts.length
								? [
										{
											id: crypto.randomUUID(),
											role: 'assistant' as const,
											content: 'Your saved creative directions.',
											conceptIds: value.concepts.map((concept) => concept.id),
											createdAt: value.updatedAt
										}
									]
								: [])
						]
					: [])
		};
		for (const message of project.messages ?? []) {
			if (
				message.role === 'assistant' &&
				!message.content &&
				!message.conceptIds?.length &&
				!message.generationIds?.length
			)
				message.content = 'This response was interrupted. Send a message to continue.';
		}
		batchPrompt =
			project.concepts.find((concept) => concept.id === project.selectedConceptId)?.prompt ?? '';
		batchQuality = settings.quality;
		batchFormat = settings.outputFormat;
		step = stepForProject(project);
		agentError = '';
		openPrompt = null;
		pendingReferenceEdit = null;
		wallOpen = window.innerWidth >= 1000;
		openGeneration = null;
		partialImages = {};
	}

	function persist() {
		if (!hydrated || deletedCanvasIds.has(project.id)) return;
		project.updatedAt = Date.now();
		const snapshot = $state.snapshot(project);
		recentProjects = [snapshot, ...recentProjects.filter((item) => item.id !== snapshot.id)].sort(
			(a, b) => b.updatedAt - a.updatedAt
		);
		void saveProject(snapshot);
	}

	async function openProject(id: string) {
		stopAgent();
		const saved = await activateProject(id);
		if (!saved) return;
		applyLoadedProject(saved);
		if (window.innerWidth < 1180) sidebarOpen = false;
		projectMenuOpen = false;
	}

	async function startNewCanvas() {
		stopAgent();
		persist();
		const next = newProject();
		project = next;
		step = 'topic';
		agentError = '';
		agentDiagnostic = null;
		streamingConcepts = [null, null, null];
		streamingPartials = [{}, {}, {}];
		partialImages = {};
		if (window.innerWidth < 1180) sidebarOpen = false;
		projectMenuOpen = false;
		wallOpen = window.innerWidth >= 1000;
		pendingReferenceEdit = null;
		await saveProject($state.snapshot(next));
		recentProjects = [next, ...recentProjects.filter((item) => item.id !== next.id)];
	}

	function submitComposer() {
		const message = composerText.trim();
		if (!message || agentBusy) return;
		composerText = '';
		if (!settings.apiKey) {
			if (activeReferences.length) {
				prepareReferenceEdit(message);
				return;
			}
			project.messages ??= [];
			project.messages.push({
				id: crypto.randomUUID(),
				role: 'user',
				content: message,
				createdAt: Date.now()
			});
			project.topic = message;
			step = 'style';
			project.activePanel = 'style';
			persist();
			return;
		}
		void runAgent(message);
	}

	function scrollChat(force = false) {
		if (!force && (!followChat || step === 'style' || step === 'brief')) return;
		requestAnimationFrame(() => {
			const scroll = document.querySelector('.conversation-scroll');
			scroll?.scrollTo({ top: scroll.scrollHeight, behavior: force ? 'smooth' : 'auto' });
		});
	}

	function stopAgent() {
		const message = project.messages?.find((item) => item.id === activeAssistantId);
		if (agentBusy && message)
			message.content = `${message.content}${message.content ? '\n' : ''}Stopped. Any image jobs already queued are still visible in the wall.`;
		agentController?.abort(new DOMException('Stopped by user', 'AbortError'));
		agentController = null;
		agentBusy = false;
		activeAssistantId = null;
		if (step === 'planning')
			step = project.concepts.length ? 'concepts' : projectStyles.length ? 'brief' : 'topic';
		persist();
	}

	function stopGenerations() {
		for (const controller of generationControllers.get(project.id) ?? []) controller.abort();
	}

	async function runAgent(message: string) {
		if (agentBusy) return;
		const controller = new AbortController();
		agentController = controller;
		agentBusy = true;
		lastAgentRequest = message;
		agentStatus = 'Understanding your request';
		agentError = '';
		agentDiagnostic = null;
		const ownerId = project.id;
		const context = $state.snapshot(project);
		project.messages ??= [];
		project.messages.push({
			id: crypto.randomUUID(),
			role: 'user',
			content: message,
			referenceIds: [...project.activeReferenceIds],
			createdAt: Date.now()
		});
		const assistantId = crypto.randomUUID();
		activeAssistantId = assistantId;
		project.messages.push({
			id: assistantId,
			role: 'assistant',
			content: '',
			createdAt: Date.now()
		});
		if (!project.topic) project.topic = message;
		persist();
		followChat = true;
		scrollChat(true);
		const current = () =>
			project.id === ownerId && agentController === controller && !controller.signal.aborted;
		const assistant = () => project.messages?.find((item) => item.id === assistantId);
		try {
			const { runStudioAgent } = await import('$lib/studio/runtime');
			controller.signal.throwIfAborted();
			const result = await runStudioAgent(
				context,
				$state.snapshot(settings),
				message,
				{
					activity: (label) => {
						if (current()) agentStatus = label;
					},
					text: (text) => {
						if (current()) {
							const item = assistant();
							if (item) item.content = text;
							scrollChat();
						}
					},
					research: (trace) => {
						if (current()) {
							const item = assistant();
							if (item) item.research = trace;
							scrollChat();
						}
					},
					showControls: (kind, topic) => {
						if (current()) {
							project.topic = topic;
							step = kind;
							project.activePanel = kind;
							persist();
							requestAnimationFrame(() =>
								document
									.querySelector('.widget-indent')
									?.scrollIntoView({ block: 'start', behavior: 'smooth' })
							);
						}
					},
					draftDirections: async (input) => {
						controller.signal.throwIfAborted();
						if (!current()) throw new Error('This canvas is no longer active.');
						return createConcepts(
							input.instructions,
							input.count,
							input.research,
							controller.signal,
							input.topic
						);
					},
					generateImages: (input) => {
						if (!current()) throw new Error('This canvas is no longer active.');
						return queueAgentImages(input);
					},
					selectDirection: (id) => {
						if (!current()) throw new Error('This canvas is no longer active.');
						const concept = project.concepts.find((item) => item.id === id);
						if (!concept) throw new Error('That direction is not available.');
						selectConcept(concept);
						step = 'concepts';
						return 'Editable prompt and batch controls opened.';
					}
				},
				controller.signal
			);
			if (!current()) return;
			project.agentHistory = result.history;
			const item = assistant();
			if (item)
				item.content =
					result.text ||
					(item.generationIds?.length
						? 'Your images are queued in the generation wall.'
						: item.conceptIds?.length
							? 'Your directions are ready to explore.'
							: 'Ready for your next idea.');
			if (step === 'topic') step = project.concepts.length ? 'concepts' : 'topic';
		} catch (error) {
			if (!current()) return;
			agentDiagnostic = recordDiagnostic('studio-agent', error, { model: settings.plannerModel });
			agentError =
				error instanceof Error ? error.message : 'The agent could not finish this request.';
			const item = assistant();
			if (item && !item.content)
				item.content = 'I couldn’t finish this request. See the error details below.';
			if (step === 'planning') step = project.concepts.length ? 'concepts' : 'brief';
		} finally {
			if (project.id === ownerId && agentController === controller) {
				agentBusy = false;
				agentController = null;
				activeAssistantId = null;
				persist();
			}
		}
	}

	function queueAgentImages(input: ImageToolInput) {
		project.activePanel = null;
		step = project.concepts.length ? 'concepts' : 'topic';
		const concept: InfographicConcept = {
			id: crypto.randomUUID(),
			title: input.title,
			prompt: input.prompt,
			strapline: 'Created from your request',
			rationale: '',
			layout: 'Direct generation',
			palette: []
		};
		const primary = project.referenceAssets.find((asset) => input.referenceIds.includes(asset.id));
		const size = primary ? referenceCanvas(primary.width, primary.height) : null;
		if (size?.letterboxed)
			concept.prompt +=
				'\nPreserve the entire reference without cropping. Letterbox extreme proportions within the supported canvas.';
		const jobs = Array.from({ length: input.count }, (_, index) => ({
			...makeGeneration(concept, index + 1, input.count),
			referenceIds: input.referenceIds,
			...(size ? { width: size.width, height: size.height } : {})
		}));
		project.generations = [...jobs, ...project.generations];
		const assistant = project.messages?.find((item) => item.id === activeAssistantId);
		if (assistant)
			assistant.generationIds = [...(assistant.generationIds ?? []), ...jobs.map((job) => job.id)];
		persist();
		void generateJobs(jobs);
		return JSON.stringify({
			queued: jobs.map((job) => ({ id: job.id, title: job.conceptTitle })),
			status: 'queued, rendering asynchronously'
		});
	}

	function prepareReferenceEdit(instruction: string) {
		const request = { instruction, referenceIds: [...project.activeReferenceIds] };
		pendingReferenceEdit = request;
		persist();
		settingsOpen = true;
	}

	function useStarter(topic: string) {
		composerText = topic;
		submitComposer();
	}

	function selectStyles(styleIds: StyleId[]) {
		const chosen = [...new Set(styleIds)];
		if (!chosen.length) return;
		project.styleIds = chosen;
		project.styleId = chosen[0];
		project.activePanel = null;
		persist();
		if (settings.apiKey)
			void runAgent(
				`I approved these visual styles: ${chosen.map((id) => getStyle(id).name).join(', ')}. Use all of them. Help me set the brief or create the directions if you have enough context.`
			);
		else {
			step = 'brief';
			project.activePanel = 'brief';
			persist();
		}
	}

	function handleAgentEvent(event: AgentEvent) {
		if (event.type === 'direction-error') {
			streamingErrors[event.index - 1] = event.message;
			return;
		}
		if (event.type === 'direction-start') {
			agentStatus = `Developing ${streamingConcepts.length} directions`;
			agentDetail = `${event.label} is arriving from ${event.model}`;
			return;
		}
		if (event.type === 'direction-progress') {
			streamingPartials[event.index - 1] = event.partial;
			agentStatus = 'Directions are arriving live';
			const ready = streamingConcepts.filter(Boolean).length;
			agentDetail = `${ready} of ${streamingConcepts.length} complete · prompts are streaming now`;
			return;
		}
		if (event.type === 'direction-ready') {
			streamingConcepts[event.index - 1] = event.concept;
			streamingPartials[event.index - 1] = event.concept;
			const ready = streamingConcepts.filter(Boolean).length;
			agentStatus = 'Publishing directions as they finish';
			agentDetail = `${ready} of ${streamingConcepts.length} complete · ${event.model}`;
			project.concepts.push(event.concept);
			const assistant = project.messages?.find((item) => item.id === activeAssistantId);
			if (assistant) assistant.conceptIds = [...(assistant.conceptIds ?? []), event.concept.id];
			if (settings.apiKey && settings.autoGenerate) {
				const job = makeGeneration(event.concept, 1, 1);
				project.generations = [job, ...project.generations];
				void generateJobs([job]);
			}
			persist();
			scrollChat();
			return;
		}
		if (event.type === 'drafting') {
			agentStatus = 'Streaming the directions';
			agentDetail = `Concept copy and image prompts are arriving from ${event.model}`;
			return;
		}
		if (event.type === 'research-start') {
			agentStatus = 'Researching the live web';
			agentDetail = event.query;
		} else if (event.type === 'research-complete') {
			agentStatus = 'Research complete';
			agentDetail = 'Turning the useful facts into visual structure';
		} else {
			agentStatus = event.label;
			agentDetail =
				event.type === 'planning' ? 'Building three genuinely different directions' : '';
		}
	}

	async function createConcepts(
		refinement?: string,
		count = 3,
		research = '',
		signal?: AbortSignal,
		topic?: string
	) {
		step = 'planning';
		project.activePanel = null;
		agentError = '';
		agentDiagnostic = null;
		errorExpanded = false;
		agentStatus = refinement ? 'Reworking the directions' : 'Reading the brief';
		agentDetail = 'Deciding whether fresh research will improve the result';
		streamingConcepts = Array.from({ length: count }, () => null);
		streamingPartials = Array.from({ length: count }, () => ({}));
		streamingErrors = {};
		const ownerId = project.id;

		try {
			const direction = project.customDirection.trim();
			const plan = await planInfographics(
				{
					topic:
						topic ||
						(refinement ? `${project.topic}\nAdditional direction: ${refinement}` : project.topic),
					styleIds: projectStyles.map((style) => style.id),
					styleLabels: projectStyles.map((style) => style.name),
					customDirection: [direction, refinement].filter(Boolean).join('\n') || undefined,
					audience: project.audience,
					aspect: project.aspect,
					imageWidth: project.imageWidth,
					imageHeight: project.imageHeight,
					density: project.density,
					count,
					plannerModel: settings.plannerModel,
					researchContext: research
				},
				settings.apiKey,
				(event) => {
					if (project.id === ownerId && !signal?.aborted) handleAgentEvent(event);
				},
				signal
			);

			if (signal?.aborted || project.id !== ownerId)
				throw new DOMException('Stopped', 'AbortError');
			for (const concept of plan.concepts)
				if (!project.concepts.some((item) => item.id === concept.id))
					project.concepts.push(concept);
			project.plannerModelUsed = plan.modelUsed ?? undefined;
			project.selectedConceptId = null;
			step = 'concepts';

			if (!settings.apiKey) {
				project.messages ??= [];
				project.messages.push({
					id: crypto.randomUUID(),
					role: 'assistant',
					content: plan.intro,
					conceptIds: plan.concepts.map((item) => item.id),
					createdAt: Date.now()
				});
			}
			persist();
			setTimeout(
				() =>
					document
						.querySelector('.concepts-intro')
						?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
				80
			);

			return JSON.stringify({
				directionIds: plan.concepts.map((item) => item.id),
				autoRender: settings.autoGenerate,
				warnings: plan.warnings
			});
		} catch (error) {
			if (signal?.aborted || project.id !== ownerId) throw error;
			agentDiagnostic = recordDiagnostic('concept-planning', error, {
				plannerModel: settings.plannerModel,
				workflowStage: agentStatus || 'unknown',
				hasApiKey: Boolean(settings.apiKey)
			});
			agentError =
				error instanceof Error ? error.message : 'The creative director could not finish the plan.';
			step = 'brief';
			if (signal) throw error;
			return 'Direction planning failed.';
		}
	}

	function makeGeneration(
		concept: InfographicConcept,
		variation: number,
		total: number,
		createdAt = Date.now(),
		queue = true,
		promptOverride?: string,
		quality: ImageQuality = settings.quality,
		outputFormat: ImageFormat = settings.outputFormat
	): Generation {
		return {
			id: crypto.randomUUID(),
			conceptId: concept.id,
			conceptTitle: concept.title,
			prompt: promptOverride?.trim() || concept.prompt,
			status: settings.apiKey && queue ? 'queued' : 'ready',
			createdAt,
			variation,
			totalVariations: total,
			aspect: project.aspect,
			width: project.imageWidth,
			height: project.imageHeight,
			referenceIds: [...project.activeReferenceIds],
			quality,
			outputFormat,
			model: settings.imageModel
		};
	}

	function updateGeneration(generation: Generation) {
		const index = project.generations.findIndex((item) => item.id === generation.id);
		if (index === -1) return;
		project.generations[index] = generation;
		if (generation.status === 'complete' || generation.status === 'error') {
			clearPartialImage(generation.id);
		}
		persist();
	}

	function clearPartialImage(id: string) {
		if (!partialImages[id]) return;
		const remaining = { ...partialImages };
		delete remaining[id];
		partialImages = remaining;
	}

	async function generateJobs(jobs: Generation[]) {
		const ownerId = project.id;
		const controller = new AbortController();
		const controllers = generationControllers.get(ownerId) ?? new SvelteSet<AbortController>();
		controllers.add(controller);
		generationControllers.set(ownerId, controllers);
		wallOpen = true;
		for (const job of jobs) clearPartialImage(job.id);
		requestAnimationFrame(() =>
			document.querySelector('.wall-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
		);
		await runGenerationBatch(
			jobs,
			{
				apiKey: settings.apiKey,
				model: settings.imageModel,
				quality: settings.quality,
				aspect: project.aspect,
				width: project.imageWidth,
				height: project.imageHeight,
				references: project.referenceAssets,
				outputFormat: settings.outputFormat,
				signal: controller.signal,
				onPartial: (generation, imageUrl, index) => {
					if (project.id !== ownerId || deletedCanvasIds.has(ownerId)) return;
					partialImages = {
						...partialImages,
						[generation.id]: { imageUrl, index }
					};
				}
			},
			(generation) => {
				if (deletedCanvasIds.has(ownerId)) return;
				if (project.id === ownerId) updateGeneration(generation);
				else {
					const canvas = recentProjects.find((item) => item.id === ownerId);
					if (!canvas) return;
					canvas.generations = canvas.generations.map((item) =>
						item.id === generation.id ? generation : item
					);
					void saveProject($state.snapshot(canvas), false);
				}
			}
		);
		controllers.delete(controller);
		if (!controllers.size) generationControllers.delete(ownerId);
	}

	function selectConcept(concept: InfographicConcept) {
		project.selectedConceptId = concept.id;
		batchSize = settings.defaultBatchSize;
		batchPrompt = concept.prompt;
		batchQuality = settings.quality;
		batchFormat = settings.outputFormat;
		persist();
		setTimeout(
			() =>
				document
					.querySelector('.batch-widget')
					?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
			80
		);
	}

	function focusTimelineGeneration(generation: Generation) {
		wallOpen = true;
		focusedGenerationId = generation.id;
		requestAnimationFrame(() => {
			const card = document.querySelector(`[data-generation-id="${generation.id}"]`);
			card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
		setTimeout(() => {
			if (focusedGenerationId === generation.id) focusedGenerationId = null;
		}, 2400);
	}

	function createBatch(
		concept: InfographicConcept,
		count: number,
		prompt = batchPrompt.trim() || concept.prompt
	) {
		if (!settings.apiKey) {
			pendingConcept = concept;
			settingsOpen = true;
			return;
		}
		const jobs = Array.from({ length: count }, (_, index) =>
			makeGeneration(
				concept,
				index + 1,
				count,
				Date.now() + index,
				true,
				prompt,
				batchQuality,
				batchFormat
			)
		);
		project.generations = [...jobs, ...project.generations];
		project.selectedConceptId = null;
		persist();
		wallOpen = true;
		void generateJobs(jobs);
	}

	function retryGeneration(generation: Generation) {
		if (!settings.apiKey) {
			settingsOpen = true;
			return;
		}
		const retry = {
			...generation,
			status: 'queued' as const,
			error: undefined,
			imageUrl: undefined
		};
		updateGeneration(retry);
		void generateJobs([retry]);
	}

	function regenerateGeneration(generation: Generation) {
		if (!settings.apiKey) {
			settingsOpen = true;
			return;
		}
		const regenerated: Generation = {
			...generation,
			id: crypto.randomUUID(),
			status: 'queued',
			createdAt: Date.now(),
			error: undefined,
			imageUrl: undefined
		};
		project.generations = [regenerated, ...project.generations];
		persist();
		wallOpen = true;
		void generateJobs([regenerated]);
	}

	function applyTheme(theme: StudioSettings['theme']) {
		document.documentElement.dataset.theme = theme;
		document.documentElement.style.colorScheme = theme;
	}

	function toggleTheme() {
		settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
		applyTheme(settings.theme);
		saveSettings($state.snapshot(settings));
	}

	function readFileAsDataUrl(file: File) {
		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error ?? new Error('Could not read this image.'));
			reader.readAsDataURL(file);
		});
	}

	function readImageDimensions(dataUrl: string) {
		return new Promise<{ width: number; height: number }>((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
			image.onerror = () => reject(new Error('This image could not be decoded.'));
			image.src = dataUrl;
		});
	}

	function showAttachmentMessage(message: string) {
		attachmentMessage = message;
		setTimeout(() => {
			if (attachmentMessage === message) attachmentMessage = '';
		}, 3200);
	}

	async function attachFiles(files: File[]) {
		if (!files.length) return;
		const ownerId = project.id;

		const slots = Math.max(0, MAX_ACTIVE_REFERENCES - project.activeReferenceIds.length);
		const accepted = files.slice(0, slots);
		let added = 0;
		for (const file of accepted) {
			if (!SUPPORTED_REFERENCE_TYPES.has(file.type)) {
				showAttachmentMessage('Use PNG, JPEG, or WebP reference images.');
				continue;
			}
			if (file.size > MAX_REFERENCE_BYTES) {
				showAttachmentMessage(`${file.name} is larger than 20 MB.`);
				continue;
			}
			try {
				const dataUrl = await readFileAsDataUrl(file);
				const dimensions = await readImageDimensions(dataUrl);
				// File reads may finish after navigation or another paste/drop.
				if (project.id !== ownerId) return;
				if (project.activeReferenceIds.length >= MAX_ACTIVE_REFERENCES) {
					showAttachmentMessage(`You can use up to ${MAX_ACTIVE_REFERENCES} references.`);
					if (added) persist();
					return;
				}
				const asset: ReferenceAsset = {
					id: crypto.randomUUID(),
					name: file.name,
					mimeType: file.type,
					dataUrl,
					...dimensions,
					createdAt: Date.now(),
					source: 'upload'
				};
				project.referenceAssets = [asset, ...project.referenceAssets];
				project.activeReferenceIds = [...project.activeReferenceIds, asset.id];
				added += 1;
			} catch (error) {
				if (project.id !== ownerId) return;
				showAttachmentMessage(
					error instanceof Error ? error.message : 'Could not attach this image.'
				);
			}
		}
		if (files.length > slots)
			showAttachmentMessage(`You can use up to ${MAX_ACTIVE_REFERENCES} references.`);
		else if (added)
			showAttachmentMessage(`${added} reference image${added === 1 ? '' : 's'} attached.`);
		if (added) persist();
	}

	function removeReference(id: string) {
		project.activeReferenceIds = project.activeReferenceIds.filter(
			(referenceId) => referenceId !== id
		);
		persist();
	}

	function referenceGeneration(generation: Generation) {
		if (!generation.imageUrl) return;
		const existing = project.referenceAssets.find(
			(asset) => asset.sourceGenerationId === generation.id
		);
		if (existing) {
			if (!existing.sourcePrompt) existing.sourcePrompt = generation.prompt;
			if (!project.activeReferenceIds.includes(existing.id)) {
				if (project.activeReferenceIds.length >= MAX_ACTIVE_REFERENCES) {
					showAttachmentMessage(`You can use up to ${MAX_ACTIVE_REFERENCES} references.`);
					return;
				}
				project.activeReferenceIds = [...project.activeReferenceIds, existing.id];
			}
			persist();
			showAttachmentMessage('Generation added as a reference.');
			return;
		}
		if (project.activeReferenceIds.length >= MAX_ACTIVE_REFERENCES) {
			showAttachmentMessage(`You can use up to ${MAX_ACTIVE_REFERENCES} references.`);
			return;
		}
		const mimeType = generation.imageUrl.match(/^data:([^;,]+)/)?.[1] || 'image/webp';
		const asset: ReferenceAsset = {
			id: crypto.randomUUID(),
			name: `${generation.conceptTitle} · variation ${generation.variation}.webp`,
			mimeType,
			dataUrl: generation.imageUrl,
			width: generation.width ?? project.imageWidth,
			height: generation.height ?? project.imageHeight,
			createdAt: Date.now(),
			source: 'generation',
			sourceGenerationId: generation.id,
			sourcePrompt: generation.prompt
		};
		project.referenceAssets = [asset, ...project.referenceAssets];
		project.activeReferenceIds = [...project.activeReferenceIds, asset.id];
		persist();
		showAttachmentMessage('Generation added as a reference.');
	}

	function openGenerationViewer(generation: Generation) {
		const openingViewer = !openGeneration;
		openGeneration = generation;
		if (openingViewer) lightboxFilmstripOpen = true;
		cancelLightboxAnimation();
		lightboxZoom = 1;
		lightboxTargetZoom = 1;
		lightboxPanX = 0;
		lightboxPanY = 0;
		lightboxTargetPanX = 0;
		lightboxTargetPanY = 0;
		lightboxBaseWidth = 0;
		lightboxBaseHeight = 0;
		lightboxNaturalWidth = 0;
		lightboxNaturalHeight = 0;
		lightboxCopied = false;
		requestAnimationFrame(() =>
			document
				.querySelector('.filmstrip-scroll [aria-current="true"]')
				?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
		);
	}

	function closeGenerationViewer() {
		cancelLightboxAnimation();
		openGeneration = null;
		lightboxDragging = false;
		lightboxMinimapDragging = false;
	}

	function navigateLightbox(offset: number) {
		const next = lightboxGenerations[lightboxIndex + offset];
		if (next) openGenerationViewer(next);
	}

	function generationThumbnailRatio(generation: Generation) {
		if (generation.width && generation.height) return `${generation.width} / ${generation.height}`;
		if (generation.aspect === 'portrait') return '2 / 3';
		if (generation.aspect === 'square') return '1 / 1';
		return '3 / 2';
	}

	function setLightboxFilmstrip(open: boolean) {
		lightboxFilmstripOpen = open;
		requestAnimationFrame(fitLightboxImage);
	}

	function fitLightboxImage() {
		if (!lightboxNaturalWidth || !lightboxNaturalHeight || !lightboxStage) return;
		lightboxStageWidth = lightboxStage.clientWidth;
		lightboxStageHeight = lightboxStage.clientHeight;
		const availableWidth = Math.max(240, lightboxStageWidth - 96);
		const availableHeight = Math.max(220, lightboxStageHeight - 64);
		const fitScale = Math.min(
			availableWidth / lightboxNaturalWidth,
			availableHeight / lightboxNaturalHeight,
			1
		);
		lightboxBaseWidth = Math.round(lightboxNaturalWidth * fitScale);
		lightboxBaseHeight = Math.round(lightboxNaturalHeight * fitScale);
		const clamped = clampLightboxPan(lightboxTargetPanX, lightboxTargetPanY, lightboxTargetZoom);
		lightboxTargetPanX = clamped.x;
		lightboxTargetPanY = clamped.y;
		lightboxPanX = clamped.x;
		lightboxPanY = clamped.y;
	}

	function loadLightboxImage(event: Event) {
		const image = event.currentTarget as HTMLImageElement;
		lightboxNaturalWidth = image.naturalWidth;
		lightboxNaturalHeight = image.naturalHeight;
		lightboxZoom = 1;
		lightboxTargetZoom = 1;
		lightboxPanX = 0;
		lightboxPanY = 0;
		lightboxTargetPanX = 0;
		lightboxTargetPanY = 0;
		requestAnimationFrame(fitLightboxImage);
	}

	function cancelLightboxAnimation() {
		if (lightboxAnimationFrame) cancelAnimationFrame(lightboxAnimationFrame);
		lightboxAnimationFrame = 0;
	}

	function clampLightboxPan(x: number, y: number, zoom = lightboxZoom) {
		return clampViewerPan(
			x,
			y,
			zoom,
			lightboxBaseWidth,
			lightboxBaseHeight,
			lightboxStageWidth,
			lightboxStageHeight
		);
	}

	function animateLightboxViewport() {
		const ease = 0.2;
		const nextZoom = lightboxZoom + (lightboxTargetZoom - lightboxZoom) * ease;
		const nextPan = clampLightboxPan(
			lightboxPanX + (lightboxTargetPanX - lightboxPanX) * ease,
			lightboxPanY + (lightboxTargetPanY - lightboxPanY) * ease,
			nextZoom
		);
		const settled =
			Math.abs(lightboxTargetZoom - nextZoom) < 0.001 &&
			Math.abs(lightboxTargetPanX - nextPan.x) < 0.2 &&
			Math.abs(lightboxTargetPanY - nextPan.y) < 0.2;
		lightboxZoom = settled ? lightboxTargetZoom : nextZoom;
		lightboxPanX = settled ? lightboxTargetPanX : nextPan.x;
		lightboxPanY = settled ? lightboxTargetPanY : nextPan.y;
		lightboxAnimationFrame = settled ? 0 : requestAnimationFrame(animateLightboxViewport);
	}

	function setLightboxZoom(next: number, focalX?: number, focalY?: number) {
		if (!lightboxStageWidth || !lightboxStageHeight) return;
		const zoom = clampViewerZoom(next);
		if (Math.abs(zoom - lightboxTargetZoom) < 0.0001) return;
		const pointX = focalX ?? lightboxStageWidth / 2;
		const pointY = focalY ?? lightboxStageHeight / 2;
		const contentX = (pointX - lightboxStageWidth / 2 - lightboxTargetPanX) / lightboxTargetZoom;
		const contentY = (pointY - lightboxStageHeight / 2 - lightboxTargetPanY) / lightboxTargetZoom;
		const desiredPan = clampLightboxPan(
			pointX - lightboxStageWidth / 2 - contentX * zoom,
			pointY - lightboxStageHeight / 2 - contentY * zoom,
			zoom
		);
		lightboxTargetZoom = zoom;
		lightboxTargetPanX = zoom === 1 ? 0 : desiredPan.x;
		lightboxTargetPanY = zoom === 1 ? 0 : desiredPan.y;
		if (!lightboxAnimationFrame) {
			lightboxAnimationFrame = requestAnimationFrame(animateLightboxViewport);
		}
	}

	function handleLightboxWheel(event: WheelEvent) {
		event.preventDefault();
		if (!lightboxStage) return;
		const rect = lightboxStage.getBoundingClientRect();
		const scale = wheelZoomFactor(event.deltaY, event.deltaMode, lightboxStageHeight);
		setLightboxZoom(
			lightboxTargetZoom * scale,
			event.clientX - rect.left,
			event.clientY - rect.top
		);
	}

	function startLightboxDrag(event: PointerEvent) {
		if ((event.target as Element).closest('button, .lightbox-minimap')) return;
		if (!lightboxStage || lightboxZoom <= 1 || event.button !== 0) return;
		cancelLightboxAnimation();
		lightboxTargetZoom = lightboxZoom;
		lightboxTargetPanX = lightboxPanX;
		lightboxTargetPanY = lightboxPanY;
		lightboxDragging = true;
		lightboxDragX = event.clientX;
		lightboxDragY = event.clientY;
		lightboxDragPanX = lightboxPanX;
		lightboxDragPanY = lightboxPanY;
		lightboxStage.setPointerCapture(event.pointerId);
	}

	function moveLightboxDrag(event: PointerEvent) {
		if (!lightboxStage || !lightboxDragging) return;
		const next = clampLightboxPan(
			lightboxDragPanX + event.clientX - lightboxDragX,
			lightboxDragPanY + event.clientY - lightboxDragY,
			lightboxZoom
		);
		lightboxPanX = next.x;
		lightboxPanY = next.y;
		lightboxTargetPanX = next.x;
		lightboxTargetPanY = next.y;
	}

	function stopLightboxDrag(event: PointerEvent) {
		lightboxDragging = false;
		if (lightboxStage?.hasPointerCapture(event.pointerId)) {
			lightboxStage.releasePointerCapture(event.pointerId);
		}
	}

	function updateLightboxFromMinimap(event: PointerEvent) {
		if (!lightboxMinimap) return;
		const minimap = event.currentTarget as HTMLButtonElement;
		const rect = minimap.getBoundingClientRect();
		const insetX = (rect.width - lightboxMinimap.width) / 2;
		const insetY = (rect.height - lightboxMinimap.height) / 2;
		const x = Math.min(
			1,
			Math.max(0, (event.clientX - rect.left - insetX) / lightboxMinimap.width)
		);
		const y = Math.min(
			1,
			Math.max(0, (event.clientY - rect.top - insetY) / lightboxMinimap.height)
		);
		const desired = clampLightboxPan(
			-(x - 0.5) * lightboxBaseWidth * lightboxZoom,
			-(y - 0.5) * lightboxBaseHeight * lightboxZoom,
			lightboxZoom
		);
		lightboxPanX = desired.x;
		lightboxPanY = desired.y;
		lightboxTargetPanX = desired.x;
		lightboxTargetPanY = desired.y;
	}

	function startLightboxMinimapDrag(event: PointerEvent) {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		cancelLightboxAnimation();
		lightboxTargetZoom = lightboxZoom;
		lightboxMinimapDragging = true;
		(event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
		updateLightboxFromMinimap(event);
	}

	function moveLightboxMinimapDrag(event: PointerEvent) {
		if (!lightboxMinimapDragging) return;
		updateLightboxFromMinimap(event);
	}

	function stopLightboxMinimapDrag(event: PointerEvent) {
		lightboxMinimapDragging = false;
		const minimap = event.currentTarget as HTMLButtonElement;
		if (minimap.hasPointerCapture(event.pointerId)) minimap.releasePointerCapture(event.pointerId);
	}

	function handleLightboxMinimapKeydown(event: KeyboardEvent) {
		if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
		event.preventDefault();
		const stepX = lightboxStageWidth * 0.12;
		const stepY = lightboxStageHeight * 0.12;
		const next = clampLightboxPan(
			lightboxPanX + (event.key === 'ArrowLeft' ? stepX : event.key === 'ArrowRight' ? -stepX : 0),
			lightboxPanY + (event.key === 'ArrowUp' ? stepY : event.key === 'ArrowDown' ? -stepY : 0),
			lightboxZoom
		);
		lightboxPanX = next.x;
		lightboxPanY = next.y;
		lightboxTargetPanX = next.x;
		lightboxTargetPanY = next.y;
	}

	async function copyLightboxPrompt() {
		if (!openGeneration) return;
		await navigator.clipboard.writeText(openGeneration.prompt);
		lightboxCopied = true;
		setTimeout(() => (lightboxCopied = false), 1400);
	}

	function downloadOpenGeneration() {
		if (!openGeneration?.imageUrl) return;
		const inferred = openGeneration.imageUrl.match(/^data:image\/(png|jpeg|webp)/)?.[1];
		const format = openGeneration.outputFormat ?? inferred ?? 'webp';
		const link = document.createElement('a');
		link.href = openGeneration.imageUrl;
		link.download = `${openGeneration.conceptTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${openGeneration.variation}.${format === 'jpeg' ? 'jpg' : format}`;
		link.click();
	}

	function updateSettings(next: StudioSettings) {
		settings = next;
		clampWallWidth();
		applyTheme(next.theme);
		batchSize = next.defaultBatchSize;
		batchQuality = next.quality;
		batchFormat = next.outputFormat;
		saveSettings($state.snapshot(settings));
		if (pendingConcept && next.apiKey) {
			const concept = pendingConcept;
			pendingConcept = null;
			setTimeout(() => createBatch(concept, batchSize), 650);
		}
		if (pendingReferenceEdit && next.apiKey) {
			const request = pendingReferenceEdit;
			pendingReferenceEdit = null;
			project.activeReferenceIds = request.referenceIds.filter((id) =>
				project.referenceAssets.some((asset) => asset.id === id)
			);
			void runAgent(request.instruction);
		}
	}

	function updateComposerSettings(changes: Partial<StudioSettings>) {
		const next = { ...settings, ...changes };
		if (!imageQualities(next.imageModel).includes(next.quality)) next.quality = 'medium';
		updateSettings(next);
	}

	async function resetStudio() {
		const deletedId = project.id;
		deletedCanvasIds.add(deletedId);
		stopAgent();
		stopGenerations();
		await clearProject(deletedId);
		const remaining = (await listProjects()).filter((item) => item.id !== deletedId);
		resetArmed = false;
		if (remaining[0]) {
			await openProject(remaining[0].id);
			recentProjects = remaining;
		} else {
			await startNewCanvas();
		}
	}

	function requestReset() {
		if (resetArmed) {
			void resetStudio();
			return;
		}
		resetArmed = true;
		setTimeout(() => (resetArmed = false), 2600);
	}

	function updateCustomDirection(value: string) {
		project.customDirection = value;
		persist();
	}

	function updateAudience(value: Audience) {
		project.audience = value;
		persist();
	}
	function updateAspect(value: Aspect) {
		project.aspect = value;
		if (value === 'landscape') {
			project.imageWidth = 1536;
			project.imageHeight = 1024;
		} else if (value === 'portrait') {
			project.imageWidth = 1024;
			project.imageHeight = 1536;
		} else {
			project.imageWidth = 1024;
			project.imageHeight = 1024;
		}
		persist();
	}
	function updateImageSize(width: number, height: number) {
		if (!Number.isFinite(width) || !Number.isFinite(height)) return;
		project.imageWidth = Math.round(width);
		project.imageHeight = Math.round(height);
		project.aspect = width === height ? 'square' : width > height ? 'landscape' : 'portrait';
		persist();
	}
	function updateDensity(value: number) {
		project.density = value;
		persist();
	}
	function openControls(kind: 'style' | 'brief') {
		step = kind;
		project.activePanel = kind;
		persist();
	}

	async function copyDiagnostic() {
		if (!agentDiagnosticText) return;
		await navigator.clipboard.writeText(agentDiagnosticText);
		diagnosticCopied = true;
		setTimeout(() => (diagnosticCopied = false), 1400);
	}

	async function copyOpenPrompt() {
		if (!openPrompt) return;
		await navigator.clipboard.writeText(openPrompt.prompt);
		promptCopied = true;
		setTimeout(() => (promptCopied = false), 1400);
	}

	function closeOverlays() {
		if (openGeneration) closeGenerationViewer();
		else if (openPrompt) openPrompt = null;
		else if (settingsOpen) settingsOpen = false;
		else if (sidebarOpen) sidebarOpen = false;
		else projectMenuOpen = false;
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (openGeneration) {
			if (event.key === 'Escape') closeGenerationViewer();
			else if (event.key === 'ArrowLeft') navigateLightbox(-1);
			else if (event.key === 'ArrowRight') navigateLightbox(1);
			else if (event.key === '+' || event.key === '=') setLightboxZoom(lightboxTargetZoom * 1.25);
			else if (event.key === '-') setLightboxZoom(lightboxTargetZoom / 1.25);
			else if (event.key === '0') setLightboxZoom(1);
			return;
		}
		if (event.key === 'Escape') closeOverlays();
	}

	function resizeWall(event: PointerEvent) {
		if (!resizingWall) return;
		const maxWidth = maxWallWidth();
		settings.generationWallWidth = Math.round(
			Math.min(maxWidth, Math.max(320, window.innerWidth - event.clientX))
		);
	}
	function maxWallWidth() {
		return Math.max(
			320,
			Math.min(760, window.innerWidth - (sidebarOpen && window.innerWidth >= 1180 ? 236 : 0) - 440)
		);
	}
	function clampWallWidth() {
		settings.generationWallWidth = Math.min(
			maxWallWidth(),
			Math.max(320, settings.generationWallWidth)
		);
	}
	function handleWindowResize() {
		clampWallWidth();
		fitLightboxImage();
	}

	function stopWallResize() {
		if (!resizingWall) return;
		resizingWall = false;
		saveSettings($state.snapshot(settings));
	}

	function resizeWallWithKeyboard(event: KeyboardEvent) {
		if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
		event.preventDefault();
		const delta = event.key === 'ArrowLeft' ? 24 : -24;
		settings.generationWallWidth = Math.min(
			maxWallWidth(),
			Math.max(320, settings.generationWallWidth + delta)
		);
		saveSettings($state.snapshot(settings));
	}
</script>

<svelte:window
	onkeydown={handleWindowKeydown}
	onresize={handleWindowResize}
	onpointermove={resizeWall}
	onpointerup={stopWallResize}
/>

<svelte:head>
	<title>Infogen — Infographic Studio</title>
	<meta
		name="description"
		content="Brainstorm, research, and generate remarkable infographics with an agentic creative director."
	/>
</svelte:head>

<div class:sidebar-visible={sidebarOpen} class="studio-shell">
	{#if sidebarOpen}
		<button
			class="sidebar-backdrop"
			type="button"
			aria-label="Close navigation"
			onclick={() => (sidebarOpen = false)}
		></button>
	{/if}
	<aside
		class:open={sidebarOpen}
		class="studio-sidebar"
		aria-label="Studio navigation"
		aria-hidden={!sidebarOpen}
		inert={!sidebarOpen}
	>
		<div class="sidebar-head">
			<BrandMark />
			<button type="button" onclick={() => (sidebarOpen = false)} aria-label="Close navigation"
				><Icon icon={PanelLeftClose} size={17} /></button
			>
		</div>
		<button class="sidebar-new" type="button" onclick={startNewCanvas}
			><Icon icon={Plus} size={15} /> New blank canvas</button
		>
		<nav>
			<span>Canvas history</span>
			<div class="canvas-history">
				{#each recentProjects as canvas (canvas.id)}
					{@const preview = canvas.generations.find((item) => item.imageUrl)}
					<button
						class:active={canvas.id === project.id}
						type="button"
						onclick={() => openProject(canvas.id)}
					>
						{#if preview?.imageUrl}<img
								class="history-preview"
								src={preview.imageUrl}
								alt=""
							/>{:else}<Icon icon={Home} size={17} />{/if}
						<div>
							<strong>{canvas.topic || 'Untitled infographic'}</strong><small
								>{canvas.concepts.length} directions · {canvas.generations.length} renders</small
							>
						</div></button
					>
				{/each}
			</div>
			<button
				type="button"
				onclick={() => {
					wallOpen = true;
					if (window.innerWidth < 1180) sidebarOpen = false;
				}}
				><Icon icon={GalleryHorizontalEnd} size={15} />
				<div><strong>Generation wall</strong><small>Review every render</small></div></button
			>
		</nav>
		<div class="sidebar-spacer"></div>
		<div class="sidebar-mode">
			<span class:connected={Boolean(settings.apiKey)}><i></i></span>
			<div>
				<strong>{settings.apiKey ? 'OpenAI connected' : 'Demo mode'}</strong><small
					>{settings.apiKey ? settings.plannerModel : 'Sample prompts only'}</small
				>
			</div>
		</div>
		<button
			class="sidebar-action"
			type="button"
			onclick={() => {
				settingsOpen = true;
				if (window.innerWidth < 1180) sidebarOpen = false;
			}}><Icon icon={Settings2} size={15} /> Studio settings</button
		>
		<button
			class:armed={resetArmed}
			class="sidebar-action danger"
			type="button"
			onclick={requestReset}
			><Icon icon={Trash2} size={15} />
			{resetArmed ? 'Confirm deletion' : 'Delete this canvas'}</button
		>
	</aside>

	<header class="topbar">
		<div class="topbar-left">
			<button
				class="menu-button"
				type="button"
				onclick={() => {
					sidebarOpen = !sidebarOpen;
					clampWallWidth();
				}}
				aria-expanded={sidebarOpen}
				aria-label="Toggle navigation"
				title="Toggle navigation"><Icon icon={Menu} size={18} /></button
			>
			<div class="project-switcher">
				<button
					class="project-title"
					type="button"
					onclick={() => (projectMenuOpen = !projectMenuOpen)}
					aria-expanded={projectMenuOpen}
					title="Canvas options"
				>
					<span>{project.topic || 'Untitled infographic'}</span>
					<Icon icon={ChevronDown} size={13} />
				</button>
				{#if projectMenuOpen}
					<div class="project-menu">
						<div>
							<strong>{project.topic || 'Untitled infographic'}</strong><small>Current canvas</small
							>
						</div>
						<button type="button" onclick={startNewCanvas}
							><Icon icon={Plus} size={14} /> New blank canvas</button
						>
						<button
							type="button"
							onclick={() => {
								wallOpen = true;
								projectMenuOpen = false;
							}}><Icon icon={GalleryHorizontalEnd} size={14} /> Open generation wall</button
						>
						<button class:armed={resetArmed} class="danger" type="button" onclick={requestReset}
							><Icon icon={Trash2} size={14} />
							{resetArmed ? 'Confirm deletion' : 'Delete canvas'}</button
						>
					</div>
				{/if}
			</div>
		</div>
		<div class="topbar-actions">
			{#if activeJobs > 0}<span class="job-pill"
					><i></i>{activeJobs} in progress
					<button type="button" onclick={stopGenerations} aria-label="Stop image jobs"
						><Icon icon={Square} size={11} /></button
					></span
				>{/if}
			<button
				class="wall-toggle"
				type="button"
				onclick={() => (wallOpen = !wallOpen)}
				aria-label="Toggle generation wall"
				aria-pressed={wallOpen}
				title={wallOpen ? 'Hide generation wall' : 'Show generation wall'}
				><Icon icon={GalleryHorizontalEnd} size={16} />{#if completedJobs}<span
						>{completedJobs}</span
					>{/if}</button
			>
			<button
				class="theme-button"
				type="button"
				onclick={toggleTheme}
				aria-label={settings.theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
				title={settings.theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
				>{#if settings.theme === 'dark'}<Icon icon={Sun} size={16} />{:else}<Icon
						icon={Moon}
						size={16}
					/>{/if}</button
			>
			<button
				class="settings-button"
				type="button"
				onclick={() => (settingsOpen = true)}
				aria-label="Settings"
				title={settings.apiKey ? 'Settings · OpenAI connected' : 'Settings · Connect OpenAI'}
				><Icon icon={Settings2} size={16} /></button
			>
		</div>
	</header>

	<main
		class:resizing-wall={resizingWall}
		class:wall-hidden={!wallOpen}
		class="workspace"
		style={`--wall-width:${settings.generationWallWidth}px`}
	>
		<section class="conversation">
			<div
				class="conversation-scroll"
				onscroll={(event) => {
					const element = event.currentTarget;
					followChat = element.scrollHeight - element.scrollTop - element.clientHeight < 140;
				}}
			>
				<div class="chat-column">
					{#if step === 'topic' && !project.messages?.length}
						<div class="intro-row">
							<div class="assistant-copy">
								<span class="speaker welcome-eyebrow">A little clarity. A lot of possibility.</span>
								<h1>Big ideas.<br /><em>Beautifully</em> made clear.</h1>
								<p>
									Your creative partner for infographics, visual stories, and thoughtful image
									edits. Start with an idea—or bring an image to reimagine.
								</p>
							</div>
						</div>
						<div class="welcome-examples" aria-hidden="true">
							<img src={`${base}${getStyle('editorial').image}`} alt="" /><img
								src={`${base}${getStyle('data-noir').image}`}
								alt=""
							/><img src={`${base}${getStyle('whiteboard').image}`} alt="" />
						</div>
						<div class="starter-prompts">
							<span>Or start with an idea</span>
							<div>
								{#each starterTopics as topic (topic)}<button
										type="button"
										onclick={() => useStarter(topic)}
										>{topic}<Icon icon={ArrowRight} size={12} /></button
									>{/each}
							</div>
						</div>
					{/if}

					<ConversationFeed
						messages={project.messages ?? []}
						concepts={project.concepts}
						generations={project.generations}
						references={project.referenceAssets}
						activeMessageId={agentBusy ? activeAssistantId : null}
						selectedConceptId={project.selectedConceptId}
						onSelect={selectConcept}
						onPrompt={(concept) => (openPrompt = concept)}
						onFocus={focusTimelineGeneration}
					/>
					{#if agentBusy}<div class="agent-progress" role="status">
							<Icon icon={LoaderCircle} size={16} /><span>{agentStatus}</span><button
								type="button"
								onclick={stopAgent}>Stop</button
							>
						</div>{/if}

					{#if step === 'style'}
						<div class="assistant-row compact-row">
							<div class="mini-avatar"><Icon icon={Sparkles} size={13} /></div>
							<div class="assistant-copy">
								<span class="speaker">Creative direction</span>
								<p class="chat-line">
									Find a visual language that fits your idea. Shortlist one—or mix a few.
								</p>
							</div>
						</div>
						<div class="widget-indent" inert={agentBusy}>
							<StylePicker
								selected={projectStyles.map((style) => style.id)}
								customDirection={project.customDirection}
								connected={Boolean(settings.apiKey)}
								onSelect={selectStyles}
								onCustomDirection={updateCustomDirection}
							/>
						</div>
					{:else if projectStyles.length}
						<div class="decision-summary">
							<span><Icon icon={Sparkles} size={13} /></span>
							<div>
								<small
									>{projectStyles.length === 1
										? 'Information strategy'
										: `${projectStyles.length} shortlisted styles`}</small
								><strong>{projectStyles.map((style) => style.name).join(' · ')}</strong>
							</div>
							<button type="button" onclick={() => openControls('style')}>Edit</button>
						</div>
					{/if}

					{#if step === 'brief'}
						<div class="assistant-row compact-row">
							<div class="mini-avatar"><Icon icon={Sparkles} size={13} /></div>
							<div class="assistant-copy">
								<span class="speaker">One last thing</span>
								<p class="chat-line">Who is this for, and how much should it say at a glance?</p>
							</div>
						</div>
						<div class="widget-indent" inert={agentBusy}>
							<BriefWidget
								audience={project.audience}
								aspect={project.aspect}
								imageWidth={project.imageWidth}
								imageHeight={project.imageHeight}
								density={project.density}
								connected={Boolean(settings.apiKey)}
								onAudience={updateAudience}
								onAspect={updateAspect}
								onSize={updateImageSize}
								onDensity={updateDensity}
								onContinue={() =>
									settings.apiKey
										? runAgent(
												'Create three distinct infographic directions using the approved styles and current brief.'
											)
										: createConcepts()}
							/>
						</div>
					{:else if step === 'planning' || step === 'concepts'}
						<div class="decision-summary brief">
							<span><Icon icon={FileText} size={13} /></span>
							<div>
								<small>Brief</small><strong
									>{project.audience} · {project.imageWidth}×{project.imageHeight} · {[
										'Light',
										'Balanced',
										'Dense'
									][project.density - 1]}</strong
								>
							</div>
							<button type="button" onclick={() => openControls('brief')}>Edit</button>
						</div>
					{/if}

					{#if agentError}
						<div class:expanded={errorExpanded} class="error-bubble">
							<Icon icon={X} size={14} />
							<div class="error-copy"><strong>I hit a snag</strong><span>{agentError}</span></div>
							<div class="error-actions">
								{#if agentDiagnostic}
									<button type="button" onclick={() => (errorExpanded = !errorExpanded)}
										>{errorExpanded ? 'Hide details' : 'View details'}</button
									>
								{/if}
								<button
									class="retry-error"
									type="button"
									disabled={agentBusy}
									onclick={() =>
										settings.apiKey
											? runAgent(
													lastAgentRequest || 'Create three infographic directions from this brief.'
												)
											: createConcepts()}>Try again</button
								>
							</div>
							{#if errorExpanded && agentDiagnostic}
								<div class="diagnostic-details">
									<div>
										<strong>Local diagnostic</strong>
										<button type="button" onclick={copyDiagnostic}
											><Icon icon={Copy} size={12} /> {diagnosticCopied ? 'Copied' : 'Copy'}</button
										>
									</div>
									<pre>{agentDiagnosticText}</pre>
								</div>
							{/if}
						</div>
					{/if}

					{#if step === 'planning'}
						<div class="assistant-row compact-row planning-row">
							<div class="mini-avatar working"><Icon icon={LoaderCircle} size={14} /></div>
							<div class="assistant-copy">
								<span class="speaker">Agent at work</span>
								<p class="chat-line"><strong>{agentStatus}</strong></p>
								<small>{agentDetail}</small>
							</div>
						</div>
						<div class="parallel-directions" aria-live="polite">
							<div class="parallel-head">
								<div>
									<strong>Exploring directions</strong><small
										>Independent prompts, arriving in parallel</small
									>
								</div>
								<span
									>{streamingConcepts.filter(Boolean).length}/{streamingConcepts.length} ready</span
								>
							</div>
							<div class="parallel-grid">
								{#each streamingConcepts as concept, index (index)}
									{#if !concept}
										{@const partial = streamingPartials[index]}
										<article class="direction-skeleton">
											<div>
												<span>Direction 0{index + 1}</span><Icon icon={LoaderCircle} size={15} />
											</div>
											<h4>
												{streamingErrors[index]
													? 'Needs attention'
													: partial.title || 'Developing direction…'}
											</h4>
											<p>
												{streamingErrors[index] ||
													partial.strapline ||
													'Finding a distinct story structure and visual metaphor.'}
											</p>
											{#if partial.layout}
												<div class="draft-field">
													<span>Structure</span>
													<p>{partial.layout}</p>
												</div>
											{/if}
											{#if partial.prompt}
												<p class="draft-prompt">{partial.prompt}</p>
											{:else}
												<div class="skeleton-lines"><i></i><i></i><i></i><i></i></div>
											{/if}
										</article>
									{/if}
								{/each}
							</div>
						</div>
					{/if}

					{#if selectedConcept}
						{#if selectedConcept}
							<section class="batch-widget">
								<div class="batch-copy">
									<span class="batch-icon"><Icon icon={ImageIcon} size={16} /></span>
									<div>
										<span>Selected direction</span>
										<h3>{selectedConcept.title}</h3>
										<p>
											Create a family of variations in parallel. Each job keeps the core story while
											exploring a new composition.
										</p>
									</div>
								</div>
								<label class="batch-prompt">
									<span
										><strong>Prompt for this batch</strong><small
											>{batchPrompt.length.toLocaleString()} characters</small
										></span
									>
									<textarea
										bind:value={batchPrompt}
										rows="6"
										spellcheck="true"
										aria-label="Prompt for this batch"></textarea>
								</label>
								<div class="batch-options">
									<div class="batch-control">
										<span>Batch size</span>
										<div>
											<button
												type="button"
												aria-label="Decrease batch"
												onclick={() => (batchSize = Math.max(1, batchSize - 1))}
												><Icon icon={Minus} size={13} /></button
											><strong>{batchSize}</strong><button
												type="button"
												aria-label="Increase batch"
												onclick={() => (batchSize = Math.min(10, batchSize + 1))}
												><Icon icon={Plus} size={13} /></button
											>
										</div>
									</div>
									<label class="batch-option"
										><span>Quality</span><select
											bind:value={batchQuality}
											aria-label="Batch quality"
											>{#each imageQualities(settings.imageModel) as quality (quality)}<option
													value={quality}>{imageQualityName(quality)}</option
												>{/each}</select
										></label
									>
									<label class="batch-option"
										><span>File type</span><select bind:value={batchFormat} aria-label="File type"
											><option value="webp">WebP</option><option value="png">PNG</option><option
												value="jpeg">JPEG</option
											></select
										></label
									>
								</div>
								<button
									class="generate-batch"
									type="button"
									disabled={!batchPrompt.trim()}
									onclick={() => createBatch(selectedConcept!, batchSize)}
									><Icon icon={Sparkles} size={14} /> Generate {batchSize} variation{batchSize === 1
										? ''
										: 's'}</button
								>
							</section>
						{/if}
					{/if}
				</div>
			</div>

			<div class="composer-wrap">
				<StudioComposer
					bind:value={composerText}
					{settings}
					width={project.imageWidth}
					height={project.imageHeight}
					references={activeReferences}
					busy={agentBusy}
					activity={agentStatus}
					{attachmentMessage}
					onSubmit={submitComposer}
					onStop={stopAgent}
					onFiles={attachFiles}
					onRemoveReference={removeReference}
					onSettingsChange={updateComposerSettings}
					onSizeChange={updateImageSize}
					onOpenSettings={() => (settingsOpen = true)}
				/>
			</div>
		</section>

		<button
			class="wall-resizer"
			type="button"
			aria-label="Resize generation wall"
			title={`Generation wall width: ${settings.generationWallWidth}px. Drag or use arrow keys.`}
			onpointerdown={(event) => {
				resizingWall = true;
				event.currentTarget.setPointerCapture(event.pointerId);
			}}
			onkeydown={resizeWallWithKeyboard}
			ondblclick={() => {
				settings.generationWallWidth = 420;
				saveSettings($state.snapshot(settings));
			}}
		>
			<i></i>
		</button>

		<div class:open={wallOpen} class="wall-pane">
			<button
				class="mobile-wall-close"
				type="button"
				onclick={() => (wallOpen = false)}
				aria-label="Close generation wall"><Icon icon={X} size={17} /></button
			>
			<GenerationWall
				generations={project.generations}
				{partialImages}
				{focusedGenerationId}
				onOpen={openGenerationViewer}
				onRetry={retryGeneration}
				onRegenerate={regenerateGeneration}
				onReference={referenceGeneration}
			/>
		</div>
	</main>
</div>

<SettingsPanel
	open={settingsOpen}
	{settings}
	onClose={() => {
		settingsOpen = false;
		pendingConcept = null;
	}}
	onSave={updateSettings}
/>

{#if openPrompt}
	<div
		class="prompt-inspector-backdrop"
		role="presentation"
		onclick={(event) => event.target === event.currentTarget && (openPrompt = null)}
	>
		<div class="prompt-inspector" role="dialog" aria-modal="true" aria-label="Full image prompt">
			<header>
				<div>
					<span>Production prompt</span>
					<h2>{openPrompt.title}</h2>
				</div>
				<button type="button" onclick={() => (openPrompt = null)} aria-label="Close prompt"
					><Icon icon={X} size={18} /></button
				>
			</header>
			<div class="prompt-inspector-body">
				<div class="prompt-meta">
					<span><Icon icon={FileText} size={13} /> Full, unabridged prompt</span><span
						>{openPrompt.prompt.length.toLocaleString()} characters</span
					>
				</div>
				<p>{openPrompt.prompt}</p>
			</div>
			<footer>
				<button class="copy-full" type="button" onclick={copyOpenPrompt}
					><Icon icon={Copy} size={14} /> {promptCopied ? 'Copied' : 'Copy full prompt'}</button
				>
				<button
					class="use-direction"
					type="button"
					onclick={() => {
						selectConcept(openPrompt!);
						openPrompt = null;
					}}>Use this direction <Icon icon={ArrowRight} size={14} /></button
				>
			</footer>
		</div>
	</div>
{/if}

{#if openGeneration?.imageUrl}
	<div
		class:filmstrip-hidden={!lightboxFilmstripOpen}
		class="lightbox"
		role="dialog"
		aria-modal="true"
		aria-label="Image viewer"
	>
		<header class="lightbox-toolbar">
			<div class="lightbox-title">
				<strong>{openGeneration.conceptTitle}</strong>
				<span>Variation {openGeneration.variation} of {openGeneration.totalVariations}</span>
			</div>
			<div class="lightbox-actions">
				<div class="zoom-controls" aria-label="Zoom controls">
					<button
						type="button"
						onclick={() => setLightboxZoom(lightboxTargetZoom / 1.25)}
						disabled={lightboxTargetZoom <= 1}
						aria-label="Zoom out"><Icon icon={ZoomOut} size={17} /></button
					>
					<button
						type="button"
						class="zoom-value"
						onclick={() => setLightboxZoom(1)}
						aria-label="Fit image">{Math.round(lightboxZoom * 100)}%</button
					>
					<button
						type="button"
						onclick={() => setLightboxZoom(lightboxTargetZoom * 1.25)}
						disabled={lightboxTargetZoom >= 5}
						aria-label="Zoom in"><Icon icon={ZoomIn} size={17} /></button
					>
				</div>
				<div class="lightbox-commands" aria-label="Image actions">
					<button type="button" onclick={copyLightboxPrompt}
						><Icon icon={Copy} size={15} /> {lightboxCopied ? 'Copied' : 'Copy prompt'}</button
					>
					<button
						type="button"
						onclick={() => {
							regenerateGeneration(openGeneration!);
							closeGenerationViewer();
						}}><Icon icon={RotateCcw} size={15} /> Regenerate</button
					>
					<button type="button" onclick={() => referenceGeneration(openGeneration!)}
						><Icon icon={ImagePlus} size={15} /> Reference</button
					>
					<button type="button" onclick={downloadOpenGeneration}
						><Icon icon={ArrowDownToLine} size={15} /> Download</button
					>
				</div>
				<button
					class:active={lightboxFilmstripOpen}
					class="lightbox-filmstrip-toggle"
					type="button"
					onclick={() => setLightboxFilmstrip(!lightboxFilmstripOpen)}
					aria-label={lightboxFilmstripOpen ? 'Hide thumbnails' : 'Show thumbnails'}
					title={lightboxFilmstripOpen ? 'Hide thumbnails' : 'Show thumbnails'}
					aria-pressed={lightboxFilmstripOpen}
					><Icon icon={GalleryHorizontalEnd} size={18} /></button
				>
				<button
					class="lightbox-close"
					type="button"
					onclick={closeGenerationViewer}
					aria-label="Close image"><Icon icon={X} size={20} /></button
				>
			</div>
		</header>

		<div
			bind:this={lightboxStage}
			role="region"
			aria-label="Zoomable image"
			class:dragging={lightboxDragging}
			class:zoomed={lightboxZoom > 1}
			class="lightbox-stage"
			onwheel={handleLightboxWheel}
			onpointerdown={startLightboxDrag}
			onpointermove={moveLightboxDrag}
			onpointerup={stopLightboxDrag}
			onpointercancel={stopLightboxDrag}
		>
			{#if lightboxGenerations.length > 1}
				<button
					class="lightbox-nav previous"
					type="button"
					disabled={lightboxIndex <= 0}
					onclick={() => navigateLightbox(-1)}
					aria-label="Previous image"><Icon icon={ChevronLeft} size={23} /></button
				>
				<button
					class="lightbox-nav next"
					type="button"
					disabled={lightboxIndex >= lightboxGenerations.length - 1}
					onclick={() => navigateLightbox(1)}
					aria-label="Next image"><Icon icon={ChevronRight} size={23} /></button
				>
			{/if}
			<div
				class="lightbox-media"
				style={lightboxBaseWidth
					? `width:${lightboxBaseWidth}px;height:${lightboxBaseHeight}px;left:${lightboxStageWidth / 2 + lightboxPanX}px;top:${lightboxStageHeight / 2 + lightboxPanY}px;transform:translate(-50%, -50%) scale(${lightboxZoom})`
					: ''}
			>
				<img
					draggable="false"
					src={openGeneration.imageUrl}
					alt={`Generated infographic: ${openGeneration.conceptTitle}`}
					onload={loadLightboxImage}
					ondblclick={() => setLightboxZoom(lightboxTargetZoom > 1 ? 1 : 2)}
				/>
			</div>

			{#if lightboxMinimap}
				<button
					type="button"
					class:dragging={lightboxMinimapDragging}
					class="lightbox-minimap"
					aria-label="Image minimap. Click or drag to navigate."
					style={`width:${lightboxMinimap.width}px;height:${lightboxMinimap.height}px`}
					onpointerdown={startLightboxMinimapDrag}
					onpointermove={moveLightboxMinimapDrag}
					onpointerup={stopLightboxMinimapDrag}
					onpointercancel={stopLightboxMinimapDrag}
					onkeydown={handleLightboxMinimapKeydown}
				>
					<img src={openGeneration.imageUrl} alt="" draggable="false" />
					<span
						class="minimap-viewport"
						style={`left:${lightboxMinimap.viewportLeft}px;top:${lightboxMinimap.viewportTop}px;width:${lightboxMinimap.viewportWidth}px;height:${lightboxMinimap.viewportHeight}px`}
					></span>
					<span class="navigator-label">Navigator</span>
				</button>
			{/if}
		</div>

		{#if lightboxFilmstripOpen}
			<footer class="lightbox-filmstrip">
				<div class="filmstrip-label">
					<span>{lightboxIndex + 1} of {lightboxGenerations.length}</span>
					<small>← → browse · Scroll to zoom · Drag to pan · 0 to fit</small>
				</div>
				<div class="filmstrip-scroll" aria-label="Generation thumbnails">
					{#each lightboxGenerations as generation, index (generation.id)}
						<button
							class:active={generation.id === openGeneration.id}
							type="button"
							onclick={() => openGenerationViewer(generation)}
							aria-label={`Open ${generation.conceptTitle}, image ${index + 1}`}
							aria-current={generation.id === openGeneration.id ? 'true' : undefined}
							style={`--thumbnail-ratio:${generationThumbnailRatio(generation)}`}
						>
							<img src={generation.imageUrl} alt="" />
						</button>
					{/each}
				</div>
			</footer>
		{/if}
	</div>
{/if}
