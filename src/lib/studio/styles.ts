import type { Aspect, StyleId } from './types';

export interface StyleOption {
	id: StyleId;
	name: string;
	description: string;
	colors: string[];
}

export const STYLE_OPTIONS: StyleOption[] = [
	{
		id: 'editorial',
		name: 'Editorial narrative',
		description: 'A clear story with strong hierarchy',
		colors: ['#f0f0e8', '#ff5b3d', '#161616']
	},
	{
		id: 'swiss',
		name: 'Data-led analysis',
		description: 'Charts, comparisons, and evidence',
		colors: ['#f4f2ed', '#2855ff', '#161616']
	},
	{
		id: 'soft-tech',
		name: 'Systems diagram',
		description: 'Relationships, flows, and architecture',
		colors: ['#d9f7ef', '#7159ff', '#ffca5c']
	},
	{
		id: 'data-noir',
		name: 'Executive brief',
		description: 'Decisive, compact, presentation-ready',
		colors: ['#0e1015', '#c9ff5c', '#7766ff']
	},
	{
		id: 'playful',
		name: 'Illustrated explainer',
		description: 'Approachable metaphors and visual teaching',
		colors: ['#fff1d6', '#ff6d8a', '#3d71ff']
	},
	{
		id: 'botanical',
		name: 'Let the agent decide',
		description: 'Topic-specific art direction from the model',
		colors: ['#eef0dd', '#3e6b4f', '#d4865a']
	}
];

export const ASPECT_SIZES: Record<Aspect, string> = {
	landscape: '1536x1024',
	portrait: '1024x1536',
	square: '1024x1024'
};

export function getStyle(id: StyleId | null) {
	return STYLE_OPTIONS.find((style) => style.id === id) ?? STYLE_OPTIONS[0];
}
