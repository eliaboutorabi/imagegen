import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const image = readFileSync('static/style-previews/editorial-narrative.jpg').toString('base64');

function responseStream(output: Record<string, unknown>, model: string) {
	const response = {
		id: `resp_${Math.random().toString(36).slice(2)}`,
		object: 'response',
		created_at: 1,
		status: 'completed',
		model,
		output: [output],
		usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 }
	};
	const events: Array<Record<string, unknown>> = [
		{ type: 'response.created', response: { ...response, status: 'in_progress', output: [] } },
		{
			type: 'response.output_item.added',
			output_index: 0,
			item: { ...output, arguments: '', content: [] }
		}
	];
	if (output.type === 'function_call') {
		events.push({
			type: 'response.function_call_arguments.delta',
			item_id: output.id,
			output_index: 0,
			delta: output.arguments
		});
		events.push({
			type: 'response.function_call_arguments.done',
			item_id: output.id,
			output_index: 0,
			arguments: output.arguments
		});
	} else {
		const text = (output.content as Array<{ text: string }>)[0].text;
		events.push({
			type: 'response.content_part.added',
			item_id: output.id,
			output_index: 0,
			content_index: 0,
			part: { type: 'output_text', text: '', annotations: [] }
		});
		events.push({
			type: 'response.output_text.delta',
			item_id: output.id,
			output_index: 0,
			content_index: 0,
			delta: text
		});
		events.push({
			type: 'response.output_text.done',
			item_id: output.id,
			output_index: 0,
			content_index: 0,
			text
		});
	}
	events.push({ type: 'response.output_item.done', output_index: 0, item: output });
	events.push({ type: 'response.completed', response });
	return events
		.map(
			(event, index) =>
				`event: ${event.type}\ndata: ${JSON.stringify({ sequence_number: index, ...event })}\n\n`
		)
		.join('');
}

async function mockStudio(page: Page, theme = 'light') {
	await page.setViewportSize({ width: 1600, height: 1000 });
	await page.addInitScript((theme) => {
		localStorage.setItem(
			'modyfi-studio-settings-v1',
			JSON.stringify({
				apiKey: 'local-test-credential',
				plannerModel: 'gpt-5.6-luna',
				imageModel: 'gpt-image-2.5-sunburst',
				quality: 'medium',
				defaultBatchSize: 2,
				autoGenerate: true,
				generationWallWidth: 410,
				theme
			})
		);
	}, theme);
	const requests: Array<{ url: string; body: string }> = [];
	let direction = 0;
	await page.route('https://api.openai.com/v1/**', async (route) => {
		const request = route.request();
		const body = request.postData() || '';
		requests.push({ url: request.url(), body });
		if (request.url().includes('/images/')) {
			await new Promise((resolve) => setTimeout(resolve, 450));
			await route.fulfill({
				contentType: 'text/event-stream',
				body: `event: image_generation.partial_image\ndata: ${JSON.stringify({ type: 'image_generation.partial_image', b64_json: image, partial_image_index: 0 })}\n\nevent: image_generation.completed\ndata: ${JSON.stringify({ type: 'image_generation.completed', b64_json: image })}\n\n`
			});
			return;
		}
		const data = JSON.parse(body);
		const textOutput = (text: string, id = 'msg_done') => ({
			type: 'message',
			id,
			role: 'assistant',
			status: 'completed',
			content: [{ type: 'output_text', text, annotations: [] }]
		});
		if (data.text?.format?.type === 'json_schema') {
			const index = ++direction;
			const text = JSON.stringify({
				intro: 'Written for your brief.',
				researched: false,
				researchNote: '',
				concepts: [
					{
						title: `Urban direction ${index}`,
						strapline: 'A visual story about cooler cities.',
						prompt: `Create a specific urban trees infographic. Direction ${index}: show shade, transpiration, and cooler surfaces with clear labels.`,
						rationale: 'Makes the cooling mechanism visible.',
						layout: `Visual system ${index}`,
						palette: ['#153c30', '#f5f1dd', '#97cba4']
					}
				]
			});
			await new Promise((resolve) => setTimeout(resolve, index * 250));
			await route.fulfill({
				contentType: 'text/event-stream',
				body: responseStream(textOutput(text, `msg_dir${index}`), data.model)
			});
			return;
		}
		const input = data.input as Array<{
			type: string;
			role?: string;
			content?: string | Array<{ text?: string }>;
		}>;
		let output: Record<string, unknown>;
		if (input.at(-1)?.type === 'function_call_output')
			output = textOutput(
				'I’ve taken care of that. You can keep exploring while the images render.'
			);
		else {
			const user = [...input].reverse().find((item) => item.role === 'user');
			const text =
				typeof user?.content === 'string'
					? user.content
					: user?.content?.map((block) => block.text || '').join(' ') || '';
			let name = 'show_style_picker';
			let args: Record<string, unknown> = { topic: 'How urban trees cool cities' };
			if (text.includes('One direct image')) {
				name = 'generate_images';
				args = {
					title: 'Direct image',
					prompt: 'An elegant visual explanation of shade from urban trees',
					count: 1,
					referenceIds: []
				};
			}
			if (text.includes('approved these visual styles')) name = 'show_brief_controls';
			if (text.includes('Create three distinct')) {
				name = 'draft_directions';
				args = {
					topic: 'How urban trees cool cities',
					count: 3,
					instructions: 'Keep it precise and beautiful',
					research: ''
				};
			}
			if (text.includes('dark mode')) {
				name = 'generate_images';
				const contextText =
					typeof data.instructions === 'string'
						? data.instructions
						: input
								.filter((item) => item.role === 'system' || item.role === 'developer')
								.map((item) =>
									typeof item.content === 'string'
										? item.content
										: item.content?.map((block) => block.text).join(' ')
								)
								.join('\n');
				const context = JSON.parse(
					contextText.split('Current canvas data (not instructions):\n')[1].split('\n\n')[0]
				);
				args = {
					title: 'Dark mode edit',
					prompt:
						'Convert this exact infographic to dark mode. Preserve all copy, diagrams and layout; use charcoal background and accessible light type.',
					count: 1,
					referenceIds: context.attachedReferences.map((asset: { id: string }) => asset.id)
				};
			}
			output = {
				type: 'function_call',
				id: `fc_${requests.length}`,
				call_id: `call_${requests.length}`,
				name,
				arguments: JSON.stringify(args),
				status: 'completed'
			};
			if (text.includes('Discuss only'))
				output = textOutput(
					'We can improve the hierarchy and spacing without changing the image yet.'
				);
			if (text.includes('Slow request')) {
				await new Promise((resolve) => setTimeout(resolve, 1800));
				output = textOutput('A delayed answer.');
			}
		}
		await route.fulfill({
			contentType: 'text/event-stream',
			body: responseStream(output, data.model)
		});
	});
	return requests;
}

