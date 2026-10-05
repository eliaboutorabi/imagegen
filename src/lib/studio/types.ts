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
export type ImageQuality = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type ImageModel = 'gpt-image-2.5-sunburst' | 'gpt-image-2.5-flare' | 'gpt-image-2';
export type StudioTheme = 'light' | 'dark';
export type GenerationStatus =
	'queued' | 'ready' | 'generating' | 'complete' | 'error' | 'needs-key';

export interface StudioSettings {
	apiKey: string;
	plannerModel: string;
	imageModel: ImageModel;
	quality: ImageQuality;
	outputFormat: ImageFormat;
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
	model?: ImageModel;
}

export interface WebSource {
	url: string;
	title: string;
}

export interface WebCitation extends WebSource {
	startIndex: number;
	endIndex: number;
}

export interface WebSearch {
	id: string;
	status: 'searching' | 'complete' | 'failed';
	queries: string[];
	sources: WebSource[];
}

export interface ResearchTrace {
	searches: WebSearch[];
	citations: WebCitation[];
}

export interface StudioMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	createdAt: number;
	conceptIds?: string[];
	generationIds?: string[];
	referenceIds?: string[];
	research?: ResearchTrace;
}

export interface StudioProject {
	id: string;
	topic: string;
	styleId: StyleId | null;
	styleIds: StyleId[];
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
	messages?: StudioMessage[];
	agentHistory?: StoredMessage[];
	activePanel?: 'style' | 'brief' | null;
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
	| { type: 'direction-ready'; index: number; concept: InfographicConcept; model: string }
	| { type: 'direction-error'; index: number; message: string };

export interface PlanInput {
	topic: string;
	styleIds: StyleId[];
	styleLabels: string[];
	customDirection?: string;
	audience: Audience;
	aspect: Aspect;
	imageWidth: number;
	imageHeight: number;
	density: number;
	count: number;
	plannerModel?: string;
	researchContext?: string;
}

export interface PlanResult {
	intro: string;
	concepts: InfographicConcept[];
	researched: boolean;
	researchNote?: string;
	modelUsed: string | null;
	warnings?: string[];
}
import type { StoredMessage } from '@langchain/core/messages';
