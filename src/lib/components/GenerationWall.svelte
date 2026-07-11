<script lang="ts">
	import {
		AlertCircle,
		ArrowDownToLine,
		Check,
		Clock3,
		Copy,
		EllipsisVertical,
		ImageIcon,
		ImagePlus,
		LoaderCircle,
		RotateCcw,
		Sparkles
	} from '@lucide/svelte';
	import type { Generation } from '$lib/studio/types';

	let {
		generations,
		focusedGenerationId = null,
		onOpen,
		onRetry,
		onRegenerate,
		onReference
	}: {
		generations: Generation[];
		focusedGenerationId?: string | null;
		onOpen: (generation: Generation) => void;
		onRetry: (generation: Generation) => void;
		onRegenerate: (generation: Generation) => void;
		onReference: (generation: Generation) => void;
	} = $props();
	let openMenuId = $state<string | null>(null);
	let copiedId = $state<string | null>(null);

	let activeCount = $derived(
		generations.filter((generation) => ['queued', 'generating'].includes(generation.status)).length
	);

	function download(generation: Generation) {
		if (!generation.imageUrl) return;
		const inferred = generation.imageUrl.match(/^data:image\/(png|jpeg|webp)/)?.[1];
		const format = generation.outputFormat ?? inferred ?? 'webp';
		const link = document.createElement('a');
		link.href = generation.imageUrl;
		link.download = `${generation.conceptTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${generation.variation}.${format === 'jpeg' ? 'jpg' : format}`;
		link.click();
		openMenuId = null;
	}

	async function copyPrompt(generation: Generation) {
		await navigator.clipboard.writeText(generation.prompt);
		copiedId = generation.id;
		openMenuId = null;
		setTimeout(() => {
			if (copiedId === generation.id) copiedId = null;
		}, 1400);
	}

	function dateLabel(timestamp: number) {
		return new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(timestamp);
	}

	function dimensions(generation: Generation) {
		if (generation.width && generation.height) {
			return { width: generation.width, height: generation.height };
		}
		if (generation.aspect === 'portrait') return { width: 1024, height: 1536 };
		if (generation.aspect === 'square') return { width: 1024, height: 1024 };
		return { width: 1536, height: 1024 };
	}
</script>

<svelte:window
	onclick={() => (openMenuId = null)}
	onkeydown={(event) => event.key === 'Escape' && (openMenuId = null)}
/>

