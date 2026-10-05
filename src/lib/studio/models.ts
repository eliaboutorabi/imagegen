import type { ImageModel, ImageQuality } from './types';

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
