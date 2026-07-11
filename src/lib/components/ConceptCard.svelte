<script lang="ts">
	import { ArrowUpRight, Check, Copy, Expand, LayoutTemplate } from '@lucide/svelte';
	import type { Generation, InfographicConcept } from '$lib/studio/types';

	let {
		concept,
		index,
		selected,
		thumbnail = null,
		onSelect,
		onOpenPrompt
	}: {
		concept: InfographicConcept;
		index: number;
		selected: boolean;
		thumbnail?: Generation | null;
		onSelect: () => void;
		onOpenPrompt: () => void;
	} = $props();

	let copied = $state(false);

	async function copyPrompt(event: MouseEvent) {
		event.stopPropagation();
		await navigator.clipboard.writeText(concept.prompt);
		copied = true;
		setTimeout(() => (copied = false), 1400);
	}
</script>

<article class:selected class="concept-card">
	<button class="select-area" type="button" onclick={onSelect}>
		<div class="concept-top">
			<span class="concept-number">Direction 0{index + 1}</span>
			<div class="palette" aria-label="Color palette">
				{#each concept.palette as color (color)}<i style={`background:${color}`}></i>{/each}
			</div>
		</div>
		<h4>{concept.title}</h4>
		<p class="strapline">{concept.strapline}</p>
		{#if thumbnail?.imageUrl}
			<div class="concept-thumbnail">
				<img src={thumbnail.imageUrl} alt={`Latest generation for ${concept.title}`} />
			</div>
		{/if}
		<p class="prompt">{concept.prompt}</p>
	</button>
	<div class="layout"><LayoutTemplate size={12} /><span>{concept.layout}</span></div>
	<div class="concept-footer">
		<button class="view-prompt" type="button" onclick={onOpenPrompt}
			><Expand size={13} /> Read full prompt</button
		>
		<div>
			<button class="copy" type="button" onclick={copyPrompt} aria-label="Copy prompt"
				>{#if copied}<Check size={13} />{:else}<Copy size={13} />{/if}</button
			>
			{#if selected}<span class="selected-check"><Check size={12} strokeWidth={3} /></span
				>{:else}<ArrowUpRight size={14} />{/if}
		</div>
	</div>
</article>

<style>
	.concept-card {
		display: flex;
		min-width: 0;
		min-height: 350px;
		padding: 19px;
		flex-direction: column;
		border: 1px solid var(--line);
		border-radius: 18px;
		background: white;
		box-shadow: 0 8px 25px rgb(25 25 28 / 5%);
		transition: 170ms ease;
	}
	.select-area {
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		color: inherit;
		text-align: left;
		background: transparent;
	}
	.concept-card:hover {
		border-color: #c9c6bf;
		transform: translateY(-2px);
		box-shadow: 0 13px 31px rgb(25 25 28 / 9%);
	}
	.concept-card.selected {
		border-color: var(--ink);
		box-shadow:
			0 0 0 1px var(--ink),
			0 14px 32px rgb(25 25 28 / 10%);
	}
	.concept-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.concept-number {
		color: var(--muted);
		font-family: ui-monospace, monospace;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.palette {
		display: flex;
		padding: 3px;
		border: 1px solid var(--line-soft);
		border-radius: 999px;
		background: white;
	}
	.palette i {
		width: 10px;
		height: 10px;
		margin-left: -2px;
		border: 1px solid rgb(255 255 255 / 65%);
		border-radius: 50%;
	}
	.palette i:first-child {
		margin-left: 0;
	}
	h4 {
		margin: 24px 0 5px;
		font-size: 19px;
		font-weight: 680;
		letter-spacing: -0.04em;
	}
	.strapline {
		margin: 0 0 14px;
		color: var(--ink-2);
		font-size: 13px;
		line-height: 1.45;
	}
	.concept-thumbnail {
		width: 100%;
		margin: 2px 0 14px;
		overflow: hidden;
		border: 1px solid var(--line-soft);
		border-radius: 11px;
		background: var(--surface);
	}
	.concept-thumbnail img {
		display: block;
		width: 100%;
		height: auto;
		object-fit: contain;
	}
	.prompt {
		display: -webkit-box;
		overflow: hidden;
		margin: 0;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.55;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 5;
		line-clamp: 5;
	}
	.prompt::after {
		content: '';
	}
	.layout {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: auto;
		padding-top: 14px;
		color: var(--muted);
		font-size: 11px;
	}
	.concept-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 12px;
		padding-top: 11px;
		border-top: 1px solid var(--line-soft);
		color: var(--ink-2);
	}
	.view-prompt {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0;
		border: 0;
		color: var(--ink-2);
		background: transparent;
		font-size: 12px;
		font-weight: 680;
	}
	.view-prompt:hover {
		color: var(--accent);
	}
	.concept-footer > div {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.copy {
		display: grid;
		width: 25px;
		height: 25px;
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 7px;
		color: var(--muted);
	}
	.copy:hover {
		color: var(--ink);
		background: var(--surface);
	}
	.selected-check {
		display: grid;
		width: 19px;
		height: 19px;
		place-items: center;
		border-radius: 50%;
		color: white;
		background: var(--ink);
	}
</style>