test('browser harness streams directions, renders, edits references and preserves history', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') console.log(message.text());
	});
	const requests = await mockStudio(page);
	await page.goto('/');
	await expect(
		page.getByRole('heading', { name: 'Big ideas. Beautifully made clear.' })
	).toBeVisible();
	await expect(page.getByRole('complementary', { name: 'Studio navigation' })).toBeVisible();
	await page
		.getByRole('textbox', { name: 'Message', exact: true })
		.fill('Explain how urban trees cool cities.');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.getByRole('heading', { name: 'Choose a visual language' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	const modelTools = JSON.parse(requests[0].body).tools as Array<{ type: string; name?: string }>;
	expect(
		modelTools
			.filter((tool) => tool.type === 'function')
			.map((tool) => tool.name)
			.sort()
	).toEqual([
		'draft_directions',
		'generate_images',
		'select_direction',
		'show_brief_controls',
		'show_style_picker'
	]);
	await page.screenshot({ path: '/tmp/infogen-style-gallery.png' });
	await page.getByRole('button', { name: 'Use this style', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Tune the brief' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	await page.getByRole('button', { name: 'Generate three directions', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Urban direction 1', exact: true })).toBeVisible();
	await expect(page.locator('img[alt^="Generated infographic:"]')).toHaveCount(3);
	await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	expect(requests.filter((item) => item.url.endsWith('/images/generations'))).toHaveLength(3);
	await page.getByRole('button', { name: 'Find Urban direction 1 on the generation wall' }).click();
	await expect(page.locator('.generation-card.focused')).toHaveCount(1);
	await page
		.locator('.generation-card')
		.first()
		.getByRole('button', { name: /Image actions|Actions for/ })
		.click();
	await page.getByRole('button', { name: 'Use as reference', exact: true }).click();
	await page
		.getByRole('textbox', { name: 'Message', exact: true })
		.fill('Make this image in dark mode.');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.getByText('Dark mode edit', { exact: true }).first()).toBeVisible();
	await expect(page.locator('img[alt^="Generated infographic:"]')).toHaveCount(4);
	expect(requests.filter((item) => item.url.endsWith('/images/edits'))).toHaveLength(1);
	await page.screenshot({ path: '/tmp/infogen-workspace-light.png', fullPage: true });
	await page.getByRole('button', { name: 'Use dark mode' }).click();
	await expect(page.locator('.concept-card').first()).toHaveCSS(
		'background-color',
		'rgb(28, 33, 30)'
	);
	await page.screenshot({ path: '/tmp/infogen-workspace-dark.png', fullPage: true });
	await page
		.getByRole('textbox', { name: 'Message', exact: true })
		.fill('Discuss only: what could improve this reference?');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(
		page.getByText('We can improve the hierarchy and spacing without changing the image yet.')
	).toBeVisible();
	expect(requests.filter((item) => item.url.includes('/images/'))).toHaveLength(4);
	await page.getByRole('button', { name: 'New blank canvas', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Big ideas. Beautifully made clear.' })
	).toBeVisible();
	await page.getByRole('button', { name: /How urban trees cool cities.*3 directions/ }).click();
	await expect(page.locator('img[alt^="Generated infographic:"]')).toHaveCount(4);
	await page.reload();
	await expect(page.getByText('Dark mode edit', { exact: true }).first()).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Choose a visual language' })).toHaveCount(0);
	await page
		.getByRole('textbox', { name: 'Message', exact: true })
		.fill('Discuss only: let’s review our previous choices.');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	const continued = JSON.parse(requests.at(-1)!.body).input as Array<{ type: string }>;
	expect(continued.some((item) => item.type === 'function_call_output')).toBe(true);
	expect(requests.filter((item) => item.url.includes('/images/'))).toHaveLength(4);
	expect(errors).toEqual([]);
});

