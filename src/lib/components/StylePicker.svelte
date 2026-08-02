<script lang="ts">
	import { Bookmark, Check, Dices, Images, Sparkles } from '@lucide/svelte';
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
	let shortlisted = $state<StyleId[]>([]);
	let previewStyle = $derived(
		STYLE_OPTIONS.find((style) => style.id === previewed) ?? STYLE_OPTIONS[0]
	);
	let previewIsShortlisted = $derived(shortlisted.includes(previewStyle.id));
	let shortlistedStyles = $derived(
		shortlisted
			.map((styleId) => STYLE_OPTIONS.find((style) => style.id === styleId))
			.filter((style) => style !== undefined)
	);

	$effect(() => {
		if (selected) previewed = selected;
	});

	function showPreview(styleId: StyleId) {
		previewed = styleId;
	}

	function toggleShortlist(styleId: StyleId) {
		shortlisted = shortlisted.includes(styleId)
			? shortlisted.filter((candidate) => candidate !== styleId)
			: [...shortlisted, styleId];
	}

	function surpriseMe() {
		rolling = true;
		const choices = STYLE_OPTIONS.filter((style) => style.id !== previewed);
		const next = choices[Math.floor(Math.random() * choices.length)];
		previewed = next.id;
		setTimeout(() => (rolling = false), 480);
	}
</script>

