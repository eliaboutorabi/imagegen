<script lang="ts">
	import { Check, Dices, Sparkles } from '@lucide/svelte';
	import { STYLE_OPTIONS } from '$lib/studio/styles';
	import type { StyleId } from '$lib/studio/types';

	let {
		selected,
		customDirection,
		connected,
		onSelect,
		onCustomDirection
	}: {
		selected: StyleId | null;
		customDirection: string;
		connected: boolean;
		onSelect: (style: StyleId) => void;
		onCustomDirection: (value: string) => void;
	} = $props();

	let rolling = $state(false);

	function surpriseMe() {
		rolling = true;
		const choices = STYLE_OPTIONS.filter((style) => style.id !== selected);
		const next = choices[Math.floor(Math.random() * choices.length)];
		setTimeout(() => {
			onSelect(next.id);
			rolling = false;
		}, 420);
	}
</script>

<section class="style-widget" aria-labelledby="style-heading">
	<div class="widget-head">
		<div>
			<div class="eyebrow"><Sparkles size={12} /> Creative direction</div>
			<h3 id="style-heading">Choose an information strategy</h3>
		</div>
		<button class:rolling class="surprise" type="button" onclick={surpriseMe}>
			<Dices size={15} />
			Shuffle
		</button>
	</div>

	<div class="style-grid">
		{#each STYLE_OPTIONS as style, index (style.id)}
			<button
				type="button"
				class:selected={selected === style.id}
				class="style-card"
				onclick={() => onSelect(style.id)}
				aria-pressed={selected === style.id}
			>
				<div
					class="style-preview"
					style={`--c1:${style.colors[0]};--c2:${style.colors[1]};--c3:${style.colors[2]}`}
				>
					{#if index === 0}
						<span class="type-big">Aa</span><span class="rule"></span><span class="dot"></span>
					{:else if index === 1}
						<span class="grid-line one"></span><span class="grid-line two"></span><span
							class="square"
						></span>
					{:else if index === 2}
						<span class="orb one"></span><span class="orb two"></span><span class="soft-pill"
						></span>
					{:else if index === 3}
						<span class="bars"></span><span class="noir-ring"></span><span class="noir-label"
							>04</span
						>
					{:else if index === 4}
						<span class="play-circle"></span><span class="play-zig">↗</span><span class="play-pill"
						></span>
					{:else}
						<span class="leaf one"></span><span class="leaf two"></span><span class="stem"></span>
					{/if}
					{#if selected === style.id}<span class="check"><Check size={11} strokeWidth={3} /></span
						>{/if}
				</div>
				<strong>{style.name}</strong>
				<small>{style.description}</small>
			</button>
		{/each}
	</div>

	<label class="custom-direction">
		<span>Optional art direction</span>
		<input
			value={customDirection}
			oninput={(event) => onCustomDirection(event.currentTarget.value)}
			placeholder="e.g. museum wayfinding, cobalt and cream, no gradients"
		/>
		<small
			>{connected
				? 'The text model interprets this brief and writes new prompts—these are strategy seeds, not prompt templates.'
				: 'Demo mode uses sample prompts. Connect OpenAI to have the text model write directions live.'}</small
		>
	</label>
</section>

<style>
	.style-widget {
		width: min(100%, 800px);
		padding: 22px;
		border: 1px solid var(--line);
		border-radius: 20px;
		background: rgb(255 255 255 / 82%);
		box-shadow: var(--shadow-soft);
	}

	.widget-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 15px;
	}

	.eyebrow {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-bottom: 5px;
		color: var(--muted);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}

	h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 650;
		letter-spacing: -0.03em;
	}

	.surprise {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 38px;
		padding: 0 10px;
		border: 1px solid var(--line);
		border-radius: 10px;
		color: var(--ink-2);
		background: white;
		font-size: 14px;
		font-weight: 620;
		transition: 160ms ease;
	}

	.surprise:hover {
		border-color: #cbc8c2;
		transform: translateY(-1px);
	}

	.surprise.rolling :global(svg) {
		animation: roll 420ms ease;
	}

	.style-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.custom-direction {
		display: block;
		margin-top: 16px;
		padding-top: 15px;
		border-top: 1px solid var(--line-soft);
	}
	.custom-direction > span {
		display: block;
		margin-bottom: 7px;
		color: var(--ink-2);
		font-size: 13px;
		font-weight: 650;
	}
	.custom-direction input {
		width: 100%;
		height: 43px;
		padding: 0 12px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: #fbfaf8;
		font-size: 14px;
		box-shadow: none;
	}
	.custom-direction small {
		display: block;
		margin-top: 7px;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.45;
	}

	.style-card {
		min-width: 0;
		padding: 6px 6px 10px;
		border: 1px solid transparent;
		border-radius: 14px;
		text-align: left;
		background: transparent;
		transition: 160ms ease;
	}

	.style-card:hover,
	.style-card.selected {
		border-color: #d8d5ce;
		background: white;
		box-shadow: 0 8px 22px rgb(28 30 35 / 7%);
		transform: translateY(-1px);
	}

	.style-preview {
		position: relative;
		height: 96px;
		margin-bottom: 8px;
		overflow: hidden;
		border-radius: 10px;
		background: var(--c1);
	}

	.style-card strong,
	.style-card small {
		display: block;
		padding: 0 4px;
	}

	.style-card strong {
		margin-bottom: 2px;
		font-size: 14px;
		font-weight: 680;
		letter-spacing: -0.015em;
	}

	.style-card small {
		overflow: hidden;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.3;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.check {
		position: absolute;
		top: 7px;
		right: 7px;
		display: grid;
		width: 18px;
		height: 18px;
		place-items: center;
		border-radius: 50%;
		color: white;
		background: var(--ink);
	}

	.type-big {
		position: absolute;
		bottom: 8px;
		left: 10px;
		color: var(--c3);
		font-family: Georgia, serif;
		font-size: 29px;
		font-weight: 700;
		letter-spacing: -0.08em;
	}
	.rule {
		position: absolute;
		top: 16px;
		left: 10px;
		width: 52%;
		height: 5px;
		background: var(--c2);
	}
	.dot {
		position: absolute;
		right: 10px;
		bottom: 10px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--c2);
	}
	.grid-line {
		position: absolute;
		inset: 0 auto 0 32%;
		width: 1px;
		background: rgb(20 20 20 / 16%);
	}
	.grid-line.two {
		left: 67%;
	}
	.square {
		position: absolute;
		right: 13px;
		top: 14px;
		width: 31px;
		height: 31px;
		background: var(--c2);
	}
	.orb {
		position: absolute;
		width: 49px;
		height: 49px;
		border-radius: 50%;
		filter: blur(1px);
		background: var(--c2);
		opacity: 0.88;
	}
	.orb.one {
		left: 10px;
		top: 10px;
	}
	.orb.two {
		right: -7px;
		bottom: -11px;
		background: var(--c3);
	}
	.soft-pill {
		position: absolute;
		left: 46px;
		bottom: 11px;
		width: 57px;
		height: 12px;
		border-radius: 999px;
		background: white;
		opacity: 0.75;
	}
	.bars {
		position: absolute;
		left: 12px;
		bottom: 12px;
		width: 64px;
		height: 42px;
		background: repeating-linear-gradient(90deg, var(--c2) 0 7px, transparent 7px 13px);
		clip-path: polygon(
			0 100%,
			0 60%,
			18% 60%,
			18% 30%,
			38% 30%,
			38% 72%,
			58% 72%,
			58% 0,
			78% 0,
			78% 45%,
			100% 45%,
			100% 100%
		);
	}
	.noir-ring {
		position: absolute;
		right: -12px;
		top: -8px;
		width: 54px;
		height: 54px;
		border: 10px solid var(--c3);
		border-radius: 50%;
		opacity: 0.8;
	}
	.noir-label {
		position: absolute;
		right: 12px;
		bottom: 9px;
		color: var(--c2);
		font-size: 13px;
		font-weight: 800;
	}
	.play-circle {
		position: absolute;
		left: 11px;
		top: 10px;
		width: 31px;
		height: 31px;
		border-radius: 50%;
		background: var(--c2);
	}
	.play-zig {
		position: absolute;
		right: 12px;
		top: 7px;
		color: var(--c3);
		font-size: 31px;
		font-weight: 800;
	}
	.play-pill {
		position: absolute;
		left: 38px;
		bottom: 12px;
		width: 62px;
		height: 16px;
		border-radius: 999px;
		background: var(--c3);
		transform: rotate(-6deg);
	}
	.leaf {
		position: absolute;
		width: 37px;
		height: 55px;
		border-radius: 100% 0 100% 0;
		background: var(--c2);
		opacity: 0.9;
	}
	.leaf.one {
		left: 23px;
		top: 8px;
		transform: rotate(-18deg);
	}
	.leaf.two {
		left: 57px;
		top: 20px;
		transform: rotate(72deg);
		background: var(--c3);
	}
	.stem {
		position: absolute;
		left: 56px;
		top: 17px;
		width: 2px;
		height: 62px;
		background: var(--c2);
		transform: rotate(-25deg);
		transform-origin: top;
	}

	@keyframes roll {
		50% {
			transform: rotate(115deg) scale(1.2);
		}
	}

	@media (max-width: 620px) {
		.style-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.surprise {
			font-size: 0;
		}
	}
</style>
