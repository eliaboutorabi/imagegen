import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const image = readFileSync('static/style-previews/editorial-narrative.jpg').toString('base64');

function researchStream(model: string, draft = false) {
	const text = 'Trees can reduce urban heat through shade and transpiration. [1]';
	const url = 'https://www.epa.gov/heatislands/using-trees-and-vegetation-reduce-heat-islands';
	const search = {
		id: 'ws_test',
		type: 'web_search_call',
		status: 'completed',
		action: {
			type: 'search',
			queries: ['urban trees cooling evidence'],
			sources: [
				{ type: 'url', url },
				{ type: 'url', url: 'https://www.epa.gov/heatislands/heat-island-impacts' }
			]
		}
	};
	const message = {
		id: 'msg_research',
		type: 'message',
		role: 'assistant',
		status: 'completed',
		content: [
			{
				type: 'output_text',
				text,
				annotations: [
					{
						type: 'url_citation',
						start_index: text.indexOf('[1]'),
						end_index: text.length,
						title: 'EPA: Trees and vegetation',
						url
					}
				]
			}
		]
	};
	const response = {
		id: 'resp_research',
		object: 'response',
		created_at: 1,
		model,
		status: 'completed',
		output: [search, message] as unknown[],
		usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20 }
	};
	const events: Record<string, unknown>[] = [
		{ type: 'response.created', response: { ...response, status: 'in_progress', output: [] } },
		{
			type: 'response.output_item.added',
			output_index: 0,
			item: { ...search, status: 'in_progress', action: undefined }
		},
		{ type: 'response.web_search_call.in_progress', output_index: 0, item_id: search.id },
		{ type: 'response.web_search_call.searching', output_index: 0, item_id: search.id },
		{ type: 'response.web_search_call.completed', output_index: 0, item_id: search.id },
		{ type: 'response.output_item.done', output_index: 0, item: search },
		{ type: 'response.output_item.added', output_index: 1, item: { ...message, content: [] } },
		{
			type: 'response.output_text.delta',
			output_index: 1,
			content_index: 0,
			item_id: message.id,
			delta: text
		},
		{
			type: 'response.output_text.annotation.added',
			output_index: 1,
			content_index: 0,
			item_id: message.id,
			annotation_index: 0,
			annotation: message.content[0].annotations[0]
		},
		{
			type: 'response.output_text.done',
			output_index: 1,
			content_index: 0,
			item_id: message.id,
			text
		},
		{ type: 'response.output_item.done', output_index: 1, item: message }
	];
	if (draft) {
		const call = {
			type: 'function_call',
			id: 'fc_researched',
			call_id: 'call_researched',
			status: 'completed',
			name: 'draft_directions',
			arguments: JSON.stringify({
				topic: 'How urban trees cool cities',
				count: 3,
				instructions: 'Use the researched evidence',
				research: `Trees reduce heat through shade and transpiration. Source: ${url}`
			})
		};
		response.output.push(call);
		events.push(
			{ type: 'response.output_item.added', output_index: 2, item: { ...call, arguments: '' } },
			{
				type: 'response.function_call_arguments.delta',
				output_index: 2,
				item_id: call.id,
				delta: call.arguments
			},
			{ type: 'response.output_item.done', output_index: 2, item: call }
		);
	}
	events.push({ type: 'response.completed', response });
	return events
		.map(
			(event, index) =>
				`event: ${event.type}\ndata: ${JSON.stringify({ sequence_number: index, ...event })}\n\n`
		)
		.join('');
}

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
		if (localStorage.getItem('modyfi-studio-settings-v1')) return;
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
			if (text.includes('Search the web') || text.includes('Research before drafting')) {
				await route.fulfill({
					contentType: 'text/event-stream',
					body: researchStream(data.model, text.includes('Research before drafting'))
				});
				return;
			}
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
	expect(modelTools).toContainEqual({ type: 'web_search' });
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
		'rgb(34, 34, 37)'
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

