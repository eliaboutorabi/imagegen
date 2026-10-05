<script lang="ts">
	import { tick } from 'svelte';
	import {
		ArrowUp02Icon,
		PlusSignIcon,
		Cancel01Icon,
		ArrowDown01Icon,
		Tick02Icon,
		AiChat02Icon,
		Image02Icon,
		Settings04Icon,
		SquareIcon,
		ImageUploadIcon,
		ArrowRight02Icon,
		Loading03Icon
	} from '@hugeicons/core-free-icons';
	import Icon from './Icon.svelte';
	import {
		IMAGE_MODELS,
		TEXT_MODELS,
		imageQualities,
		imageQualityName,
		imageModelName,
		textModelName
	} from '$lib/studio/models';
	import type {
		ImageFormat,
		ImageQuality,
		ReferenceAsset,
		StudioSettings
	} from '$lib/studio/types';

	type SettingChange = Partial<
		Pick<
			StudioSettings,
			'plannerModel' | 'imageModel' | 'quality' | 'outputFormat' | 'autoGenerate'
		>
	>;
	let {
		value = $bindable(''),
		settings,
		width,
		height,
		references,
		busy,
		activity,
		attachmentMessage,
		onSubmit,
		onStop,
		onFiles,
		onRemoveReference,
		onSettingsChange,
		onSizeChange,
		onOpenSettings
	}: {
		value: string;
		settings: StudioSettings;
		width: number;
		height: number;
		references: ReferenceAsset[];
		busy: boolean;
		activity: string;
		attachmentMessage: string;
		onSubmit: () => void;
		onStop: () => void;
		onFiles: (files: File[]) => void;
		onRemoveReference: (id: string) => void;
		onSettingsChange: (changes: SettingChange) => void;
		onSizeChange: (width: number, height: number) => void;
		onOpenSettings: () => void;
	} = $props();
	let menu = $state<'text' | 'image' | 'render' | null>(null);
	let root: HTMLDivElement;
	let textarea: HTMLTextAreaElement;
	let fileInput: HTMLInputElement;
	let menuTrigger: HTMLButtonElement | null = null;
	let customModel = $state('');
	let dragging = $state(false);
	let dragDepth = 0;
	const sizes = [
		{ name: 'Landscape', ratio: '3:2', width: 1536, height: 1024 },
		{ name: 'Portrait', ratio: '2:3', width: 1024, height: 1536 },
		{ name: 'Square', ratio: '1:1', width: 1024, height: 1024 },
		{ name: 'Wide', ratio: '16:9', width: 2048, height: 1152 },
		{ name: 'Tall', ratio: '9:16', width: 1152, height: 2048 }
	];
	const textLabel = $derived(
		TEXT_MODELS.find((model) => model.id === settings.plannerModel)?.shortName ??
			settings.plannerModel
	);
	const imageLabel = $derived(imageModelName(settings.imageModel).replace('GPT Image ', 'Image '));
	const canvasLabel = $derived(
		references.length
			? 'Reference'
			: (sizes.find((size) => size.width === width && size.height === height)?.ratio ??
					`${width}×${height}`)
	);

	$effect(() => {
		void value;
		if (textarea) {
			textarea.style.height = '0px';
			textarea.style.height = `${Math.min(192, Math.max(72, textarea.scrollHeight))}px`;
		}
	});
	$effect(() => {
		if (busy) menu = null;
	});

	async function toggleMenu(next: typeof menu, event: MouseEvent) {
		menuTrigger = event.currentTarget as HTMLButtonElement;
		menu = menu === next ? null : next;
		if (menu) {
			await tick();
			root
				.querySelector<HTMLElement>('.composer-popover button, .composer-popover select')
				?.focus();
		}
	}
	function closeMenu(restoreFocus = false) {
		menu = null;
		if (restoreFocus) menuTrigger?.focus();
	}
	function selectModel(changes: SettingChange) {
		onSettingsChange(changes);
		closeMenu(true);
	}
	function submit() {
		if (busy || !value.trim()) return;
		closeMenu();
		onSubmit();
		textarea?.focus();
	}
	function paste(event: ClipboardEvent) {
		const files = [...(event.clipboardData?.files ?? [])].filter((file) =>
			file.type.startsWith('image/')
		);
		if (files.length) {
			event.preventDefault();
			onFiles(files);
		}
	}
	function drop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		dragDepth = 0;
		onFiles([...(event.dataTransfer?.files ?? [])]);
	}