<aside class="wall" aria-label="Generation timeline">
	<div class="wall-header">
		<div>
			<span>Generation wall</span>
			<small
				>{generations.length
					? `${generations.length} artifact${generations.length === 1 ? '' : 's'}`
					: 'Your visual timeline'}</small
			>
		</div>
		<span class:rendering={activeCount > 0} class="live"
			><i></i>{activeCount > 0 ? `${activeCount} rendering` : 'Up to date'}</span
		>
	</div>

	<div class="wall-scroll">
		{#if generations.length === 0}
			<div class="empty-wall">
				<div class="empty-orbit"><ImageIcon size={21} /><Sparkles class="spark" size={12} /></div>
				<strong>Your generations will live here</strong>
				<p>Every draft, variation, and final image stays in this scrollable timeline.</p>
			</div>
		{:else}
			<div class="timeline-line"></div>
			{#each generations as generation (generation.id)}
				{@const size = dimensions(generation)}
				<article
					class:error={generation.status === 'error'}
					class:focused={focusedGenerationId === generation.id}
					class:menu-open={openMenuId === generation.id}
					class="generation-card"
					data-generation-id={generation.id}
				>
					<div class="timeline-dot" class:active={generation.status === 'generating'}></div>
					<div
						class:has-image={Boolean(generation.imageUrl)}
						class="image-frame"
						role="button"
						tabindex="0"
						onclick={() => generation.imageUrl && onOpen(generation)}
						onkeydown={(event) =>
							event.key === 'Enter' && generation.imageUrl && onOpen(generation)}
						aria-label={`Open ${generation.conceptTitle}`}
						style={`--ratio:${size.width} / ${size.height}`}
					>
						{#if generation.imageUrl}
							<img
								src={generation.imageUrl}
								alt={`Generated infographic: ${generation.conceptTitle}`}
							/>
						{:else if generation.status === 'error'}
							<div class="error-state">
								<AlertCircle size={19} /><span>Generation paused</span><small
									>{generation.error}</small
								>
							</div>
						{:else if generation.status === 'needs-key' || generation.status === 'ready'}
							<div class="prompt-only-state">
								<ImageIcon size={21} />
								<strong>No image yet</strong>
								<span>The prompt is ready, but generation has not started.</span>
								<button type="button" onclick={() => onRetry(generation)}>Render this prompt</button
								>
							</div>
						{:else}
							<div class="generating-state" aria-live="polite">
								<div class="render-orbit"><LoaderCircle size={22} /></div>
								<div class="shimmer"></div>
								<div class="shimmer short"></div>
								<div class="shimmer block"></div>
								<span
									><i></i>{generation.status === 'queued'
										? 'Waiting for a render slot'
										: 'Generating image…'}</span
								>
							</div>
						{/if}
					</div>

					<div class="generation-meta">
						<strong>{generation.conceptTitle}</strong>
						<div class="generation-actions">
							<time><Clock3 size={10} /> {dateLabel(generation.createdAt)}</time>
							<button
								class="asset-menu-button"
								type="button"
								aria-label={`Actions for ${generation.conceptTitle}`}
								aria-expanded={openMenuId === generation.id}
								onclick={(event) => {
									event.stopPropagation();
									openMenuId = openMenuId === generation.id ? null : generation.id;
								}}><EllipsisVertical size={16} /></button
							>
							{#if openMenuId === generation.id}
								<div class="asset-menu">
									<button type="button" onclick={() => copyPrompt(generation)}
										>{#if copiedId === generation.id}<Check size={13} />{:else}<Copy
												size={13}
											/>{/if}
										Copy prompt</button
									>
									<button
										type="button"
										onclick={() => {
											openMenuId = null;
											onRegenerate(generation);
										}}><RotateCcw size={13} /> Regenerate</button
									>
									<button
										type="button"
										disabled={!generation.imageUrl}
										onclick={() => {
											openMenuId = null;
											onReference(generation);
										}}><ImagePlus size={13} /> Use as reference</button
									>
									<button
										type="button"
										disabled={!generation.imageUrl}
										onclick={() => download(generation)}
										><ArrowDownToLine size={13} /> Download</button
									>
								</div>
							{/if}
						</div>
					</div>
					{#if generation.status === 'error'}
						<button class="retry" type="button" onclick={() => onRetry(generation)}
							><RotateCcw size={12} /> Retry</button
						>
					{/if}
				</article>
			{/each}
		{/if}
	</div>
</aside>

<style>
	.wall {
		position: relative;
		display: flex;
		min-width: 0;
		height: 100%;
		flex-direction: column;
		border-left: 1px solid var(--line);
		background: #f1f0ec;
	}
	.wall-header {
		display: flex;
		height: 56px;
		flex: 0 0 auto;
		align-items: center;
		justify-content: space-between;
		padding: 0 20px;
		border-bottom: 1px solid var(--line);
		background: rgb(247 246 243 / 75%);
		backdrop-filter: blur(16px);
	}
	.wall-header > div {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.wall-header span {
		font-size: 14px;
		font-weight: 680;
		letter-spacing: -0.02em;
	}
	.wall-header small {
		color: var(--muted);
		font-size: 11px;
	}
	.live {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 8px;
		border: 1px solid var(--line);
		border-radius: 999px;
		color: var(--muted);
		background: rgb(255 255 255 / 65%);
		font-size: 11px !important;
		font-weight: 650 !important;
	}
	.live i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #53a96c;
		box-shadow: 0 0 0 3px rgb(83 169 108 / 12%);
	}
	.live.rendering {
		border-color: #e7bcae;
		color: #9d4a36;
		background: #fff3ef;
	}
	.live.rendering i {
		background: var(--accent);
		animation: pulse 1.2s infinite;
	}
	.wall-scroll {
		position: relative;
		min-height: 0;
		padding: 20px 18px 60px 31px;
		flex: 1;
		overflow-y: auto;
	}
	.empty-wall {
		display: flex;
		height: 100%;
		max-width: 250px;
		margin: auto;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		text-align: center;
	}
	.empty-orbit {
		position: relative;
		display: grid;
		width: 62px;
		height: 62px;
		margin-bottom: 17px;
		place-items: center;
		border: 1px solid #dad7d0;
		border-radius: 20px;
		color: #85827b;
		background: rgb(255 255 255 / 58%);
		box-shadow: 0 14px 40px rgb(39 38 34 / 7%);
		transform: rotate(-4deg);
	}
	.empty-orbit :global(.spark) {
		position: absolute;
		top: -5px;
		right: -4px;
		color: var(--accent);
	}
	.empty-wall strong {
		margin-bottom: 6px;
		font-size: 15px;
		letter-spacing: -0.025em;
	}
	.empty-wall p {
		max-width: 210px;
		margin: 0;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.55;
	}
	.timeline-line {
		position: absolute;
		top: 26px;
		bottom: 40px;
		left: 17px;
		width: 1px;
		background: #d9d6cf;
	}
	.generation-card {
		position: relative;
		margin-bottom: 22px;
		border-radius: 16px;
		transition: box-shadow 180ms ease;
	}
	.generation-card.focused {
		box-shadow:
			0 0 0 2px var(--accent),
			0 16px 38px rgb(20 21 24 / 18%);
	}
	.generation-card.menu-open {
		z-index: 10;
	}
	.timeline-dot {
		position: absolute;
		z-index: 2;
		top: 15px;
		left: -18px;
		width: 7px;
		height: 7px;
		border: 2px solid #f1f0ec;
		border-radius: 50%;
		background: #aaa69d;
		box-shadow: 0 0 0 1px #ccc8c0;
	}
	.timeline-dot.active {
		background: var(--accent);
		animation: pulse 1.4s infinite;
	}
	.image-frame {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: var(--ratio);
		padding: 0;
		overflow: visible;
		border: 1px solid rgb(32 32 35 / 8%);
		border-radius: 15px;
		background: #e3e1db;
		box-shadow: 0 12px 28px rgb(31 30 28 / 8%);
	}
	.image-frame img {
		display: block;
		width: 100%;
		height: auto;
		object-fit: contain;
		border-radius: inherit;
	}
	.image-frame.has-image {
		aspect-ratio: auto;
		background: #d9d7d1;
	}
	.asset-menu-button {
		display: grid;
		width: 28px;
		height: 28px;
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 8px;
		color: var(--muted);
		background: transparent;
		transition: 160ms ease;
	}
	.asset-menu-button:hover,
	.asset-menu-button[aria-expanded='true'] {
		color: var(--ink);
		background: var(--surface);
	}
	.asset-menu {
		position: absolute;
		z-index: 6;
		top: 32px;
		right: 0;
		display: grid;
		width: 178px;
		padding: 6px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: rgb(255 255 255 / 97%);
		box-shadow: 0 18px 50px rgb(20 21 24 / 22%);
		backdrop-filter: blur(16px);
	}
	.asset-menu button {
		display: flex;
		height: 34px;
		align-items: center;
		gap: 8px;
		padding: 0 9px;
		border: 0;
		border-radius: 8px;
		color: var(--ink-2);
		background: transparent;
		font-size: 12px;
		font-weight: 620;
		text-align: left;
	}
	.asset-menu button:hover {
		background: var(--surface);
	}
	.asset-menu button:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}
	.generation-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 2px 0;
	}
	.generation-actions {
		position: relative;
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.generation-meta strong {
		min-width: 0;
		flex: 1;
		overflow: hidden;
		font-size: 13px;
		font-weight: 680;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.generation-meta time {
		color: var(--muted);
		font-size: 11px;
	}
	.generation-meta time {
		display: flex;
		align-items: center;
		gap: 4px;
		white-space: nowrap;
	}
	.generating-state {
		position: relative;
		display: flex;
		height: 100%;
		padding: 20px;
		flex-direction: column;
		background: linear-gradient(145deg, #e8e6e0, #dcd9d2);
		border-radius: inherit;
		overflow: hidden;
	}
	.render-orbit {
		position: absolute;
		top: 18px;
		right: 18px;
		display: grid;
		width: 38px;
		height: 38px;
		place-items: center;
		border-radius: 50%;
		color: var(--accent);
		background: rgb(255 255 255 / 72%);
		box-shadow: 0 8px 20px rgb(28 28 31 / 10%);
	}
	.render-orbit :global(svg) {
		animation: spin 1.2s linear infinite;
	}
	.prompt-only-state {
		display: flex;
		height: 100%;
		padding: 24px;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		color: var(--muted);
		background: #ebe9e3;
		text-align: center;
		border-radius: inherit;
		overflow: hidden;
	}
	.prompt-only-state strong {
		margin: 9px 0 4px;
		color: var(--ink-2);
		font-size: 14px;
	}
	.prompt-only-state span {
		max-width: 210px;
		font-size: 12px;
		line-height: 1.4;
	}
	.prompt-only-state button {
		margin-top: 12px;
		padding: 7px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		color: var(--ink);
		background: white;
		font-size: 12px;
		font-weight: 680;
	}
	.shimmer {
		width: 62%;
		height: 9px;
		margin-bottom: 8px;
		border-radius: 4px;
		background: linear-gradient(90deg, #d1cec7, #eceae5, #d1cec7);
		background-size: 200% 100%;
		animation: shimmer 1.6s infinite;
	}
	.shimmer.short {
		width: 38%;
	}
	.shimmer.block {
		width: 100%;
		height: 82px;
		margin-top: 12px;
	}
	.generating-state span {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: auto;
		color: #77746e;
		font-size: 11px;
		font-weight: 620;
	}
	.generating-state span i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--accent);
		animation: pulse 1.4s infinite;
	}
	.error-state {
		display: flex;
		height: 100%;
		padding: 24px;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		color: #a8493a;
		background: #f3e6e2;
		border-radius: inherit;
		overflow: hidden;
	}
	.error-state span {
		margin: 9px 0 4px;
		font-size: 13px;
		font-weight: 680;
	}
	.error-state small {
		display: -webkit-box;
		overflow: hidden;
		color: #9c7068;
		font-size: 11px;
		line-height: 1.4;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}
	.retry {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 8px;
		padding: 5px 8px;
		border: 1px solid var(--line);
		border-radius: 8px;
		color: var(--muted);
		background: transparent;
		font-size: 11px;
		font-weight: 650;
	}
	@keyframes shimmer {
		to {
			background-position: -200% 0;
		}
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes pulse {
		50% {
			opacity: 0.45;
			box-shadow: 0 0 0 5px rgb(255 89 60 / 10%);
		}
	}
</style>