test('hosted web search is enabled, citations are clickable and research survives reloads', async ({
	page
}) => {
	const requests = await mockStudio(page);
	await page.goto('/');
	await page
		.getByRole('textbox', { name: 'Message', exact: true })
		.fill('Search the web for evidence about urban tree cooling. Answer only.');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.getByText('Searched the web', { exact: true })).toBeVisible();
	await expect(page.getByText('urban trees cooling evidence', { exact: true })).toBeVisible();
	const citation = page.locator('.inline-citation');
	await expect(citation).toHaveText('[1]');
	await expect(citation).toHaveAttribute(
		'href',
		'https://www.epa.gov/heatislands/using-trees-and-vegetation-reduce-heat-islands'
	);
	await expect(citation).toHaveAttribute('rel', 'external noopener noreferrer');
	await page.getByText('2 sources', { exact: true }).click();
	await expect(page.getByRole('link', { name: /EPA: Trees and vegetation/ })).toBeVisible();
	await page.screenshot({ path: '/tmp/infogen-web-research.png' });
	const request = JSON.parse(requests[0].body);
	expect(request.tools).toContainEqual({ type: 'web_search' });
	expect(request.include).toContain('web_search_call.action.sources');
	expect(requests.filter((request) => request.url.includes('/images/'))).toHaveLength(0);
	await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	await page.reload();
	await expect(citation).toHaveText('[1]');
	await expect(page.getByText('Searched the web', { exact: true })).toBeVisible();
	await page
		.getByRole('textbox', { name: 'Message', exact: true })
		.fill('Discuss only: summarize what you found.');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	expect(requests.at(-1)?.body).toContain('https://www.epa.gov/heatislands');
});