<section class="style-widget" aria-labelledby="style-heading">
	<div class="widget-head">
		<div>
			<div class="eyebrow"><Sparkles size={13} /> Creative direction</div>
			<h3 id="style-heading">Choose a visual language</h3>
			<p>Click to preview, shortlist a few favorites, then choose one when you are ready.</p>
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
					<img class="preview-backdrop" src={previewStyle.image} alt="" aria-hidden="true" />
					<img
						class="preview-main"
						src={previewStyle.image}
						alt={`${previewStyle.name} infographic style preview`}
					/>
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
				<div class="preview-actions">
					<button
						type="button"
						class:saved={previewIsShortlisted}
						class="save-style"
						onclick={() => toggleShortlist(previewStyle.id)}
						aria-pressed={previewIsShortlisted}
					>
						<Bookmark size={13} fill={previewIsShortlisted ? 'currentColor' : 'none'} />
						{previewIsShortlisted ? 'Shortlisted' : 'Shortlist'}
					</button>
					<button class="use-style" type="button" onclick={() => onSelect(previewStyle.id)}>
						Use this style
						<Check size={13} strokeWidth={2.5} />
					</button>
				</div>
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
					onclick={() => showPreview(style.id)}
					aria-pressed={previewed === style.id}
					aria-label={`Preview ${style.name} style`}
				>
					<span class="tile-image">
						<img src={style.image} alt="" loading={index < 6 ? 'eager' : 'lazy'} decoding="async" />
						{#if selected === style.id}
							<span class="check"><Check size={12} strokeWidth={3} /></span>
						{:else if shortlisted.includes(style.id)}
							<span class="saved-marker"><Bookmark size={11} fill="currentColor" /></span>
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

	{#if shortlistedStyles.length > 0}
		<div class="shortlist-bar" aria-label="Shortlisted styles">
			<span class="shortlist-label"><Bookmark size={13} fill="currentColor" /> Shortlist</span>
			<div class="shortlist-chips">
				{#each shortlistedStyles as style (style.id)}
					<button
						type="button"
						class:active={previewed === style.id}
						onclick={() => showPreview(style.id)}
					>
						<span style={`background-image:url(${style.image})`}></span>
						{style.name}
					</button>
				{/each}
			</div>
		</div>
	{/if}

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
		grid-template-columns: minmax(270px, 0.9fr) minmax(0, 1.45fr);
		height: 430px;
		align-items: stretch;
		gap: 10px;
		padding: 10px;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 19px;
		background: var(--picker-card-muted);
	}

	.preview-stage {
		position: relative;
		display: grid;
		height: 100%;
		min-height: 0;
		grid-template-rows: minmax(0, 1fr) auto;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: 13px;
		background: var(--picker-card);
		box-shadow: 0 10px 25px rgb(25 25 30 / 7%);
	}

	.preview-art {
		position: relative;
		min-height: 0;
		overflow: hidden;
		background: #17181b;
	}

	.preview-art .preview-backdrop,
	.preview-art .preview-main {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
	}

	.preview-art .preview-backdrop {
		object-fit: cover;
		filter: blur(18px) saturate(0.85) brightness(0.68);
		transform: scale(1.14);
	}

	.preview-art .preview-main {
		z-index: 1;
		object-fit: contain;
		filter: drop-shadow(0 8px 20px rgb(0 0 0 / 24%));
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
		z-index: 2;
	}

	.preview-copy {
		display: flex;
		min-height: 0;
		flex-direction: column;
		padding: 14px 15px 15px;
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
		margin: 0 0 8px;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.42;
	}

	.preview-copy small {
		display: block;
		margin-top: 0;
		padding-top: 10px;
		border-top: 1px solid var(--line-soft);
		color: var(--ink-2);
		font-size: 11px;
		font-weight: 630;
	}

	.preview-actions {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 7px;
		margin-top: 11px;
	}

	.save-style,
	.use-style {
		display: inline-flex;
		height: 35px;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 0 10px;
		border: 1px solid var(--line);
		border-radius: 9px;
		font-size: 11px;
		font-weight: 700;
		white-space: nowrap;
		transition: 150ms ease;
	}

	.save-style {
		color: var(--ink-2);
		background: var(--picker-card-muted);
	}

	.save-style.saved {
		border-color: color-mix(in srgb, var(--ink) 28%, var(--line));
		color: var(--ink);
		background: var(--picker-card);
	}

	.use-style {
		border-color: var(--ink);
		color: var(--picker-card);
		background: var(--ink);
	}

	.save-style:hover,
	.use-style:hover {
		transform: translateY(-1px);
	}

	.style-grid {
		display: grid;
		height: 100%;
		min-height: 0;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		grid-template-rows: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}

	.style-tile {
		position: relative;
		min-width: 0;
		min-height: 0;
		padding: 3px;
		overflow: hidden;
		border: 1px solid var(--line-soft);
		border-radius: 11px;
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
		box-shadow: 0 8px 18px rgb(25 25 30 / 12%);
		transform: translateY(-1px);
	}

	.style-tile.selected {
		border-color: var(--ink);
		box-shadow: 0 0 0 1px var(--ink);
	}

	.tile-image {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		overflow: hidden;
		border-radius: 8px;
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
		position: absolute;
		right: 3px;
		bottom: 3px;
		left: 3px;
		z-index: 2;
		display: block;
		padding: 22px 7px 6px;
		border-radius: 0 0 8px 8px;
		color: white;
		background: linear-gradient(transparent, rgb(8 9 12 / 82%));
		pointer-events: none;
	}

	.tile-copy strong,
	.tile-copy small {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tile-copy strong {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: -0.015em;
		text-shadow: 0 1px 4px rgb(0 0 0 / 45%);
	}

	.tile-copy small {
		margin-top: 1px;
		color: rgb(255 255 255 / 72%);
		font-size: 7px;
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

	.saved-marker {
		position: absolute;
		top: 6px;
		right: 6px;
		display: grid;
		width: 22px;
		height: 22px;
		place-items: center;
		border: 1px solid rgb(255 255 255 / 38%);
		border-radius: 7px;
		color: white;
		background: rgb(15 16 19 / 72%);
		backdrop-filter: blur(6px);
		box-shadow: 0 4px 10px rgb(0 0 0 / 22%);
	}

	.shortlist-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 12px;
		padding: 8px 10px;
		overflow: hidden;
		border: 1px solid var(--line-soft);
		border-radius: 12px;
		background: var(--picker-card-muted);
	}

	.shortlist-label {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: var(--muted);
		font-size: 10px;
		font-weight: 760;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.shortlist-chips {
		display: flex;
		min-width: 0;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.shortlist-chips::-webkit-scrollbar {
		display: none;
	}

	.shortlist-chips button {
		display: inline-flex;
		height: 30px;
		align-items: center;
		gap: 6px;
		padding: 0 8px 0 4px;
		border: 1px solid var(--line);
		border-radius: 8px;
		color: var(--ink-2);
		background: var(--picker-card);
		font-size: 10px;
		font-weight: 670;
		white-space: nowrap;
	}

	.shortlist-chips button.active {
		border-color: var(--ink);
		color: var(--ink);
	}

	.shortlist-chips button span {
		width: 25px;
		height: 22px;
		border-radius: 5px;
		background-position: center;
		background-size: cover;
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
			height: auto;
		}

		.preview-stage {
			height: auto;
		}

		.style-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
			grid-template-rows: repeat(4, 92px);
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
