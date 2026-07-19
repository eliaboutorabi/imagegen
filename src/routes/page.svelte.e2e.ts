import { expect, test } from '@playwright/test';

test('streams live directions and progressive image frames through the browser workspace', async ({
	page
}) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'modyfi-studio-settings-v1',
			JSON.stringify({
				apiKey: 'local-test-credential',
				plannerModel: 'gpt-5.6-luna',
				imageModel: 'gpt-image-2',
				quality: 'medium',
				defaultBatchSize: 4,
				autoGenerate: true,
				generationWallWidth: 420,
				theme: 'light'
			})
		);
		const nativeFetch = window.fetch.bind(window);
		const encoder = new TextEncoder();
		const image =
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
		const plan = JSON.stringify({
			intro: 'Three live directions for a clearer story.',
			researched: false,
			researchNote: '',
			concepts: Array.from({ length: 3 }, (_, index) => ({
				title: `Signal direction ${index + 1}`,
				strapline: `A focused hook for direction ${index + 1}.`,
				prompt: `Create a polished infographic for direction ${index + 1}.`,
				rationale: `This structure makes direction ${index + 1} easy to scan.`,
				layout: `Distinct layout ${index + 1}`,
				palette: ['#111111', '#f4f1e8', '#ff5a3d']
			}))
		});

		window.fetch = async (input, init) => {
			const url = String(input);
			if (url.includes('/v1/responses')) {
				return new Response(
					new ReadableStream({
						start(controller) {
							setTimeout(() => {
								controller.enqueue(
									encoder.encode(
										`event: response.output_text.delta\ndata: ${JSON.stringify({ type: 'response.output_text.delta', delta: plan })}\n\n`
									)
								);
							}, 250);
							setTimeout(() => {
								controller.enqueue(
									encoder.encode(
										'event: response.completed\ndata: {"type":"response.completed","response":{}}\n\n'
									)
								);
								controller.close();
							}, 1100);
						}
					}),
					{ headers: { 'content-type': 'text/event-stream' } }
				);
			}
			if (url.includes('/v1/images/')) {
				return new Response(
					new ReadableStream({
						start(controller) {
							setTimeout(() => {
								controller.enqueue(
									encoder.encode(
										`event: image_generation.partial_image\ndata: ${JSON.stringify({ type: 'image_generation.partial_image', b64_json: image, partial_image_index: 0 })}\n\n`
									)
								);
							}, 250);
							setTimeout(() => {
								controller.enqueue(
									encoder.encode(
										`event: image_generation.completed\ndata: ${JSON.stringify({ type: 'image_generation.completed', b64_json: image })}\n\n`
									)
								);
								controller.close();
							}, 1000);
						}
					}),
					{ headers: { 'content-type': 'text/event-stream' } }
				);
			}
			return nativeFetch(input, init);
		};
	});

	await page.goto('/');
	await expect(
		page.getByRole('heading', { name: 'What should we make clear and beautiful?' })
	).toBeVisible();
	await page.getByRole('textbox', { name: 'Message' }).fill('Explain how urban trees cool cities.');
	await page.getByRole('button', { name: 'Send message' }).click();
	await page.getByRole('button', { name: /Editorial narrative/ }).click();
	await page.getByRole('button', { name: 'Generate three directions' }).click();

	await expect(page.getByText('Live direction studio', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Signal direction 1' })).toBeVisible();
	await expect(page.getByText('Rendering preview · pass 1', { exact: true })).toHaveCount(3);
	await expect(page.locator('img[alt^="Generated infographic:"]')).toHaveCount(3);
});
