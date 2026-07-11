<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ArrowDownToLine,
		ArrowRight,
		Check,
		ChevronDown,
		Copy,
		FileText,
		GalleryHorizontalEnd,
		Home,
		ImageIcon,
		ImagePlus,
		KeyRound,
		LoaderCircle,
		Menu,
		Minus,
		Moon,
		PanelLeftClose,
		Plus,
		RotateCcw,
		Search,
		Settings2,
		Sparkles,
		Sun,
		Trash2,
		X,
		ZoomIn,
		ZoomOut
	} from '@lucide/svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import BriefWidget from '$lib/components/BriefWidget.svelte';
	import ConceptCard from '$lib/components/ConceptCard.svelte';
	import GenerationWall from '$lib/components/GenerationWall.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import StylePicker from '$lib/components/StylePicker.svelte';
	import { planInfographics } from '$lib/studio/agent';
	import {
		formatDiagnostic,
		recordDiagnostic,
		type DiagnosticRecord
	} from '$lib/studio/diagnostics';
	import { runGenerationBatch } from '$lib/studio/openai';
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

	type Step = 'topic' | 'style' | 'brief' | 'planning' | 'concepts';

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
			updatedAt: now
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
	let planIntro = $state('');
	let batchSize = $state(4);
	let openGeneration = $state<Generation | null>(null);
	let pendingConcept = $state<InfographicConcept | null>(null);
	let recentProjects = $state<StudioProject[]>([]);
	let streamingConcepts = $state<Array<InfographicConcept | null>>([null, null, null]);
	let streamingPartials = $state<Array<Partial<InfographicConcept>>>([{}, {}, {}]);
	let openPrompt = $state<InfographicConcept | null>(null);
	let promptCopied = $state(false);
	let resetArmed = $state(false);
	let resizingWall = $state(false);
	let attachmentMessage = $state('');
	let batchPrompt = $state('');
	let batchQuality = $state<ImageQuality>('medium');
	let batchFormat = $state<ImageFormat>('webp');
	let lightboxZoom = $state(1);
	let lightboxBaseWidth = $state(0);
	let lightboxBaseHeight = $state(0);
	let lightboxNaturalWidth = $state(0);
	let lightboxNaturalHeight = $state(0);
	let lightboxCopied = $state(false);
	let lightboxDragging = $state(false);
	let lightboxDragX = 0;
	let lightboxDragY = 0;
	let lightboxScrollX = 0;
	let lightboxScrollY = 0;
	let attachmentInput: HTMLInputElement;
	let lightboxStage = $state<HTMLDivElement>();

	let selectedConcept = $derived(
		project.concepts.find((concept) => concept.id === project.selectedConceptId) ?? null
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

	onMount(async () => {
		settings = loadSettings();
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
		hydrated = true;
	});

	function stepForProject(value: StudioProject): Step {
		return value.concepts?.length
			? 'concepts'
			: value.styleId
				? 'brief'
				: value.topic
					? 'style'
					: 'topic';
	}

	function applyLoadedProject(value: StudioProject) {
		project = {
			...newProject(),
			...value,
			notes: value.notes ?? [],
			referenceAssets: value.referenceAssets ?? [],
			activeReferenceIds: value.activeReferenceIds ?? []
		};
		batchPrompt =
			project.concepts.find((concept) => concept.id === project.selectedConceptId)?.prompt ?? '';
		batchQuality = settings.quality;
		batchFormat = 'webp';
		step = stepForProject(project);
		planIntro = '';
		agentError = '';
		openPrompt = null;
		wallOpen = false;
	}

	function persist() {
		if (!hydrated) return;
		project.updatedAt = Date.now();
		const snapshot = $state.snapshot(project);
		recentProjects = [snapshot, ...recentProjects.filter((item) => item.id !== snapshot.id)].sort(
			(a, b) => b.updatedAt - a.updatedAt
		);
		void saveProject(snapshot);
	}

	async function openProject(id: string) {
		const saved = await activateProject(id);
		if (!saved) return;
		applyLoadedProject(saved);
		sidebarOpen = false;
		projectMenuOpen = false;
	}

	async function startNewCanvas() {
		const next = newProject();
		project = next;
		step = 'topic';
		planIntro = '';
		agentError = '';
		agentDiagnostic = null;
		streamingConcepts = [null, null, null];
		streamingPartials = [{}, {}, {}];
		sidebarOpen = false;
		projectMenuOpen = false;
		wallOpen = false;
		await saveProject($state.snapshot(next));
		recentProjects = [next, ...recentProjects.filter((item) => item.id !== next.id)];
	}

	function submitComposer() {
		const message = composerText.trim();
		if (!message) return;
		composerText = '';

		if (step === 'topic') {
			project.topic = message;
			step = 'style';
			persist();
			return;
		}

		if (step === 'concepts') {
			project.notes.push(message);
			persist();
			void createConcepts(message);
			return;
		}

		project.topic = message;
		project.styleId = null;
		project.concepts = [];
		step = 'style';
		persist();
	}

	function useStarter(topic: string) {
		composerText = topic;
		submitComposer();
	}

	function selectStyle(styleId: StyleId) {
		project.styleId = styleId;
		persist();
		setTimeout(() => {
			if (step === 'style') step = 'brief';
		}, 220);
	}

	function handleAgentEvent(event: AgentEvent) {
		if (event.type === 'direction-start') {
			agentStatus = 'Developing three directions in parallel';
			agentDetail = `${event.label} started on ${event.model}`;
			return;
		}
		if (event.type === 'direction-progress') {
			streamingPartials[event.index - 1] = event.partial;
			agentStatus = 'Directions are arriving live';
			const ready = streamingConcepts.filter(Boolean).length;
			agentDetail = `${ready} of 3 complete · three model jobs running in parallel`;
			return;
		}
		if (event.type === 'direction-ready') {
			streamingConcepts[event.index - 1] = event.concept;
			streamingPartials[event.index - 1] = event.concept;
			const ready = streamingConcepts.filter(Boolean).length;
			agentStatus = ready === 3 ? 'Three directions ready' : 'Publishing directions as they finish';
			agentDetail = `${ready} of 3 complete · ${event.model}`;
			return;
		}
		if (event.type === 'drafting') {
			agentStatus = 'Writing the directions';
			agentDetail = `Three cards are being developed in parallel · ${event.model}`;
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

	async function createConcepts(refinement?: string) {
		if (!project.styleId) return;
		step = 'planning';
		agentError = '';
		agentDiagnostic = null;
		errorExpanded = false;
		agentStatus = refinement ? 'Reworking the directions' : 'Reading the brief';
		agentDetail = 'Deciding whether fresh research will improve the result';
		streamingConcepts = [null, null, null];
		streamingPartials = [{}, {}, {}];

		try {
			const style = getStyle(project.styleId);
			const direction = project.customDirection.trim();
			const plan = await planInfographics(
				{
					topic: refinement
						? `${project.topic}\nAdditional direction: ${refinement}`
						: project.topic,
					styleId: project.styleId,
					styleLabel: direction
						? `${style.name}. Additional art direction: ${direction}`
						: style.name,
					audience: project.audience,
					aspect: project.aspect,
					imageWidth: project.imageWidth,
					imageHeight: project.imageHeight,
					density: project.density,
					count: 3,
					plannerModel: settings.plannerModel
				},
				settings.apiKey,
				handleAgentEvent
			);

			planIntro = plan.intro;
			project.concepts = plan.concepts;
			project.plannerModelUsed = plan.modelUsed ?? undefined;
			project.selectedConceptId = null;
			step = 'concepts';

			const initialJobs =
				settings.apiKey && settings.autoGenerate
					? plan.concepts.map((concept, index) =>
							makeGeneration(concept, 1, 1, Date.now() + index, true)
						)
					: [];
			if (initialJobs.length) project.generations = [...initialJobs, ...project.generations];
			persist();
			setTimeout(
				() =>
					document
						.querySelector('.concepts-intro')
						?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
				80
			);

			if (initialJobs.length) void generateJobs(initialJobs);
		} catch (error) {
			agentDiagnostic = recordDiagnostic('concept-planning', error, {
				plannerModel: settings.plannerModel,
				workflowStage: agentStatus || 'unknown',
				hasApiKey: Boolean(settings.apiKey)
			});
			agentError =
				error instanceof Error ? error.message : 'The creative director could not finish the plan.';
			step = 'brief';
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
		outputFormat: ImageFormat = 'webp'
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
			outputFormat
		};
	}

	function updateGeneration(generation: Generation) {
		const index = project.generations.findIndex((item) => item.id === generation.id);
		if (index === -1) return;
		project.generations[index] = generation;
		persist();
	}

	async function generateJobs(jobs: Generation[]) {
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
				outputFormat: 'webp'
			},
			updateGeneration
		);
	}

	function selectConcept(concept: InfographicConcept) {
		project.selectedConceptId = concept.id;
		batchSize = settings.defaultBatchSize;
		batchPrompt = concept.prompt;
		batchQuality = settings.quality;
		batchFormat = 'webp';
		persist();
		setTimeout(
			() =>
				document
					.querySelector('.batch-widget')
					?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
			80
		);
	}

	function conceptThumbnail(conceptId: string) {
		return (
			project.generations.find(
				(generation) =>
					generation.conceptId === conceptId &&
					generation.status === 'complete' &&
					Boolean(generation.imageUrl)
			) ?? null
		);
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

	async function attachFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (!files.length) return;

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
			if (!project.activeReferenceIds.includes(existing.id)) {
				if (project.activeReferenceIds.length >= MAX_ACTIVE_REFERENCES) {
					showAttachmentMessage(`You can use up to ${MAX_ACTIVE_REFERENCES} references.`);
					return;
				}
				project.activeReferenceIds = [...project.activeReferenceIds, existing.id];
				persist();
			}
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
			sourceGenerationId: generation.id
		};
		project.referenceAssets = [asset, ...project.referenceAssets];
		project.activeReferenceIds = [...project.activeReferenceIds, asset.id];
		persist();
		showAttachmentMessage('Generation added as a reference.');
	}

	function openGenerationViewer(generation: Generation) {
		openGeneration = generation;
		lightboxZoom = 1;
		lightboxBaseWidth = 0;
		lightboxBaseHeight = 0;
		lightboxNaturalWidth = 0;
		lightboxNaturalHeight = 0;
		lightboxCopied = false;
	}

	function closeGenerationViewer() {
		openGeneration = null;
		lightboxDragging = false;
	}

	function fitLightboxImage() {
		if (!lightboxNaturalWidth || !lightboxNaturalHeight) return;
		const availableWidth = Math.max(240, window.innerWidth - 64);
		const availableHeight = Math.max(220, window.innerHeight - 148);
		const fitScale = Math.min(
			availableWidth / lightboxNaturalWidth,
			availableHeight / lightboxNaturalHeight,
			1
		);
		lightboxBaseWidth = Math.round(lightboxNaturalWidth * fitScale);
		lightboxBaseHeight = Math.round(lightboxNaturalHeight * fitScale);
	}

	function loadLightboxImage(event: Event) {
		const image = event.currentTarget as HTMLImageElement;
		lightboxNaturalWidth = image.naturalWidth;
		lightboxNaturalHeight = image.naturalHeight;
		lightboxZoom = 1;
		fitLightboxImage();
		requestAnimationFrame(() => lightboxStage?.scrollTo({ left: 0, top: 0 }));
	}

	function setLightboxZoom(next: number) {
		const zoom = Math.min(5, Math.max(0.5, Math.round(next * 100) / 100));
		if (zoom === lightboxZoom) return;
		const stage = lightboxStage;
		const previous = lightboxZoom;
		const centerX = stage ? stage.scrollLeft + stage.clientWidth / 2 : 0;
		const centerY = stage ? stage.scrollTop + stage.clientHeight / 2 : 0;
		lightboxZoom = zoom;
		requestAnimationFrame(() => {
			if (!stage) return;
			const factor = zoom / previous;
			stage.scrollTo({
				left: centerX * factor - stage.clientWidth / 2,
				top: centerY * factor - stage.clientHeight / 2
			});
		});
	}

	function handleLightboxWheel(event: WheelEvent) {
		event.preventDefault();
		setLightboxZoom(lightboxZoom + (event.deltaY < 0 ? 0.2 : -0.2));
	}

	function startLightboxDrag(event: PointerEvent) {
		if (!lightboxStage || lightboxZoom <= 1 || event.button !== 0) return;
		lightboxDragging = true;
		lightboxDragX = event.clientX;
		lightboxDragY = event.clientY;
		lightboxScrollX = lightboxStage.scrollLeft;
		lightboxScrollY = lightboxStage.scrollTop;
		lightboxStage.setPointerCapture(event.pointerId);
	}

	function moveLightboxDrag(event: PointerEvent) {
		if (!lightboxStage || !lightboxDragging) return;
		lightboxStage.scrollLeft = lightboxScrollX - (event.clientX - lightboxDragX);
		lightboxStage.scrollTop = lightboxScrollY - (event.clientY - lightboxDragY);
	}

	function stopLightboxDrag(event: PointerEvent) {
		lightboxDragging = false;
		if (lightboxStage?.hasPointerCapture(event.pointerId)) {
			lightboxStage.releasePointerCapture(event.pointerId);
		}
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
		applyTheme(next.theme);
		batchSize = next.defaultBatchSize;
		saveSettings($state.snapshot(settings));
		if (pendingConcept && next.apiKey) {
			const concept = pendingConcept;
			pendingConcept = null;
			setTimeout(() => createBatch(concept, batchSize), 650);
		}
	}

	async function resetStudio() {
		const deletedId = project.id;
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
			else if (event.key === '+' || event.key === '=') setLightboxZoom(lightboxZoom + 0.25);
			else if (event.key === '-') setLightboxZoom(lightboxZoom - 0.25);
			else if (event.key === '0') setLightboxZoom(1);
			return;
		}
		if (event.key === 'Escape') closeOverlays();
	}

	function resizeWall(event: PointerEvent) {
		if (!resizingWall) return;
		const maxWidth = Math.min(760, window.innerWidth * 0.58);
		settings.generationWallWidth = Math.round(
			Math.min(maxWidth, Math.max(320, window.innerWidth - event.clientX))
		);
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
			760,
			Math.max(320, settings.generationWallWidth + delta)
		);
		saveSettings($state.snapshot(settings));
	}
