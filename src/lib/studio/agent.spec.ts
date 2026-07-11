import { describe, expect, it } from 'vitest';
import { planInfographics } from './agent';

describe('infographic planning', () => {
	it('creates three usable offline directions before an API key is connected', async () => {
		const result = await planInfographics(
			{
				topic: 'How urban trees cool cities',
				styleId: 'editorial',
				styleLabel: 'Editorial',
				audience: 'Everyone',
				aspect: 'landscape',
				imageWidth: 1536,
				imageHeight: 1024,
				density: 2,
				count: 3
			},
			'',
			() => undefined
		);

		expect(result.concepts).toHaveLength(3);
		expect(result.researched).toBe(false);
		expect(result.concepts.every((concept) => concept.prompt.includes('urban trees'))).toBe(true);
		expect(new Set(result.concepts.map((concept) => concept.layout)).size).toBe(3);
	});
});
