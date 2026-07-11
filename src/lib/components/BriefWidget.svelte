<script lang="ts">
	import {
		ArrowRight,
		Gauge,
		RectangleHorizontal,
		RectangleVertical,
		Square,
		Users
	} from '@lucide/svelte';
	import type { Aspect, Audience } from '$lib/studio/types';

	let {
		audience,
		aspect,
		imageWidth,
		imageHeight,
		density,
		connected,
		onAudience,
		onAspect,
		onSize,
		onDensity,
		onContinue
	}: {
		audience: Audience;
		aspect: Aspect;
		imageWidth: number;
		imageHeight: number;
		density: number;
		connected: boolean;
		onAudience: (value: Audience) => void;
		onAspect: (value: Aspect) => void;
		onSize: (width: number, height: number) => void;
		onDensity: (value: number) => void;
		onContinue: () => void;
	} = $props();

	const audiences: Audience[] = ['Everyone', 'Executives', 'Students', 'Experts'];
	const presets: Record<Aspect, Array<{ label: string; width: number; height: number }>> = {
		landscape: [
			{ label: 'Standard', width: 1536, height: 1024 },
			{ label: 'Wide 2K', width: 2048, height: 1152 },
			{ label: 'Wide 4K', width: 3840, height: 2160 }
		],
		portrait: [
			{ label: 'Standard', width: 1024, height: 1536 },
			{ label: 'Tall 2K', width: 1152, height: 2048 },
			{ label: 'Tall 4K', width: 2160, height: 3840 }
		],
		square: [
			{ label: 'Standard', width: 1024, height: 1024 },
			{ label: '2K', width: 2048, height: 2048 }
		]
	};

	function sizeIssue(width: number, height: number) {
		if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
			return 'Enter a valid width and height.';
		if (width > 3840 || height > 3840) return 'Maximum edge length is 3840px.';
		if (width % 16 || height % 16) return 'Both dimensions must be divisible by 16.';
		const ratio = Math.max(width, height) / Math.min(width, height);
		if (ratio > 3) return 'Aspect ratio cannot be wider or taller than 3:1.';
		const pixels = width * height;
		if (pixels < 655_360 || pixels > 8_294_400)
			return 'Canvas must contain between 655,360 and 8,294,400 pixels.';
		return '';
	}

	let sizeError = $derived(sizeIssue(imageWidth, imageHeight));
</script>

