export type StyleId =
	| 'editorial'
	| 'swiss'
	| 'soft-tech'
	| 'data-noir'
	| 'playful'
	| 'botanical'
	| 'brutalist'
	| 'isometric'
	| 'retro-future'
	| 'paper-cutout'
	| 'scientific-atlas'
	| 'cartographic'
	| 'monochrome'
	| 'gradient-mesh'
	| 'archival'
	| 'whiteboard';

export type Audience = 'Everyone' | 'Executives' | 'Students' | 'Experts';
export type Aspect = 'landscape' | 'portrait' | 'square';
export type ImageQuality = 'low' | 'medium' | 'high';
export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type StudioTheme = 'light' | 'dark';
export type GenerationStatus =
	'queued' | 'ready' | 'generating' | 'complete' | 'error' | 'needs-key';

export interface StudioSettings {
	apiKey: string;
	plannerModel: string;
	imageModel: string;
	quality: ImageQuality;
	defaultBatchSize: number;
	autoGenerate: boolean;
	generationWallWidth: number;
	theme: StudioTheme;
}

export interface ReferenceAsset {
	id: string;
	name: string;
	mimeType: string;
	dataUrl: string;
	width: number;
	height: number;
	createdAt: number;
	source: 'upload' | 'generation';
	sourceGenerationId?: string;
	sourcePrompt?: string;
}

export interface InfographicConcept {
	id: string;
	title: string;
	strapline: string;
	prompt: string;
	rationale: string;
	layout: string;
	palette: string[];
}

export interface Generation {
	id: string;
	conceptId: string;
	conceptTitle: string;
	prompt: string;
	status: GenerationStatus;
	createdAt: number;
	imageUrl?: string;
	error?: string;
	variation: number;
	totalVariations: number;
	aspect?: Aspect;
	width?: number;
	height?: number;
	referenceIds?: string[];
	quality?: ImageQuality;
	outputFormat?: ImageFormat;
}

export interface StudioProject {
	id: string;
	topic: string;
	styleId: StyleId | null;
	customDirection: string;
	audience: Audience;
	aspect: Aspect;
	imageWidth: number;
	imageHeight: number;
	density: number;
	concepts: InfographicConcept[];
	notes: string[];
	selectedConceptId: string | null;
	plannerModelUsed?: string;
	generations: Generation[];
	referenceAssets: ReferenceAsset[];
	activeReferenceIds: string[];
	createdAt: number;
	updatedAt: number;
}

export type AgentEvent =
	| { type: 'thinking'; label: string }
	| { type: 'research-start'; query: string }
	| { type: 'research-complete'; query: string }
	| { type: 'planning'; label: string }
	| { type: 'drafting'; delta: string; model: string }
	| { type: 'direction-start'; index: number; label: string; model: string }
	| {
			type: 'direction-progress';
			index: number;
			partial: Partial<InfographicConcept>;
			model: string;
	  }
	| { type: 'direction-ready'; index: number; concept: InfographicConcept; model: string };

export interface PlanInput {
	topic: string;
	styleId: StyleId;
	styleLabel: string;
	audience: Audience;
	aspect: Aspect;
	imageWidth: number;
	imageHeight: number;
	density: number;
	count: number;
	plannerModel?: string;
}

export interface PlanResult {
	intro: string;
	concepts: InfographicConcept[];
	researched: boolean;
	researchNote?: string;
	modelUsed: string | null;
}