test('sourced research reaches all parallel direction prompts', async ({ page }) => {
	const requests = await mockStudio(page);
	await page.goto('/');
	await page
		.getByRole('textbox', { name: 'Message', exact: true })
		.fill('Research before drafting three urban tree infographic concepts.');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.getByRole('heading', { name: 'Urban direction 3', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	const directionRequests = requests
		.filter((request) => request.url.includes('/responses'))
		.map((request) => JSON.parse(request.body))
		.filter((body) => body.text?.format?.type === 'json_schema');
	expect(directionRequests).toHaveLength(3);
	for (const request of directionRequests) {
		expect(request.input).toContain('Trees reduce heat through shade and transpiration.');
		expect(request.input).toContain(
			'https://www.epa.gov/heatislands/using-trees-and-vegetation-reduce-heat-islands'
		);
		// Research is shared by the drafts, not paid for again in each branch.
		expect(request.tools).toBeUndefined();
	}
	await expect(page.locator('.inline-citation')).toHaveCount(1);
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
	await expect(composer).toHaveCSS('font-size', '16px');
	await page.setViewportSize({ width: 1200, height: 900 });
	await page.getByRole('button', { name: 'Toggle generation wall' }).click();
	await expect
		.poll(async () => (await page.locator('.conversation').boundingBox())?.width ?? 0)
		.toBeGreaterThanOrEqual(440);
});

for (const width of [1100, 1280, 1600]) {
	test(`theme changes preserve desktop geometry at ${width}px`, async ({ page }) => {
		const requests = await mockStudio(page);
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/');
		const composer = page.getByRole('textbox', { name: 'Message', exact: true });
		await composer.fill('A draft that should stay exactly where I left it.\nWith a second line.');
		await expect(page.locator('.topbar')).toHaveCSS('height', '48px');
		const selectors = [
			'.topbar',
			'.topbar-left',
			'.project-title',
			'.topbar-actions',
			'.workspace',
			'.conversation-scroll',
			'.chat-column',
			'.composer-wrap',
			'.studio-composer',
			'.composer-toolbar',
			'.wall',
			'.wall-header'
		];
		const geometry = () =>
			page.evaluate(
				(selectors) =>
					selectors.map((selector) => {
						const element = document.querySelector(selector)!;
						const { x, y, width, height } = element.getBoundingClientRect();
						return { selector, x, y, width, height, scrollTop: element.scrollTop };
					}),
				selectors
			);
		const light = await geometry();
		await page.getByRole('button', { name: 'Use dark mode' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		expect(await geometry()).toEqual(light);
		await expect(composer).toHaveValue(
			'A draft that should stay exactly where I left it.\nWith a second line.'
		);
		await expect(page.locator('.studio-shell')).toHaveCSS('background-color', 'rgb(25, 25, 27)');
		await expect(page.locator('.wall')).toHaveCSS('background-color', 'rgb(22, 22, 24)');
		if (width === 1600) await page.screenshot({ path: '/tmp/infogen-theme-refinement-dark.png' });
		await page.getByRole('button', { name: 'Use light mode' }).click();
		expect(await geometry()).toEqual(light);
		// Verify an unconstrained composer too, with both side panels collapsed.
		if (width >= 1180) await page.getByRole('button', { name: 'Toggle navigation' }).click();
		await page.getByRole('button', { name: 'Toggle generation wall' }).click();
		const expanded = await geometry();
		await page.getByRole('button', { name: 'Use dark mode' }).click();
		expect(await geometry()).toEqual(expanded);
		expect(requests).toHaveLength(0);
	});
}

test('compact header keeps canvas options and settings accessible with a long title', async ({
	page
}) => {
	await mockStudio(page);
	await page.goto('/');
	const title =
		'Discuss only: A very long canvas title about visual storytelling and research for complex infographics';
	await page.getByRole('textbox', { name: 'Message', exact: true }).fill(title);
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	await expect(page.locator('.project-title')).toHaveText(title);
	await page.getByRole('button', { name: 'Toggle navigation' }).click();
	await page.setViewportSize({ width: 1100, height: 800 });
	await page.locator('.project-title').click();
	await expect(page.locator('.project-menu')).toBeVisible();
	const menu = await page.locator('.project-menu').boundingBox();
	expect(menu!.x).toBeGreaterThanOrEqual(0);
	expect(menu!.x + menu!.width).toBeLessThanOrEqual(1100);
	await page.locator('.project-title').click();
	await page.getByRole('button', { name: 'Settings', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Studio settings' })).toBeVisible();
	const header = page.locator('.topbar');
	expect(await header.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('switching themes preserves scrolled conversation and timeline positions', async ({
	page
}) => {
	await mockStudio(page);
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/');
	await page
		.getByRole('textbox', { name: 'Message', exact: true })
		.fill('Create three distinct directions');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.locator('img[alt^="Generated infographic:"]')).toHaveCount(3);
	await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
	const scrollers = page.locator('.conversation-scroll, .wall-scroll');
	await scrollers.evaluateAll((elements) =>
		elements.forEach((element) => {
			element.scrollTop = 120;
		})
	);
	const positions = () =>
		scrollers.evaluateAll((elements) =>
			elements.map((element) => ({
				scrollTop: element.scrollTop,
				scrollHeight: element.scrollHeight,
				clientHeight: element.clientHeight
			}))
		);
	const before = await positions();
	expect(before.every((position) => position.scrollTop > 0)).toBe(true);
	await page.getByRole('button', { name: 'Use dark mode' }).click();
	expect(await positions()).toEqual(before);
	await page.getByRole('button', { name: 'Use light mode' }).click();
	expect(await positions()).toEqual(before);
});

test('composer controls persist and apply to real generation requests', async ({ page }) => {
	const requests = await mockStudio(page);
	await page.goto('/');
	await page.getByRole('button', { name: /^Text model:/ }).click();
	await page.getByRole('button', { name: /GPT 6.1 Sol A thoughtful/ }).click();
	await expect(page.getByRole('dialog', { name: 'Choose text model' })).toBeHidden();
	await page.getByRole('button', { name: /^Image model:/ }).click();
	await page.getByRole('button', { name: /GPT Image 2.5 Flare Fast/ }).click();
	await page.getByRole('button', { name: 'Image settings', exact: true }).click();
	const settings = page.getByRole('dialog', { name: 'Image settings' });
	await settings.getByRole('button', { name: 'Wide 16:9' }).click();
	await settings.getByRole('combobox', { name: 'Image quality' }).selectOption('high');
	await settings.getByRole('combobox', { name: 'Image file type' }).selectOption('png');
	await settings.getByRole('checkbox', { name: 'Auto-render first drafts' }).uncheck();
	await page.screenshot({ path: '/tmp/infogen-composer-settings-light.png' });
	await settings.getByRole('button', { name: 'Close composer menu' }).press('Escape');
	await expect(settings).toBeHidden();
	await expect(page.getByRole('button', { name: 'Image settings', exact: true })).toBeFocused();
	await page.reload();
	await expect(page.getByRole('button', { name: 'Text model: GPT 6.1 Sol' })).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Image model: GPT Image 2.5 Flare' })
	).toBeVisible();
	await page.getByRole('button', { name: 'Image settings', exact: true }).click();
	await expect(settings.getByRole('combobox', { name: 'Image quality' })).toHaveValue('high');
	await expect(settings.getByRole('combobox', { name: 'Image file type' })).toHaveValue('png');
	await expect(
		settings.getByRole('checkbox', { name: 'Auto-render first drafts' })
	).not.toBeChecked();
	await expect(settings.getByRole('button', { name: 'Wide 16:9' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await page.getByRole('textbox', { name: 'Message', exact: true }).click();
	await expect(settings).toBeHidden();
	await page.getByRole('textbox', { name: 'Message', exact: true }).fill('One direct image');
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.locator('img[alt^="Generated infographic:"]')).toHaveCount(1);
	expect(
		JSON.parse(requests.find((request) => request.url.includes('/responses'))!.body).model
	).toBe('gpt-6.1-sol');
	expect(
		JSON.parse(requests.find((request) => request.url.includes('/images/'))!.body)
	).toMatchObject({
		model: 'gpt-image-2.5-flare',
		quality: 'high',
		output_format: 'png',
		size: '2048x1152'
	});
});

test('composer references keep their aspect ratio and controls fit a compact desktop', async ({
	page
}) => {
	await mockStudio(page, 'dark');
	await page.goto('/');
	await page
		.locator('.studio-composer input[type=file]')
		.setInputFiles('static/style-previews/editorial-narrative.jpg');
	const reference = page.locator('.composer-references img');
	await expect(reference).toBeVisible();
	await expect(reference).toHaveCSS('object-fit', 'contain');
	await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveAttribute(
		'placeholder',
		'What would you like to change in this image?'
	);
	await page.getByRole('button', { name: 'Image settings', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Wide 16:9' })).toBeDisabled();
	await page.getByRole('button', { name: 'Close composer menu' }).click();
	await page.setViewportSize({ width: 1200, height: 900 });
	await page.screenshot({ path: '/tmp/infogen-composer-compact-dark.png' });
	const toolbar = page.locator('.composer-toolbar');
	expect(await toolbar.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
		true
	);
	await page.getByRole('button', { name: 'Remove editorial-narrative.jpg' }).click();
	await expect(reference).toBeHidden();
	await page.getByRole('button', { name: /^Text model:/ }).click();
	await expect(page.getByRole('dialog', { name: 'Choose text model' })).toBeVisible();
	await page.getByRole('button', { name: /GPT 6 Luna Quick/ }).click();
	await expect(page.getByRole('button', { name: 'Text model: GPT 6 Luna' })).toBeVisible();
});

test('composer accepts pasted and dropped images and grows with the draft', async ({ page }) => {
	const requests = await mockStudio(page);
	await page.goto('/');
	const composer = page.getByRole('textbox', { name: 'Message', exact: true });
	await composer.evaluate((element, image) => {
		const bytes = Uint8Array.from(atob(image), (character) => character.charCodeAt(0));
		const transfer = new DataTransfer();
		transfer.items.add(new File([bytes], 'pasted-reference.jpg', { type: 'image/jpeg' }));
		element.dispatchEvent(
			new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true })
		);
	}, image);
	await expect(page.getByRole('img', { name: 'pasted-reference.jpg', exact: true })).toBeVisible();
	await page.locator('.studio-composer').evaluate((element, image) => {
		const bytes = Uint8Array.from(atob(image), (character) => character.charCodeAt(0));
		const transfer = new DataTransfer();
		transfer.items.add(new File([bytes], 'dropped-reference.jpg', { type: 'image/jpeg' }));
		element.dispatchEvent(
			new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true })
		);
	}, image);
	await expect(page.getByRole('img', { name: 'dropped-reference.jpg', exact: true })).toBeVisible();
	await composer.fill(Array.from({ length: 20 }, (_, index) => `Line ${index}`).join('\n'));
	await expect(composer).toHaveCSS('height', '192px');
	await composer.fill('');
	await expect(composer).toHaveCSS('height', '72px');
	expect(requests).toHaveLength(0);
});