</script>

<svelte:window
	onpointerdown={(event) => {
		if (menu && !event.composedPath().includes(root)) closeMenu();
	}}
/>

<div class="composer-dock" bind:this={root} role="group" aria-label="Creative studio composer">
	{#if menu}
		<div
			role="dialog"
			tabindex="-1"
			onkeydown={(event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					event.stopPropagation();
					closeMenu(true);
				}
			}}
			class:render-popover={menu === 'render'}
			class="composer-popover"
			aria-label={menu === 'render'
				? 'Image settings'
				: menu === 'text'
					? 'Choose text model'
					: 'Choose image model'}
		>
			<header>
				<div>
					<h3>
						{menu === 'render'
							? 'Make it yours'
							: menu === 'text'
								? 'Your creative partner'
								: 'Your image model'}
					</h3>
					<p>
						{menu === 'render'
							? 'Fine-tune your next generation.'
							: menu === 'text'
								? 'For thinking, writing, and refining ideas.'
								: 'For every new image and reference edit.'}
					</p>
				</div>
				<button
					class="quiet-icon"
					type="button"
					aria-label="Close composer menu"
					onclick={() => closeMenu(true)}><Icon icon={Cancel01Icon} size={18} /></button
				>
			</header>
			{#if menu === 'text'}
				<div class="model-options">
					{#each TEXT_MODELS as model (model.id)}
						<button
							class:chosen={settings.plannerModel === model.id}
							class="model-option"
							type="button"
							aria-pressed={settings.plannerModel === model.id}
							onclick={() => selectModel({ plannerModel: model.id })}
						>
							<span class="model-symbol"><Icon icon={AiChat02Icon} size={21} /></span><span
								><strong>{model.name}</strong><small>{model.description}</small></span
							>
							{#if settings.plannerModel === model.id}<Icon icon={Tick02Icon} size={18} />{/if}
						</button>
					{/each}
				</div>
				<details class="custom-model">
					<summary>Use another model</summary>
					<div>
						<input
							aria-label="Custom text model ID"
							placeholder="Enter a model ID"
							bind:value={customModel}
						/><button
							type="button"
							disabled={!customModel.trim()}
							onclick={() => selectModel({ plannerModel: customModel.trim() })}>Apply</button
						>
					</div>
				</details>
			{:else if menu === 'image'}
				<div class="model-options">
					{#each IMAGE_MODELS as model (model.id)}
						<button
							class:chosen={settings.imageModel === model.id}
							class="model-option"
							type="button"
							aria-pressed={settings.imageModel === model.id}
							onclick={() => selectModel({ imageModel: model.id })}
						>
							<span class="model-symbol"><Icon icon={Image02Icon} size={21} /></span><span
								><strong>{model.name}</strong><small>{model.description}</small></span
							>
							{#if settings.imageModel === model.id}<Icon icon={Tick02Icon} size={18} />{/if}
						</button>
					{/each}
				</div>
			{:else}
				<div class="render-fields">
					<div class="field-heading">
						<span>Canvas</span><small
							>{references.length ? 'Matches your reference' : `${width} × ${height} px`}</small
						>
					</div>
					<div class="canvas-options">
						{#each sizes as size (size.name)}
							<button
								type="button"
								disabled={references.length > 0}
								class:chosen={!references.length && width === size.width && height === size.height}
								aria-label={`${size.name} ${size.ratio}`}
								aria-pressed={!references.length && width === size.width && height === size.height}
								onclick={() => onSizeChange(size.width, size.height)}
							>
								<span
									class="canvas-shape"
									style={`aspect-ratio:${size.width}/${size.height};${size.width >= size.height ? 'width:22px' : 'height:22px'}`}
								></span><span>{size.ratio}</span>
							</button>
						{/each}
					</div>
					<div class="output-fields">
						<label
							>Quality<select
								aria-label="Image quality"
								value={settings.quality}
								onchange={(event) =>
									onSettingsChange({ quality: event.currentTarget.value as ImageQuality })}
								>{#each imageQualities(settings.imageModel) as quality (quality)}<option
										value={quality}>{imageQualityName(quality)}</option
									>{/each}</select
							></label
						>
						<label
							>File type<select
								aria-label="Image file type"
								value={settings.outputFormat}
								onchange={(event) =>
									onSettingsChange({ outputFormat: event.currentTarget.value as ImageFormat })}
								><option value="webp">WebP</option><option value="png">PNG</option><option
									value="jpeg">JPEG</option
								></select
							></label
						>
					</div>
					<label class="draft-toggle"
						><span
							><strong>Render first drafts</strong><small
								>One image for each creative direction.</small
							></span
						><input
							type="checkbox"
							aria-label="Auto-render first drafts"
							checked={settings.autoGenerate}
							onchange={(event) => onSettingsChange({ autoGenerate: event.currentTarget.checked })}
						/><span class="switch-track" aria-hidden="true"></span></label
					>
				</div>
			{/if}
			<button
				class="all-settings"
				type="button"
				onclick={() => {
					closeMenu();
					onOpenSettings();
				}}
				><Icon icon={Settings04Icon} size={17} /><span>All studio settings</span><Icon
					icon={ArrowRight02Icon}
					size={16}
				/></button
			>
		</div>
	{/if}

	<form
		class:dragging
		class="studio-composer"
		onsubmit={(event) => {
			event.preventDefault();
			submit();
		}}
		ondragenter={(event) => {
			if (event.dataTransfer?.types.includes('Files')) {
				event.preventDefault();
				dragDepth++;
				dragging = true;
			}
		}}
		ondragleave={() => {
			dragDepth = Math.max(0, dragDepth - 1);
			if (!dragDepth) dragging = false;
		}}
		ondragover={(event) => {
			if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
		}}
		ondrop={drop}
	>
		{#if dragging}<div class="drop-hint">
				<Icon icon={ImageUploadIcon} size={28} /><strong>Drop images to use as references</strong>
			</div>{/if}
		<input
			class="file-input"
			bind:this={fileInput}
			type="file"
			accept="image/png,image/jpeg,image/webp"
			multiple
			onchange={(event) => {
				onFiles([...(event.currentTarget.files ?? [])]);
				event.currentTarget.value = '';
			}}
		/>
		{#if references.length}
			<div class="composer-references" aria-label="Attached references">
				{#each references as reference (reference.id)}
					<div class="reference-tile" title={reference.name}>
						<img src={reference.dataUrl} alt={reference.name} /><span>{reference.name}</span><button
							type="button"
							aria-label={`Remove ${reference.name}`}
							onclick={() => onRemoveReference(reference.id)}
							><Icon icon={Cancel01Icon} size={12} /></button
						>
					</div>
				{/each}
			</div>
		{/if}
		<textarea
			bind:this={textarea}
			bind:value
			rows="2"
			aria-label="Message"
			onfocus={() => closeMenu()}
			placeholder={references.length
				? 'What would you like to change in this image?'
				: 'Describe your next image, or explore an idea…'}
			onpaste={paste}
			onkeydown={(event) => {
				if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
					event.preventDefault();
					submit();
				}
			}}></textarea>
		<div class="composer-toolbar">
			<div class="composer-tools">
				<button
					class="attach-control quiet-icon"
					type="button"
					onclick={() => fileInput.click()}
					aria-label="Attach reference images"
					title="Attach images · or paste and drop them here"
					><Icon icon={PlusSignIcon} size={23} /></button
				>
				<span class="toolbar-divider"></span>
				<button
					class:active={menu === 'text'}
					class="model-control text-control"
					type="button"
					disabled={busy}
					aria-label={`Text model: ${textModelName(settings.plannerModel)}`}
					aria-expanded={menu === 'text'}
					title={`Text model · ${textModelName(settings.plannerModel)}`}
					onclick={(event) => toggleMenu('text', event)}
					><Icon icon={AiChat02Icon} size={17} /><span>{textLabel}</span><Icon
						icon={ArrowDown01Icon}
						size={13}
					/></button
				>
				<button
					class:active={menu === 'image'}
					class="model-control image-control"
					type="button"
					disabled={busy}
					aria-label={`Image model: ${imageModelName(settings.imageModel)}`}
					aria-expanded={menu === 'image'}
					title={`Image model · ${imageModelName(settings.imageModel)}`}
					onclick={(event) => toggleMenu('image', event)}
					><Icon icon={Image02Icon} size={17} /><span>{imageLabel}</span><Icon
						icon={ArrowDown01Icon}
						size={13}
					/></button
				>
			</div>
			<div class="composer-actions">
				<button
					class:active={menu === 'render'}
					class="render-control"
					type="button"
					disabled={busy}
					aria-label="Image settings"
					aria-expanded={menu === 'render'}
					title={`${imageQualityName(settings.quality)} quality · ${canvasLabel} · ${settings.outputFormat.toUpperCase()}`}
					onclick={(event) => toggleMenu('render', event)}
					><span>{imageQualityName(settings.quality)}<i>·</i>{canvasLabel}</span><Icon
						icon={Settings04Icon}
						size={19}
					/></button
				>
				{#if busy}<button
						class="submit-control stop-control"
						type="button"
						onclick={onStop}
						aria-label="Stop agent"
						title="Stop response"><Icon icon={SquareIcon} size={16} fill="currentColor" /></button
					>{:else}<button
						class="submit-control"
						type="submit"
						disabled={!value.trim()}
						aria-label="Send message"
						title="Send message"><Icon icon={ArrowUp02Icon} size={21} /></button
					>{/if}
			</div>
		</div>
	</form>
	<div class="composer-caption">
		<span role="status"
			>{#if attachmentMessage}{attachmentMessage}{:else if busy}<Icon
					icon={Loading03Icon}
					size={13}
					class="spin"
				/>
				{activity || 'Thinking through your idea'}{:else if references.length}{references.length} reference{references.length ===
				1
					? ''
					: 's'} attached{:else if !settings.apiKey}<button type="button" onclick={onOpenSettings}
					>Connect OpenAI to start creating <Icon icon={ArrowRight02Icon} size={12} /></button
				>{:else}Your next idea starts here{/if}</span
		><span class="keyboard-hint">Shift + Enter for a new line</span>
	</div>
</div>

<style>
	.composer-dock {
		position: relative;
		width: 100%;
		max-width: 1016px;
		margin: 0 auto;
		container-type: inline-size;
	}
	.studio-composer {
		position: relative;
		margin: 0;
		padding: 17px 15px 12px;
		border: 1px solid color-mix(in srgb, var(--ink) 16%, var(--panel));
		border-radius: 24px;
		background: var(--panel);
		box-shadow:
			0 3px 6px #00000003,
			0 12px 40px #00000005;
		transition:
			border-color 160ms,
			box-shadow 160ms;
	}
	.studio-composer:focus-within {
		border-color: color-mix(in srgb, var(--ink) 28%, var(--panel));
		box-shadow:
			0 3px 6px #00000003,
			0 12px 40px #00000008;
	}
	.studio-composer textarea {
		display: block;
		width: 100%;
		height: 72px;
		min-height: 72px;
		max-height: 192px;
		margin: 0 0 12px;
		padding: 3px 6px;
		resize: none;
		border: 0;
		border-radius: 0;
		outline: none;
		background: transparent;
		box-shadow: none;
		color: var(--ink);
		font-family: inherit;
		font-size: 16px;
		line-height: 1.65;
		letter-spacing: -0.012em;
	}
	.studio-composer textarea:focus-visible {
		outline: none;
	}
	.studio-composer textarea::placeholder {
		color: color-mix(in srgb, var(--ink) 48%, var(--panel));
		opacity: 1;
	}
	.file-input {
		display: none;
	}
	.composer-toolbar,
	.composer-tools,
	.composer-actions {
		display: flex;
		align-items: center;
		min-width: 0;
	}
	.composer-toolbar {
		justify-content: space-between;
		gap: 10px;
	}
	.composer-tools {
		gap: 3px;
	}
	.composer-actions {
		gap: 10px;
	}
	button {
		cursor: pointer;
		font: inherit;
	}
	button:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}
	.quiet-icon {
		display: grid;
		flex: 0 0 auto;
		place-items: center;
		width: 34px;
		height: 34px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		color: var(--ink-2);
		background: transparent;
	}
	.quiet-icon:hover,
	.model-control:hover,
	.render-control:hover,
	.model-control.active,
	.render-control.active {
		background: var(--surface);
		color: var(--ink);
	}
	.attach-control {
		width: 36px;
		height: 36px;
	}
	.toolbar-divider {
		width: 1px;
		height: 18px;
		background: var(--line);
		margin: 0 7px 0 3px;
		flex-shrink: 0;
	}
	.model-control,
	.render-control {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		height: 36px;
		padding: 0 9px;
		border: 0;
		border-radius: 10px;
		background: transparent;
		color: var(--ink-2);
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		min-width: 0;
		transition: background 130ms;
	}
	.model-control > span {
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 160px;
	}
	.model-control :global(svg) {
		flex-shrink: 0;
	}
	.render-control {
		gap: 10px;
		font-size: 12px;
		color: var(--muted);
	}
	.render-control span {
		display: flex;
		align-items: center;
		gap: 7px;
	}
	.render-control i {
		font-style: normal;
		opacity: 0.6;
	}
	.submit-control {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 38px;
		height: 38px;
		border: 0;
		border-radius: 50%;
		color: var(--panel);
		background: var(--ink);
		transition:
			opacity 130ms,
			transform 130ms;
	}
	.submit-control:hover:not(:disabled) {
		transform: translateY(-1px);
	}
	.submit-control:disabled {
		color: var(--muted);
		background: var(--surface);
		opacity: 1;
	}
	.composer-caption {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		min-height: 30px;
		padding: 8px 8px 0;
		color: var(--muted);
		font-size: 11px;
		line-height: 1.4;
	}
	.composer-caption > span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.composer-caption button {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 0;
		border: 0;
		color: var(--muted);
		background: none;
		font-size: inherit;
	}
	.composer-caption button:hover {
		color: var(--ink);
	}
	.composer-popover {
		position: absolute;
		bottom: calc(100% + 10px);
		left: 0;
		z-index: 20;
		width: min(380px, 100%);
		max-height: min(570px, 65vh);
		overflow-y: auto;
		border: 1px solid var(--line);
		border-radius: 20px;
		background: var(--panel);
		box-shadow: 0 12px 55px #00000020;
		padding: 18px 10px 8px;
		animation: arrive 130ms ease-out;
	}
	.render-popover {
		left: auto;
		right: 0;
		width: min(360px, 100%);
	}
	.composer-popover header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 0 6px 15px 8px;
		gap: 10px;
	}
	.composer-popover h3 {
		margin: 0;
		font-size: 16px;
		line-height: 1.4;
		font-weight: 600;
		letter-spacing: -0.025em;
		color: var(--ink);
	}
	.composer-popover header p {
		margin: 5px 0 0;
		font-size: 12px;
		line-height: 1.5;
		color: var(--muted);
	}
	.composer-popover header .quiet-icon {
		width: 25px;
		height: 25px;
	}
	.model-options {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.model-option {
		display: flex;
		align-items: center;
		gap: 11px;
		width: 100%;
		padding: 12px 10px;
		border: 0;
		border-radius: 12px;
		color: var(--ink);
		background: transparent;
		text-align: left;
	}
	.model-option:hover,
	.model-option.chosen {
		background: var(--surface);
	}
	.model-symbol {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		flex-shrink: 0;
		color: var(--ink-2);
	}
	.model-option > span:nth-child(2) {
		flex: 1;
		min-width: 0;
	}
	.model-option strong {
		display: block;
		font-size: 14px;
		font-weight: 550;
	}
	.model-option small {
		display: block;
		margin-top: 4px;
		font-size: 12px;
		line-height: 1.45;
		color: var(--muted);
	}
	.model-option > :global(svg:last-child) {
		color: var(--accent);
		flex-shrink: 0;
	}
	.custom-model {
		padding: 13px 10px;
		font-size: 12px;
		color: var(--muted);
	}
	.custom-model summary {
		cursor: pointer;
	}
	.custom-model > div {
		display: flex;
		gap: 6px;
		margin-top: 12px;
	}
	.custom-model input {
		width: 100%;
		min-width: 0;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--page);
		color: var(--ink);
		padding: 8px;
		font-size: 13px;
	}
	.custom-model button {
		border: 0;
		border-radius: 8px;
		background: var(--surface);
		color: var(--ink);
		padding: 0 12px;
		font-size: 12px;
	}
	.all-settings {
		display: flex;
		align-items: center;
		gap: 9px;
		width: 100%;
		margin-top: 8px;
		padding: 13px 10px 9px;
		border: 0;
		border-top: 1px solid var(--line-soft);
		background: transparent;
		color: var(--muted);
		font-size: 12px;
		text-align: left;
	}
	.all-settings span {
		flex: 1;
	}
	.all-settings:hover {
		color: var(--ink);
	}
	.render-fields {
		padding: 0 9px;
	}
	.field-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
		font-weight: 550;
	}
	.field-heading small {
		font-size: 11px;
		font-weight: 400;
		color: var(--muted);
	}
	.canvas-options {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 6px;
		margin: 10px 0 20px;
	}
	.canvas-options button {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 8px;
		height: 65px;
		padding: 8px 3px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: transparent;
		color: var(--muted);
		font-size: 11px;
	}
	.canvas-options button.chosen {
		border-color: var(--ink-2);
		color: var(--ink);
		background: var(--surface);
	}
	.canvas-shape {
		display: block;
		border: 1.5px solid currentColor;
		border-radius: 3px;
		max-width: 25px;
		max-height: 22px;
	}
	.output-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.output-fields label {
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 12px;
		font-weight: 550;
	}
	.output-fields select {
		width: 100%;
		height: 39px;
		border: 1px solid var(--line);
		border-radius: 9px;
		background-color: var(--page);
		color: var(--ink);
		padding: 7px 28px 7px 10px;
		font-size: 13px;
	}
	.draft-toggle {
		display: flex;
		position: relative;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		cursor: pointer;
		padding: 18px 0 9px;
		margin-top: 16px;
		border-top: 1px solid var(--line-soft);
	}
	.draft-toggle strong {
		display: block;
		font-size: 13px;
		font-weight: 550;
	}
	.draft-toggle small {
		display: block;
		font-size: 11px;
		color: var(--muted);
		margin-top: 4px;
	}
	.draft-toggle input {
		position: absolute;
		opacity: 0;
		right: 0;
		width: 36px;
		height: 22px;
		cursor: pointer;
	}
	.switch-track {
		pointer-events: none;
		flex-shrink: 0;
		width: 36px;
		height: 22px;
		padding: 3px;
		border-radius: 20px;
		background: var(--line);
		transition: background 150ms;
	}
	.switch-track::after {
		content: '';
		display: block;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--panel);
		box-shadow: 0 1px 3px #00000020;
		transition: transform 150ms;
	}
	.draft-toggle input:checked + .switch-track {
		background: var(--accent);
	}
	.draft-toggle input:checked + .switch-track::after {
		transform: translateX(14px);
	}
	.draft-toggle input:focus-visible + .switch-track {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}
	.composer-references {
		display: flex;
		gap: 9px;
		overflow-x: auto;
		padding: 3px 6px 14px;
	}
	.reference-tile {
		position: relative;
		flex: 0 0 74px;
		width: 74px;
		padding: 5px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--page);
	}
	.reference-tile img {
		display: block;
		width: 62px;
		height: 58px;
		object-fit: contain;
		border-radius: 6px;
	}
	.reference-tile > span {
		display: block;
		margin-top: 5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--muted);
		font-size: 9px;
	}
	.reference-tile button {
		display: grid;
		place-items: center;
		position: absolute;
		top: 3px;
		right: 3px;
		width: 20px;
		height: 20px;
		border: 1px solid var(--line);
		border-radius: 50%;
		color: var(--ink);
		background: var(--panel);
	}
	.drop-hint {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 10px;
		border: 1.5px dashed var(--accent);
		border-radius: inherit;
		color: var(--accent);
		background: var(--panel);
		pointer-events: none;
		font-size: 14px;
	}
	:global(.composer-caption .spin) {
		animation: rotate 1.5s linear infinite;
	}
	@keyframes rotate {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes arrive {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@container (max-width: 680px) {
		.render-control > span {
			display: none;
		}
		.composer-actions {
			gap: 5px;
		}
		.model-control {
			padding: 0 7px;
		}
	}
	@container (max-width: 460px) {
		.studio-composer {
			padding: 14px 10px 10px;
			border-radius: 20px;
		}
		.model-control {
			gap: 4px;
			padding: 0 5px;
			font-size: 12px;
		}
		.text-control > :global(svg:first-child),
		.image-control > :global(svg:first-child) {
			display: none;
		}
		.toolbar-divider {
			margin: 0 3px;
		}
		.composer-toolbar {
			gap: 4px;
		}
		.model-control > span {
			max-width: 130px;
		}
		.keyboard-hint {
			display: none !important;
		}
		.render-control {
			padding: 0 7px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		*,
		*::after {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