</script>

<svelte:window
	onkeydown={handleWindowKeydown}
	onresize={fitLightboxImage}
	onpointermove={resizeWall}
	onpointerup={stopWallResize}
/>

<svelte:head>
	<title>Lattice — Infographic Studio</title>
	<meta
		name="description"
		content="Brainstorm, research, and generate remarkable infographics with an agentic creative director."
	/>
</svelte:head>

<div class="studio-shell">
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
				><PanelLeftClose size={17} /></button
			>
		</div>
		<button class="sidebar-new" type="button" onclick={startNewCanvas}
			><Plus size={15} /> New blank canvas</button
		>
		<nav>
			<span>Canvas history</span>
			<div class="canvas-history">
				{#each recentProjects as canvas (canvas.id)}
					<button
						class:active={canvas.id === project.id}
						type="button"
						onclick={() => openProject(canvas.id)}
						><Home size={15} />
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
					sidebarOpen = false;
				}}
				><GalleryHorizontalEnd size={15} />
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
				sidebarOpen = false;
			}}><Settings2 size={15} /> Studio settings</button
		>
		<button
			class:armed={resetArmed}
			class="sidebar-action danger"
			type="button"
			onclick={requestReset}
			><Trash2 size={15} /> {resetArmed ? 'Confirm deletion' : 'Delete this canvas'}</button
		>
	</aside>

	<header class="topbar">
		<div class="topbar-left">
			<button
				class="menu-button"
				type="button"
				onclick={() => (sidebarOpen = true)}
				aria-label="Open menu"><Menu size={16} /></button
			>
			<BrandMark />
		</div>
		<div class="project-switcher">
			<button
				class="project-title"
				type="button"
				onclick={() => (projectMenuOpen = !projectMenuOpen)}
				aria-expanded={projectMenuOpen}
			>
				<span>{project.topic || 'Untitled infographic'}</span>
				<ChevronDown size={13} />
			</button>
			{#if projectMenuOpen}
				<div class="project-menu">
					<div>
						<strong>{project.topic || 'Untitled infographic'}</strong><small>Current canvas</small>
					</div>
					<button type="button" onclick={startNewCanvas}><Plus size={14} /> New blank canvas</button
					>
					<button
						type="button"
						onclick={() => {
							wallOpen = true;
							projectMenuOpen = false;
						}}><GalleryHorizontalEnd size={14} /> Open generation wall</button
					>
					<button class:armed={resetArmed} class="danger" type="button" onclick={requestReset}
						><Trash2 size={14} /> {resetArmed ? 'Confirm deletion' : 'Delete canvas'}</button
					>
				</div>
			{/if}
		</div>
		<div class="topbar-actions">
			{#if activeJobs > 0}<span class="job-pill"><i></i>{activeJobs} rendering</span>{/if}
			<button
				class="wall-toggle"
				type="button"
				onclick={() => (wallOpen = !wallOpen)}
				aria-label="Toggle generation wall"
				><GalleryHorizontalEnd size={16} />{#if completedJobs}<span>{completedJobs}</span
					>{/if}</button
			>
			<button
				class:connected={Boolean(settings.apiKey)}
				class="connection"
				type="button"
				onclick={() => (settingsOpen = true)}
			>
				{#if settings.apiKey}<Check size={12} strokeWidth={3} /> Connected{:else}<KeyRound
						size={13}
					/> Demo mode{/if}
			</button>
			<button
				class="theme-button"
				type="button"
				onclick={toggleTheme}
				aria-label={settings.theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
				title={settings.theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
				>{#if settings.theme === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}</button
			>
			<button
				class="settings-button"
				type="button"
				onclick={() => (settingsOpen = true)}
				aria-label="Settings"><Settings2 size={16} /></button
			>
		</div>
	</header>

	<main
		class:resizing-wall={resizingWall}
		class="workspace"
		style={`--wall-width:${settings.generationWallWidth}px`}
	>
		<section class="conversation">
			<div class="conversation-scroll">
				<div class="chat-column">
					{#if step === 'topic'}
						<div class="intro-row">
							<div class="assistant-copy">
								<span class="speaker">Creative director</span>
								<h1>What should we make<br />clear <em>and</em> beautiful?</h1>
								<p>
									Give me a topic. I’ll shape the story, research what matters, and turn it into
									several visual directions.
								</p>
							</div>
						</div>
						<div class="starter-prompts">
							<span>Or start with an idea</span>
							<div>
								{#each starterTopics as topic (topic)}<button
										type="button"
										onclick={() => useStarter(topic)}>{topic}<ArrowRight size={12} /></button
									>{/each}
							</div>
						</div>
					{/if}

					{#if project.topic}
						<div class="user-row">
							<div class="user-bubble">{project.topic}</div>
							<div class="user-avatar">EL</div>
						</div>
					{/if}

					{#if step === 'style'}
						<div class="assistant-row compact-row">
							<div class="mini-avatar"><Sparkles size={13} /></div>
							<div class="assistant-copy">
								<span class="speaker">Creative direction</span>
								<p class="chat-line">
									Lovely territory. Let’s decide how it should feel before I sketch the information.
								</p>
							</div>
						</div>
						<div class="widget-indent">
							<StylePicker
								selected={project.styleId}
								customDirection={project.customDirection}
								connected={Boolean(settings.apiKey)}
								onSelect={selectStyle}
								onCustomDirection={updateCustomDirection}
							/>
						</div>
					{:else if project.styleId}
						<div class="decision-summary">
							<span><Sparkles size={13} /></span>
							<div>
								<small>Information strategy</small><strong>{getStyle(project.styleId).name}</strong>
							</div>
							<button type="button" onclick={() => (step = 'style')}>Edit</button>
						</div>
					{/if}

					{#if step === 'brief'}
						<div class="assistant-row compact-row">
							<div class="mini-avatar"><Sparkles size={13} /></div>
							<div class="assistant-copy">
								<span class="speaker">One last thing</span>
								<p class="chat-line">Who is this for, and how much should it say at a glance?</p>
							</div>
						</div>
						<div class="widget-indent">
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
								onContinue={() => createConcepts()}
							/>
						</div>
					{:else if step === 'planning' || step === 'concepts'}
						<div class="decision-summary brief">
							<span><FileText size={13} /></span>
							<div>
								<small>Brief</small><strong
									>{project.audience} · {project.imageWidth}×{project.imageHeight} · {[
										'Light',
										'Balanced',
										'Dense'
									][project.density - 1]}</strong
								>
							</div>
							<button type="button" onclick={() => (step = 'brief')}>Edit</button>
						</div>
					{/if}

					{#if agentError}
						<div class:expanded={errorExpanded} class="error-bubble">
							<X size={14} />
							<div class="error-copy"><strong>I hit a snag</strong><span>{agentError}</span></div>
							<div class="error-actions">
								{#if agentDiagnostic}
									<button type="button" onclick={() => (errorExpanded = !errorExpanded)}
										>{errorExpanded ? 'Hide details' : 'View details'}</button
									>
								{/if}
								<button class="retry-error" type="button" onclick={() => createConcepts()}
									>Try again</button
								>
							</div>
							{#if errorExpanded && agentDiagnostic}
								<div class="diagnostic-details">
									<div>
										<strong>Local diagnostic</strong>
										<button type="button" onclick={copyDiagnostic}
											><Copy size={12} /> {diagnosticCopied ? 'Copied' : 'Copy'}</button
										>
									</div>
									<pre>{agentDiagnosticText}</pre>
								</div>
							{/if}
						</div>
					{/if}

					{#if step === 'planning'}
						<div class="assistant-row compact-row planning-row">
							<div class="mini-avatar working"><LoaderCircle size={14} /></div>
							<div class="assistant-copy">
								<span class="speaker">Agent at work</span>
								<p class="chat-line"><strong>{agentStatus}</strong></p>
								<small>{agentDetail}</small>
							</div>
						</div>
						<div class="activity-card">
							<div>
								<span class="activity-icon"><Search size={13} /></span>
								<div>
									<strong>Research & visual strategy</strong><small
										>Fresh facts only when the topic needs them</small
									>
								</div>
							</div>
							<span class="activity-status"><i></i> Running</span>
						</div>
						<div class="parallel-directions" aria-live="polite">
							<div class="parallel-head">
								<div>
									<strong>Parallel direction studio</strong><small
										>Each card has its own model job</small
									>
								</div>
								<span>{streamingConcepts.filter(Boolean).length}/3 published</span>
							</div>
							<div class="parallel-grid">
								{#each streamingConcepts as concept, index (index)}
									{#if concept}
										<ConceptCard
											{concept}
											{index}
											selected={false}
											onSelect={() => (openPrompt = concept)}
											onOpenPrompt={() => (openPrompt = concept)}
										/>
									{:else}
										{@const partial = streamingPartials[index]}
										<article class="direction-skeleton">
											<div><span>Direction 0{index + 1}</span><LoaderCircle size={15} /></div>
											<h4>{partial.title || 'Developing direction…'}</h4>
											<p>
												{partial.strapline ||
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

					{#if step === 'concepts' && project.concepts.length}
						<div class="assistant-row compact-row concepts-intro">
							<div class="mini-avatar"><Sparkles size={13} /></div>
							<div class="assistant-copy">
								<span class="speaker"
									>{project.plannerModelUsed
										? `AI directions · ${project.plannerModelUsed}`
										: 'Demo directions · sample content'}</span
								>
								<p class="chat-line">
									{planIntro || `I found three distinct visual systems for ${project.topic}.`}
								</p>
								<small
									>{settings.apiKey && settings.autoGenerate
										? 'The first drafts are rendering on your generation wall.'
										: settings.apiKey
											? 'Prompts are ready. No image jobs were created because auto-render is off.'
											: 'These are clearly labeled demo prompts. Connect OpenAI for live model-written directions.'}</small
								>
							</div>
						</div>
						<div class="concept-grid">
							{#each project.concepts as concept, index (concept.id)}
								<ConceptCard
									{concept}
									{index}
									selected={project.selectedConceptId === concept.id}
									thumbnail={conceptThumbnail(concept.id)}
									onSelect={() => selectConcept(concept)}
									onOpenPrompt={() => (openPrompt = concept)}
								/>
							{/each}
						</div>

						{#each project.notes as note, noteIndex (noteIndex)}
							<div class="user-row followup">
								<div class="user-bubble">{note}</div>
								<div class="user-avatar">EL</div>
							</div>
						{/each}

						{#if selectedConcept}
							<section class="batch-widget">
								<div class="batch-copy">
									<span class="batch-icon"><ImageIcon size={16} /></span>
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
												><Minus size={13} /></button
											><strong>{batchSize}</strong><button
												type="button"
												aria-label="Increase batch"
												onclick={() => (batchSize = Math.min(10, batchSize + 1))}
												><Plus size={13} /></button
											>
										</div>
									</div>
									<label class="batch-option"
										><span>Quality</span><select
											bind:value={batchQuality}
											aria-label="Batch quality"
											>{#each ['low', 'medium', 'high'] as quality (quality)}<option value={quality}
													>{quality[0].toUpperCase() + quality.slice(1)}</option
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
									><Sparkles size={14} /> Generate {batchSize} variation{batchSize === 1
										? ''
										: 's'}</button
								>
							</section>
						{/if}
					{/if}
				</div>
			</div>

			<div class="composer-wrap">
				{#if activeReferences.length || attachmentMessage}
					<div class="attachment-tray" aria-live="polite">
						<div class="attachment-list">
							{#each activeReferences as reference (reference.id)}
								<div class="attachment-chip">
									<img src={reference.dataUrl} alt="" />
									<span
										><strong>{reference.name}</strong><small
											>{reference.width} × {reference.height}</small
										></span
									>
									<button
										type="button"
										onclick={() => removeReference(reference.id)}
										aria-label={`Remove ${reference.name}`}><X size={12} /></button
									>
								</div>
							{/each}
						</div>
						{#if attachmentMessage}<span class="attachment-message">{attachmentMessage}</span>{/if}
					</div>
				{/if}
				<form
					class="composer"
					onsubmit={(event) => {
						event.preventDefault();
						submitComposer();
					}}
				>
					<input
						class="attachment-input"
						bind:this={attachmentInput}
						type="file"
						accept="image/png,image/jpeg,image/webp"
						multiple
						onchange={attachFiles}
					/>
					<button
						class="attach-button"
						type="button"
						onclick={() => attachmentInput?.click()}
						aria-label="Attach reference images"
						title="Attach reference images"><Plus size={17} /></button
					>
					<input
						bind:value={composerText}
						placeholder={step === 'concepts'
							? 'Refine the direction, ask for another angle…'
							: 'Describe an infographic topic…'}
						aria-label="Message"
					/>
					<button class="send" type="submit" aria-label="Send message"
						><ArrowRight size={15} /></button
					>
				</form>
				<p>
					<Sparkles size={9} /> AI can make mistakes. Verify important facts before publishing.
				</p>
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
				aria-label="Close generation wall"><X size={17} /></button
			>
			<GenerationWall
				generations={project.generations}
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
					><X size={18} /></button
				>
			</header>
			<div class="prompt-inspector-body">
				<div class="prompt-meta">
					<span><FileText size={13} /> Full, unabridged prompt</span><span
						>{openPrompt.prompt.length.toLocaleString()} characters</span
					>
				</div>
				<p>{openPrompt.prompt}</p>
			</div>
			<footer>
				<button class="copy-full" type="button" onclick={copyOpenPrompt}
					><Copy size={14} /> {promptCopied ? 'Copied' : 'Copy full prompt'}</button
				>
				<button
					class="use-direction"
					type="button"
					onclick={() => {
						selectConcept(openPrompt!);
						openPrompt = null;
					}}>Use this direction <ArrowRight size={14} /></button
				>
			</footer>
		</div>
	</div>
{/if}

{#if openGeneration?.imageUrl}
	<div class="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer">
		<header class="lightbox-toolbar">
			<div class="lightbox-title">
				<strong>{openGeneration.conceptTitle}</strong>
				<span>Variation {openGeneration.variation} of {openGeneration.totalVariations}</span>
			</div>
			<div class="lightbox-actions">
				<div class="zoom-controls" aria-label="Zoom controls">
					<button
						type="button"
						onclick={() => setLightboxZoom(lightboxZoom - 0.25)}
						disabled={lightboxZoom <= 0.5}
						aria-label="Zoom out"><ZoomOut size={17} /></button
					>
					<button type="button" class="zoom-value" onclick={() => setLightboxZoom(1)}
						>{Math.round(lightboxZoom * 100)}%</button
					>
					<button
						type="button"
						onclick={() => setLightboxZoom(lightboxZoom + 0.25)}
						disabled={lightboxZoom >= 5}
						aria-label="Zoom in"><ZoomIn size={17} /></button
					>
				</div>
				<div class="lightbox-commands" aria-label="Image actions">
					<button type="button" onclick={copyLightboxPrompt}
						><Copy size={15} /> {lightboxCopied ? 'Copied' : 'Copy prompt'}</button
					>
					<button
						type="button"
						onclick={() => {
							regenerateGeneration(openGeneration!);
							closeGenerationViewer();
						}}><RotateCcw size={15} /> Regenerate</button
					>
					<button type="button" onclick={() => referenceGeneration(openGeneration!)}
						><ImagePlus size={15} /> Reference</button
					>
					<button type="button" onclick={downloadOpenGeneration}
						><ArrowDownToLine size={15} /> Download</button
					>
				</div>
				<button
					class="lightbox-close"
					type="button"
					onclick={closeGenerationViewer}
					aria-label="Close image"><X size={20} /></button
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
			<div
				class="lightbox-media"
				style={lightboxBaseWidth
					? `width:${lightboxBaseWidth * lightboxZoom}px;height:${lightboxBaseHeight * lightboxZoom}px`
					: ''}
			>
				<img
					draggable="false"
					src={openGeneration.imageUrl}
					alt={`Generated infographic: ${openGeneration.conceptTitle}`}
					onload={loadLightboxImage}
					ondblclick={() => setLightboxZoom(lightboxZoom > 1 ? 1 : 2)}
				/>
			</div>
		</div>

		<div class="lightbox-hint">
			<span>Scroll to zoom</span><i></i><span>Drag to move</span><i></i><span
				>Double-click to toggle</span
			>
		</div>
	</div>
{/if}
