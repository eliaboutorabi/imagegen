import type { ImageModel, ImageQuality } from './types';

export const DEFAULT_TEXT_MODEL = 'gpt-6.1-sol';
export const DEFAULT_IMAGE_MODEL: ImageModel = 'gpt-image-2.5-flare';

export const TEXT_MODELS = [
	{
		id: 'gpt-6.1-sol',
		name: 'GPT 6.1 Sol',
		shortName: '6.1 Sol',
		description: 'A thoughtful partner for everyday creative work'
	},
	{
		id: 'gpt-6-astra',
		name: 'GPT 6 Astra',
		shortName: '6 Astra',
		description: 'For your most demanding briefs'
	},
	{
		id: 'gpt-6-luna',
		name: 'GPT 6 Luna',
		shortName: '6 Luna',
		description: 'Quick conversations and iterations'
	}
];

export function textModelName(model: string) {
	return TEXT_MODELS.find((option) => option.id === model)?.name ?? model;
}

export const IMAGE_MODELS: Array<{
	id: ImageModel;
	name: string;
	description: string;
}> = [
	{
		id: 'gpt-image-2.5-sunburst',
		name: 'GPT Image 2.5 Sunburst',
		description: 'Highest quality and editing precision'
	},
	{
		id: 'gpt-image-2.5-flare',
		name: 'GPT Image 2.5 Flare',
		description: 'Faster, high-quality everyday generation'
	},
	{
		id: 'gpt-image-2',
		name: 'GPT Image 2',
		description: 'Previous generation'
	}
];

export const IMAGE_25_QUALITIES: ImageQuality[] = ['low', 'medium', 'high', 'xhigh', 'max'];
export const IMAGE_2_QUALITIES: ImageQuality[] = ['low', 'medium', 'high'];

export function isImageModel(value: unknown): value is ImageModel {
	return IMAGE_MODELS.some((model) => model.id === value);
}

export function imageQualities(model: ImageModel) {
	return model.startsWith('gpt-image-2.5') ? IMAGE_25_QUALITIES : IMAGE_2_QUALITIES;
}

export function imageModelName(model: ImageModel) {
	return IMAGE_MODELS.find((option) => option.id === model)?.name ?? model;
}

export function imageQualityName(quality: ImageQuality) {
	if (quality === 'xhigh') return 'X-High';
	return quality[0].toUpperCase() + quality.slice(1);
}