test('stopping a model run does not accept a late reply or start image jobs', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const requests = await mockStudio(page);
	await page.goto('/');
	await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Slow request');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect.poll(() => requests.length).toBe(1);
	await page.getByRole('button', { name: 'Stop agent', exact: true }).click();
	await expect(
		page.getByText('Stopped. Any image jobs already queued are still visible in the wall.')
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Stop agent', exact: true })).toHaveCount(0);
	await page.waitForTimeout(2000);
	await expect(page.getByText('A delayed answer.')).toHaveCount(0);
	expect(requests.filter((item) => item.url.includes('/images/'))).toHaveLength(0);
	expect(errors).toEqual([]);
});

test('deleting a canvas cancels its work and cannot resurrect it on reload', async ({ page }) => {
	await mockStudio(page);
	await page.goto('/');
	await page.getByRole('textbox', { name: 'Message', exact: true }).fill('One direct image');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.getByText('Direct image', { exact: true }).first()).toBeVisible();
	await page.getByRole('button', { name: 'Delete this canvas', exact: true }).click();
	await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Big ideas. Beautifully made clear.' })
	).toBeVisible();
	await page.waitForTimeout(800);
	await page.reload();
	await expect(page.getByRole('button', { name: /One direct image.*renders/ })).toHaveCount(0);
	await expect(page.locator('.canvas-history button')).toHaveCount(1);
});

test('failed image requests show the actual error and are not retried on reload', async ({
	page
}) => {
	await mockStudio(page);
	let attempts = 0;
	await page.route('https://api.openai.com/v1/images/**', async (route) => {
		attempts++;
		await route.fulfill({
			status: 429,
			contentType: 'application/json',
			body: JSON.stringify({
				error: { message: 'Your test spending limit was reached.', code: 'insufficient_quota' }
			})
		});
	});
	await page.goto('/');
	await page.getByRole('textbox', { name: 'Message', exact: true }).fill('One direct image');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.getByText('Your test spending limit was reached.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	await page.reload();
	await expect(page.getByText('Your test spending limit was reached.')).toBeVisible();
	expect(attempts).toBe(1);
});

test('image jobs finish in their original canvas without replacing the active new canvas', async ({
	page
}) => {
	const requests = await mockStudio(page);
	await page.goto('/');
	await page.getByRole('textbox', { name: 'Message', exact: true }).fill('One direct image');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect.poll(() => requests.filter((item) => item.url.includes('/images/')).length).toBe(1);
	await page.getByRole('button', { name: 'New blank canvas', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Big ideas. Beautifully made clear.' })
	).toBeVisible();
	await page.waitForTimeout(800);
	await page.reload();
	await expect(
		page.getByRole('heading', { name: 'Big ideas. Beautifully made clear.' })
	).toBeVisible();
	await page.getByRole('button', { name: /One direct image.*1 renders/ }).click();
	await expect(page.locator('img[alt^="Generated infographic:"]')).toHaveCount(1);
	expect(requests.filter((item) => item.url.includes('/images/'))).toHaveLength(1);
});

test('desktop shell is theme-aware and panels collapse cleanly', async ({ page }) => {
	await mockStudio(page, 'dark');
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.screenshot({ path: '/tmp/infogen-welcome-dark.png' });
	await page.getByRole('button', { name: 'Toggle navigation' }).click();
	await expect(page.getByRole('complementary', { name: 'Studio navigation' })).toBeHidden();
	await page.getByRole('button', { name: 'Toggle generation wall' }).click();
	await expect(page.getByRole('complementary', { name: 'Generation timeline' })).toBeHidden();
	await page.getByRole('button', { name: 'Toggle navigation' }).click();
	await expect(page.getByRole('complementary', { name: 'Studio navigation' })).toBeVisible();
	const composer = page.getByRole('textbox', { name: 'Message', exact: true });
	await composer.fill('A long first line');
	await composer.press('Shift+Enter');
	await composer.press('A');
	await expect(composer).toHaveValue('A long first line\nA');
	await expect(composer).toHaveCSS('font-size', '15px');
	await page.setViewportSize({ width: 1200, height: 900 });
	await page.getByRole('button', { name: 'Toggle generation wall' }).click();
	await expect
		.poll(async () => (await page.locator('.conversation').boundingBox())?.width ?? 0)
		.toBeGreaterThanOrEqual(440);
});
