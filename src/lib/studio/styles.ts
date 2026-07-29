import type { Aspect, StyleId } from './types';

export interface StyleOption {
	id: StyleId;
	name: string;
	description: string;
	strategy: string;
	bestFor: string;
	image: string;
	colors: string[];
}

export const STYLE_OPTIONS: StyleOption[] = [
	{
		id: 'editorial',
		name: 'Editorial narrative',
		description: 'A clear story with strong hierarchy',
		strategy: 'Narrative',
		bestFor: 'Reports · thought leadership',
		image: '/style-previews/editorial-narrative.jpg',
		colors: ['#f0f0e8', '#ff5b3d', '#161616']
	},
	{
		id: 'swiss',
		name: 'Data-led analysis',
		description: 'Charts, comparisons, and evidence',
		strategy: 'Evidence',
		bestFor: 'Metrics · comparisons',
		image: '/style-previews/swiss-data.jpg',
		colors: ['#f4f2ed', '#2855ff', '#161616']
	},
	{
		id: 'soft-tech',
		name: 'Systems diagram',
		description: 'Relationships, flows, and architecture',
		strategy: 'Structure',
		bestFor: 'Processes · ecosystems',
		image: '/style-previews/systems-map.jpg',
		colors: ['#d9f7ef', '#7159ff', '#ffca5c']
	},
	{
		id: 'data-noir',
		name: 'Executive brief',
		description: 'Decisive, compact, presentation-ready',
		strategy: 'Decision',
		bestFor: 'Leadership · briefings',
		image: '/style-previews/executive-noir.jpg',
		colors: ['#0e1015', '#c9ff5c', '#7766ff']
	},
	{
		id: 'playful',
		name: 'Illustrated explainer',
		description: 'Approachable metaphors and visual teaching',
		strategy: 'Teaching',
		bestFor: 'Guides · education',
		image: '/style-previews/illustrated-explainer.jpg',
		colors: ['#fff1d6', '#ff6d8a', '#3d71ff']
	},
	{
		id: 'botanical',
		name: 'Organic editorial',
		description: 'Natural textures with a calm human rhythm',
		strategy: 'Organic',
		bestFor: 'Sustainability · wellbeing',
		image: '/style-previews/organic-editorial.jpg',
		colors: ['#eef0dd', '#3e6b4f', '#d4865a']
	},
	{
		id: 'brutalist',
		name: 'Neo-brutalist',
		description: 'Raw typography and unapologetic contrast',
		strategy: 'Impact',
		bestFor: 'Manifestos · bold campaigns',
		image: '/style-previews/neo-brutalist.jpg',
		colors: ['#f3efe5', '#ffd900', '#f04424']
	},
	{
		id: 'isometric',
		name: 'Isometric 3D',
		description: 'Dimensional scenes that explain a process',
		strategy: 'Spatial',
		bestFor: 'Journeys · operations',
		image: '/style-previews/isometric-3d.jpg',
		colors: ['#eceaff', '#18bde3', '#7754d9']
	},
	{
		id: 'retro-future',
		name: 'Retro future',
		description: 'Space-age systems with editorial nostalgia',
		strategy: 'Signal',
		bestFor: 'Technology · futures',
		image: '/style-previews/retro-future.jpg',
		colors: ['#061a2c', '#f77a1a', '#2db6d9']
	},
	{
		id: 'paper-cutout',
		name: 'Paper cutout',
		description: 'Tactile layers for a friendly visual journey',
		strategy: 'Journey',
		bestFor: 'Roadmaps · storytelling',
		image: '/style-previews/paper-cutout.jpg',
		colors: ['#fff2d7', '#f45f4d', '#114b9d']
	},
	{
		id: 'scientific-atlas',
		name: 'Scientific atlas',
		description: 'Precise specimens, labels, and evidence',
		strategy: 'Reference',
		bestFor: 'Science · field guides',
		image: '/style-previews/scientific-atlas.jpg',
		colors: ['#f4efdf', '#305a3b', '#365b8a']
	},
	{
		id: 'cartographic',
		name: 'Cartographic',
		description: 'Places, routes, and geographic context',
		strategy: 'Geography',
		bestFor: 'Travel · spatial stories',
		image: '/style-previews/cartographic.jpg',
		colors: ['#064b57', '#e8c58d', '#e5652f']
	},
	{
		id: 'monochrome',
		name: 'Pure monochrome',
		description: 'Maximum clarity with almost no decoration',
		strategy: 'Essential',
		bestFor: 'Premium reports · print',
		image: '/style-previews/monochrome.jpg',
		colors: ['#ffffff', '#111111', '#b8b8b8']
	},
	{
		id: 'gradient-mesh',
		name: 'Luminous mesh',
		description: 'Glass-like data layers and spectral color',
		strategy: 'Atmosphere',
		bestFor: 'AI · digital products',
		image: '/style-previews/gradient-mesh.jpg',
		colors: ['#315ee8', '#d465d8', '#ffac82']
	},
	{
		id: 'archival',
		name: 'Archival collage',
		description: 'Layered evidence with documentary texture',
		strategy: 'Research',
		bestFor: 'History · cultural analysis',
		image: '/style-previews/archival-collage.jpg',
		colors: ['#e5d5b7', '#1e1d19', '#a53c2e']
	},
	{
		id: 'whiteboard',
		name: 'Handwritten paper',
		description: 'Expert notes, ink diagrams, and margin thinking',
		strategy: 'Notebook',
		bestFor: 'Frameworks · personal explainers',
		image: '/style-previews/handwritten-paper.jpg',
		colors: ['#f5ecd9', '#162a58', '#e86f5d']
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