<section class="brief-widget" aria-labelledby="brief-heading">
	<div class="brief-title">
		<div>
			<span>02</span>
			<h3 id="brief-heading">Tune the brief</h3>
		</div>
		<p>A little context makes the visual much sharper.</p>
	</div>

	<div class="control-row">
		<div class="control-label"><Users size={14} /><span>Audience</span></div>
		<div class="segmented audience">
			{#each audiences as option (option)}
				<button class:active={audience === option} type="button" onclick={() => onAudience(option)}
					>{option}</button
				>
			{/each}
		</div>
	</div>

	<div class="control-row split">
		<div>
			<div class="control-label"><RectangleHorizontal size={14} /><span>Format</span></div>
			<div class="segmented icons">
				<button
					class:active={aspect === 'landscape'}
					aria-label="Landscape"
					title="Landscape"
					type="button"
					onclick={() => onAspect('landscape')}><RectangleHorizontal size={16} /></button
				>
				<button
					class:active={aspect === 'portrait'}
					aria-label="Portrait"
					title="Portrait"
					type="button"
					onclick={() => onAspect('portrait')}><RectangleVertical size={16} /></button
				>
				<button
					class:active={aspect === 'square'}
					aria-label="Square"
					title="Square"
					type="button"
					onclick={() => onAspect('square')}><Square size={15} /></button
				>
			</div>
		</div>

		<div class="density-control">
			<div class="control-label">
				<Gauge size={14} /><span>Information density</span><b
					>{['Light', 'Balanced', 'Dense'][density - 1]}</b
				>
			</div>
			<div class="density-dots">
				{#each [1, 2, 3] as value (value)}
					<button
						aria-label={`Density ${value}`}
						class:active={density >= value}
						type="button"
						onclick={() => onDensity(value)}
					></button>
				{/each}
			</div>
		</div>
	</div>

	<div class="control-row canvas-size">
		<div class="control-label">
			<RectangleHorizontal size={14} /><span>GPT Image 2 canvas</span><b
				>{imageWidth} × {imageHeight}</b
			>
		</div>
		<div class="size-editor">
			<label
				><span>Width</span><input
					type="number"
					min="256"
					max="3840"
					step="16"
					value={imageWidth}
					oninput={(event) => onSize(event.currentTarget.valueAsNumber, imageHeight)}
				/></label
			><i>×</i><label
				><span>Height</span><input
					type="number"
					min="256"
					max="3840"
					step="16"
					value={imageHeight}
					oninput={(event) => onSize(imageWidth, event.currentTarget.valueAsNumber)}
				/></label
			>
			<div class="size-presets">
				{#each presets[aspect] as preset (`${preset.width}x${preset.height}`)}
					<button
						class:active={imageWidth === preset.width && imageHeight === preset.height}
						type="button"
						onclick={() => onSize(preset.width, preset.height)}>{preset.label}</button
					>
				{/each}
			</div>
		</div>
		<small class:error={Boolean(sizeError)}
			>{sizeError ||
				'Custom dimensions are supported; larger canvases can cost more and take longer.'}</small
		>
	</div>

	<button class="continue" type="button" disabled={Boolean(sizeError)} onclick={onContinue}>
		{connected ? 'Generate three directions' : 'Preview demo directions'}
		<ArrowRight size={15} />
	</button>
</section>

<style>
	.brief-widget {
		width: min(100%, 680px);
		padding: 22px;
		border: 1px solid var(--line);
		border-radius: 20px;
		background: white;
		box-shadow: var(--shadow-soft);
	}
	.brief-title {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 17px;
	}
	.brief-title > div {
		display: flex;
		align-items: baseline;
		gap: 9px;
	}
	.brief-title span {
		color: var(--accent);
		font-size: 13px;
		font-weight: 750;
	}
	h3 {
		margin: 0;
		font-size: 18px;
		letter-spacing: -0.03em;
	}
	.brief-title p {
		max-width: 195px;
		margin: 0;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.4;
		text-align: right;
	}
	.control-row {
		padding: 13px 0;
		border-top: 1px solid var(--line-soft);
	}
	.control-row.split {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		gap: 24px;
	}
	.control-label {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 8px;
		color: var(--muted);
		font-size: 13px;
		font-weight: 620;
	}
	.control-label b {
		margin-left: auto;
		color: var(--ink);
		font-size: 12px;
		font-weight: 650;
	}
	.segmented {
		display: flex;
		gap: 3px;
		padding: 3px;
		border-radius: 10px;
		background: var(--surface);
	}
	.segmented button {
		flex: 1;
		height: 38px;
		padding: 0 8px;
		border: 0;
		border-radius: 8px;
		color: var(--muted);
		background: transparent;
		font-size: 13px;
		font-weight: 600;
		transition: 140ms ease;
	}
	.segmented button.active {
		color: var(--ink);
		background: white;
		box-shadow: 0 2px 7px rgb(20 20 22 / 8%);
	}
	.segmented.icons {
		width: 122px;
	}
	.segmented.icons button {
		display: grid;
		place-items: center;
		padding: 0;
	}
	.density-dots {
		display: flex;
		align-items: center;
		gap: 5px;
		height: 36px;
	}
	.density-dots button {
		flex: 1;
		height: 5px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: #e2e0db;
		transition: 140ms ease;
	}
	.density-dots button.active {
		background: var(--ink);
	}
	.size-editor {
		display: flex;
		align-items: flex-end;
		gap: 8px;
	}
	.size-editor label {
		display: flex;
		width: 108px;
		flex-direction: column;
		gap: 4px;
		color: var(--muted);
		font-size: 10px;
		font-weight: 650;
		text-transform: uppercase;
	}
	.size-editor input {
		height: 38px;
		padding: 0 9px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: white;
		font-size: 13px;
		box-shadow: none;
	}
	.size-editor > i {
		padding-bottom: 10px;
		color: var(--muted);
		font-size: 12px;
		font-style: normal;
	}
	.size-presets {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-left: auto;
		padding-bottom: 1px;
	}
	.size-presets button {
		height: 34px;
		padding: 0 8px;
		border: 1px solid var(--line);
		border-radius: 8px;
		color: var(--muted);
		background: white;
		font-size: 10px;
		font-weight: 650;
	}
	.size-presets button.active {
		border-color: var(--ink);
		color: white;
		background: var(--ink);
	}
	.canvas-size > small {
		display: block;
		margin-top: 7px;
		color: var(--muted);
		font-size: 10px;
	}
	.canvas-size > small.error {
		color: #a8493a;
	}
	.continue {
		display: flex;
		width: 100%;
		height: 48px;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 8px;
		border: 0;
		border-radius: 12px;
		color: white;
		background: var(--ink);
		font-size: 14px;
		font-weight: 650;
		box-shadow: 0 8px 20px rgb(18 20 24 / 16%);
		transition: 160ms ease;
	}
	.continue:hover {
		transform: translateY(-1px);
		box-shadow: 0 10px 24px rgb(18 20 24 / 20%);
	}
	.continue:disabled {
		cursor: not-allowed;
		opacity: 0.45;
		transform: none;
	}
	@media (max-width: 560px) {
		.brief-title p {
			display: none;
		}
		.control-row.split {
			grid-template-columns: 1fr;
			gap: 13px;
		}
		.segmented.audience {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
		.size-editor {
			align-items: stretch;
			flex-wrap: wrap;
		}
		.size-presets {
			width: 100%;
			margin-left: 0;
		}
	}
</style>
