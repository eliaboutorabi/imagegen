<script lang="ts">
	import { Check, Dices, Images, Sparkles } from '@lucide/svelte';
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
	let previewed = $state<StyleId>(STYLE_OPTIONS[0].id);
	let previewStyle = $derived(
		STYLE_OPTIONS.find((style) => style.id === previewed) ?? STYLE_OPTIONS[0]
	);

	$effect(() => {
		if (selected) previewed = selected;
	});

	function showPreview(styleId: StyleId) {
		previewed = styleId;
	}

	function surpriseMe() {
		rolling = true;
		const choices = STYLE_OPTIONS.filter((style) => style.id !== selected);
		const next = choices[Math.floor(Math.random() * choices.length)];
		previewed = next.id;
		setTimeout(() => {
			onSelect(next.id);
			rolling = false;
		}, 480);
	}
</script>

<section class="style-widget" aria-labelledby="style-heading">
	<div class="widget-head">
		<div>
			<div class="eyebrow"><Sparkles size={13} /> Creative direction</div>
			<h3 id="style-heading">Choose a visual language</h3>
			<p>Hover or focus a tile to inspect it. Each sample was generated once and is reused here.</p>
		</div>
		<div class="head-actions">
			<span class="style-count"><Images size={14} /> {STYLE_OPTIONS.length} styles</span>
			<button class:rolling class="surprise" type="button" onclick={surpriseMe}>
				<Dices size={15} />
				Shuffle
			</button>
		</div>
	</div>

	<div class="style-browser">
		<aside class="preview-stage" aria-live="polite">
			<div class="preview-art">
				{#key previewStyle.id}
					<img src={previewStyle.image} alt={`${previewStyle.name} infographic style preview`} />
				{/key}
				<span class="sample-badge"><Sparkles size={11} /> Generated style sample</span>
			</div>

			<div class="preview-copy">
				<div class="preview-meta">
					<span>{previewStyle.strategy}</span>
					<div class="swatches" aria-label="Color palette">
						{#each previewStyle.colors as color (color)}
							<i style={`background:${color}`}></i>
						{/each}
					</div>
				</div>
				<h4>{previewStyle.name}</h4>
				<p>{previewStyle.description}</p>
				<small>Best for {previewStyle.bestFor.toLowerCase()}</small>
			</div>
		</aside>

		<div class="style-grid" aria-label="Infographic styles">
			{#each STYLE_OPTIONS as style, index (style.id)}
				<button
					type="button"
					class:selected={selected === style.id}
					class:previewing={previewed === style.id}
					class="style-tile"
					onmouseenter={() => showPreview(style.id)}
					onfocus={() => showPreview(style.id)}
					onclick={() => onSelect(style.id)}
					aria-pressed={selected === style.id}
					aria-label={`Use ${style.name} style`}
				>
					<span class="tile-image">
						<img src={style.image} alt="" loading={index < 6 ? 'eager' : 'lazy'} decoding="async" />
						{#if selected === style.id}
							<span class="check"><Check size={12} strokeWidth={3} /></span>
						{/if}
					</span>
					<span class="tile-copy">
						<strong>{style.name}</strong>
						<small>{style.strategy}</small>
					</span>
				</button>
			{/each}
		</div>
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
				? 'The text model combines your note with the selected visual language when it writes each prompt.'
				: 'Demo mode uses sample prompts. Connect OpenAI to have the text model interpret this direction.'}</small
		>
	</label>
</section>

<style>
	.style-widget {
		--picker-surface: rgb(255 255 255 / 86%);
		--picker-card: #fff;
		--picker-card-muted: #f5f4f0;
		--picker-overlay: rgb(20 20 22 / 78%);
		width: min(100%, 980px);
		padding: 25px;
		border: 1px solid var(--line);
		border-radius: 24px;
		background: var(--picker-surface);
		box-shadow: var(--shadow-soft);
	}

	:global(html[data-theme='dark']) .style-widget {
		--picker-surface: rgb(27 28 31 / 94%);
		--picker-card: #242529;
		--picker-card-muted: #1d1e21;
		--picker-overlay: rgb(8 9 11 / 82%);
	}

	.widget-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 18px;
		margin-bottom: 20px;
	}

	.eyebrow {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 6px;
		color: var(--muted);
		font-size: 12px;
		font-weight: 760;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	h3 {
		margin: 0;
		font-size: 23px;
		font-weight: 680;
		letter-spacing: -0.04em;
	}

	.widget-head p {
		max-width: 530px;
		margin: 7px 0 0;
		color: var(--muted);
		font-size: 14px;
		line-height: 1.45;
	}

	.head-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.style-count,
	.surprise {
		display: inline-flex;
		height: 38px;
		align-items: center;
		gap: 6px;
		padding: 0 11px;
		border: 1px solid var(--line);
		border-radius: 10px;
		color: var(--ink-2);
		background: var(--picker-card);
		font-size: 13px;
		font-weight: 650;
		white-space: nowrap;
	}

	.style-count {
		color: var(--muted);
	}

	.surprise {
		transition: 160ms ease;
	}

	.surprise:hover {
		border-color: var(--muted);
		transform: translateY(-1px);
	}

	.surprise.rolling :global(svg) {
		animation: roll 480ms ease;
	}

	.style-browser {
		display: grid;
		grid-template-columns: minmax(270px, 0.88fr) minmax(0, 1.35fr);
		align-items: start;
		gap: 18px;
	}

	.preview-stage {
		position: sticky;
		top: 14px;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 17px;
		background: var(--picker-card);
		box-shadow: 0 12px 30px rgb(25 25 30 / 7%);
	}

	.preview-art {
		position: relative;
		aspect-ratio: 3 / 2;
		overflow: hidden;
		background: var(--picker-card-muted);
	}

	.preview-art img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		animation: reveal 240ms ease both;
	}

	.sample-badge {
		position: absolute;
		top: 10px;
		left: 10px;
		display: inline-flex;
		height: 25px;
		align-items: center;
		gap: 5px;
		padding: 0 8px;
		border: 1px solid rgb(255 255 255 / 24%);
		border-radius: 999px;
		color: white;
		background: var(--picker-overlay);
		backdrop-filter: blur(8px);
		font-size: 9px;
		font-weight: 750;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}

	.preview-copy {
		padding: 16px 17px 17px;
	}

	.preview-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 7px;
	}

	.preview-meta > span {
		color: var(--muted);
		font-size: 10px;
		font-weight: 780;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}

	.swatches {
		display: flex;
		align-items: center;
	}

	.swatches i {
		width: 15px;
		height: 15px;
		margin-left: -3px;
		border: 2px solid var(--picker-card);
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgb(20 20 20 / 10%);
	}

	.preview-copy h4 {
		margin: 0 0 4px;
		font-size: 18px;
		font-weight: 720;
		letter-spacing: -0.025em;
	}

	.preview-copy p {
		margin: 0 0 11px;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.42;
	}

	.preview-copy small {
		display: block;
		padding-top: 10px;
		border-top: 1px solid var(--line-soft);
		color: var(--ink-2);
		font-size: 11px;
		font-weight: 630;
	}

	.style-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.style-tile {
		min-width: 0;
		padding: 5px 5px 9px;
		border: 1px solid var(--line-soft);
		border-radius: 13px;
		text-align: left;
		background: var(--picker-card-muted);
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			box-shadow 160ms ease,
			background 160ms ease;
	}

	.style-tile:hover,
	.style-tile:focus-visible,
	.style-tile.previewing {
		border-color: color-mix(in srgb, var(--ink) 34%, var(--line));
		background: var(--picker-card);
		box-shadow: 0 10px 22px rgb(25 25 30 / 9%);
		transform: translateY(-2px);
	}

	.style-tile.selected {
		border-color: var(--ink);
		box-shadow: 0 0 0 1px var(--ink);
	}

	.tile-image {
		position: relative;
		display: block;
		aspect-ratio: 3 / 2;
		overflow: hidden;
		border-radius: 9px;
		background: var(--surface);
	}

	.tile-image img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 260ms ease;
	}

	.style-tile:hover .tile-image img,
	.style-tile:focus-visible .tile-image img,
	.style-tile.previewing .tile-image img {
		transform: scale(1.035);
	}

	.tile-copy {
		display: block;
		padding: 8px 3px 0;
	}

	.tile-copy strong,
	.tile-copy small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tile-copy strong {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: -0.015em;
	}

	.tile-copy small {
		margin-top: 2px;
		color: var(--muted);
		font-size: 9px;
		font-weight: 680;
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}

	.check {
		position: absolute;
		top: 7px;
		right: 7px;
		display: grid;
		width: 23px;
		height: 23px;
		place-items: center;
		border: 2px solid rgb(255 255 255 / 88%);
		border-radius: 50%;
		color: white;
		background: #17181b;
		box-shadow: 0 4px 12px rgb(0 0 0 / 24%);
	}

	.custom-direction {
		display: block;
		margin-top: 18px;
		padding-top: 17px;
		border-top: 1px solid var(--line-soft);
	}

	.custom-direction > span {
		display: block;
		margin-bottom: 7px;
		color: var(--ink-2);
		font-size: 13px;
		font-weight: 670;
	}

	.custom-direction input {
		width: 100%;
		height: 44px;
		padding: 0 12px;
		border: 1px solid var(--line);
		border-radius: 11px;
		color: var(--ink);
		background: var(--picker-card-muted);
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

	@keyframes roll {
		50% {
			transform: rotate(125deg) scale(1.18);
		}
	}

	@keyframes reveal {
		from {
			opacity: 0.55;
			transform: scale(1.018);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (max-width: 820px) {
		.style-browser {
			grid-template-columns: 1fr;
		}

		.preview-stage {
			position: relative;
			top: auto;
		}

		.style-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	@media (max-width: 620px) {
		.style-widget {
			padding: 18px;
		}

		.widget-head p,
		.style-count {
			display: none;
		}

		.surprise {
			width: 38px;
			justify-content: center;
			padding: 0;
			font-size: 0;
		}

		.style-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
