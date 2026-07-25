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
			<p>
				Pick how the idea should be organized. The model will turn this into a unique art direction.
			</p>
		</div>
		<button class:rolling class="surprise" type="button" onclick={surpriseMe}>
			<Dices size={15} />
			Shuffle
		</button>
	</div>

	<div class="style-grid">
		{#each STYLE_OPTIONS as style (style.id)}
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
					{#if style.id === 'editorial'}
						<div class="mini-page editorial">
							<div class="mini-kicker">FIELD NOTE · 01</div>
							<div class="editorial-grid">
								<div>
									<div class="editorial-title">A story<br />in signals.</div>
									<div class="copy-lines"><i></i><i></i><i></i></div>
								</div>
								<div class="editorial-stat">
									<span>68%</span>
									<small>clearer when<br />a story leads</small>
								</div>
							</div>
							<div class="mini-footer"><span>INSIGHT</span><i></i><b>04</b></div>
						</div>
					{:else if style.id === 'swiss'}
						<div class="mini-page analysis">
							<div class="analysis-head">
								<span>QUARTERLY SIGNALS</span><b>2026</b>
							</div>
							<div class="kpis">
								<div><small>REACH</small><strong>84.2</strong><em>+12%</em></div>
								<div><small>DEPTH</small><strong>63.8</strong><em>+08%</em></div>
							</div>
							<div class="chart">
								<div class="chart-axis"><span>80</span><span>40</span><span>0</span></div>
								<div class="chart-bars">
									<i style="height:34%"></i><i style="height:58%"></i><i style="height:46%"></i><i
										style="height:78%"
									></i><i style="height:64%"></i><i style="height:92%"></i>
								</div>
							</div>
						</div>
					{:else if style.id === 'soft-tech'}
						<div class="mini-page systems">
							<div class="systems-head"><span>HOW IT FLOWS</span><b>5 nodes</b></div>
							<svg viewBox="0 0 300 126" role="img" aria-label="Connected systems map">
								<path d="M50 61 C92 10 117 15 151 45 S217 95 257 61" />
								<path d="M50 61 C95 105 118 110 151 78 S212 26 257 61" />
								<path d="M151 45 L151 78" />
							</svg>
							<span class="system-node input">Input<small>01</small></span>
							<span class="system-node logic">Logic<small>02</small></span>
							<span class="system-node model">Model<small>03</small></span>
							<span class="system-node signal">Signal<small>04</small></span>
							<span class="system-node output">Output<small>05</small></span>
						</div>
					{:else if style.id === 'data-noir'}
						<div class="mini-page executive">
							<div class="executive-head"><span>EXECUTIVE PULSE</span><b>LIVE</b></div>
							<div class="executive-main">
								<div>
									<small>GROWTH INDEX</small><strong>+24.8%</strong><em>↑ 6.2 this quarter</em>
								</div>
								<svg viewBox="0 0 130 48" role="img" aria-label="Upward trend chart">
									<path d="M2 41 L26 33 L45 36 L66 19 L86 24 L108 8 L128 11" />
									<circle cx="108" cy="8" r="3" />
								</svg>
							</div>
							<div class="executive-row"><span>Momentum</span><i></i><b>Strong</b></div>
							<div class="executive-row"><span>Confidence</span><i></i><b>High</b></div>
						</div>
					{:else if style.id === 'playful'}
						<div class="mini-page playful">
							<div class="playful-head"><span>BIG IDEAS, MADE SIMPLE</span><b>✦</b></div>
							<div class="idea-orbit">
								<span class="idea-core">IDEA</span>
								<i class="orbit one"></i><i class="orbit two"></i><i class="orbit three"></i>
							</div>
							<div class="steps">
								<span><b>1</b>Notice</span><i>→</i><span><b>2</b>Connect</span><i>→</i><span
									><b>3</b>Share</span
								>
							</div>
						</div>
					{:else}
						<div class="mini-page adaptive">
							<div class="adaptive-label"><Sparkles size={10} /> MODEL ART DIRECTION</div>
							<div class="adaptive-cards">
								<div class="adaptive-card narrative-card"><b>Aa</b><i></i><i></i></div>
								<div class="adaptive-card data-card"><i></i><i></i><i></i><i></i></div>
								<div class="adaptive-card map-card"><span></span><span></span><span></span></div>
							</div>
							<div class="adaptive-footer"><span>Topic-aware composition</span><b>AI</b></div>
						</div>
					{/if}
					{#if selected === style.id}<span class="check"><Check size={11} strokeWidth={3} /></span
						>{/if}
				</div>
				<div class="card-copy">
					<div class="strategy-row">
						<span>{style.strategy}</span>
						<div class="swatches" aria-hidden="true">
							{#each style.colors as color (color)}<i style={`background:${color}`}></i>{/each}
						</div>
					</div>
					<strong>{style.name}</strong>
					<p>{style.description}</p>
					<small>{style.bestFor}</small>
				</div>
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
		width: min(100%, 960px);
		padding: 26px;
		border: 1px solid var(--line);
		border-radius: 24px;
		background: rgb(255 255 255 / 82%);
		box-shadow: var(--shadow-soft);
	}

	.widget-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 20px;
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
		font-size: 22px;
		font-weight: 650;
		letter-spacing: -0.035em;
	}

	.widget-head p {
		max-width: 580px;
		margin: 7px 0 0;
		color: var(--muted);
		font-size: 14px;
		line-height: 1.45;
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
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
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
		padding: 7px 7px 14px;
		border: 1px solid var(--line-soft);
		border-radius: 18px;
		text-align: left;
		background: rgb(255 255 255 / 42%);
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease,
			background 180ms ease;
	}

	.style-card:hover,
	.style-card.selected {
		border-color: #c9c6bf;
		background: white;
		box-shadow: 0 14px 32px rgb(28 30 35 / 9%);
		transform: translateY(-2px);
	}

	.style-card.selected {
		border-color: var(--ink);
		box-shadow:
			0 0 0 1px var(--ink),
			0 14px 32px rgb(28 30 35 / 9%);
	}

	.style-preview {
		position: relative;
		height: 164px;
		margin-bottom: 13px;
		overflow: hidden;
		border-radius: 13px;
		background: var(--c1);
		box-shadow: inset 0 0 0 1px rgb(20 20 20 / 7%);
	}

	.card-copy {
		padding: 0 7px;
	}

	.strategy-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 6px;
	}

	.strategy-row > span {
		color: var(--muted);
		font-size: 10px;
		font-weight: 760;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.swatches {
		display: flex;
		align-items: center;
	}

	.swatches i {
		width: 14px;
		height: 14px;
		margin-left: -3px;
		border: 2px solid white;
		border-radius: 50%;
		box-shadow: 0 0 0 1px rgb(20 20 20 / 8%);
	}

	.card-copy > strong {
		display: block;
		margin-bottom: 3px;
		font-size: 16px;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.card-copy > p {
		margin: 0 0 7px;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.38;
	}

	.card-copy > small {
		display: block;
		color: var(--ink-2);
		font-size: 11px;
		font-weight: 650;
		letter-spacing: 0.015em;
	}

	.check {
		position: absolute;
		top: 10px;
		right: 10px;
		display: grid;
		width: 23px;
		height: 23px;
		place-items: center;
		border: 2px solid rgb(255 255 255 / 88%);
		border-radius: 50%;
		color: white;
		background: var(--ink);
		box-shadow: 0 4px 12px rgb(0 0 0 / 18%);
		z-index: 5;
	}

	.mini-page {
		position: absolute;
		inset: 0;
		padding: 16px 18px;
		color: #151515;
		font-family: Arial, Helvetica, sans-serif;
	}

	.mini-kicker,
	.analysis-head,
	.systems-head,
	.executive-head,
	.playful-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 7px;
		font-weight: 800;
		letter-spacing: 0.15em;
	}

	/* Editorial: headline-led storytelling with a hero statistic. */
	.editorial {
		background:
			linear-gradient(90deg, transparent 49.8%, rgb(20 20 20 / 10%) 50%, transparent 50.2%),
			var(--c1);
	}

	.mini-kicker {
		padding-bottom: 9px;
		border-bottom: 2px solid var(--c2);
		color: var(--c2);
	}

	.editorial-grid {
		display: grid;
		grid-template-columns: 1.25fr 0.75fr;
		gap: 15px;
		padding-top: 12px;
	}

	.editorial-title {
		display: block;
		font-family: Georgia, serif;
		font-size: 22px;
		font-weight: 700;
		line-height: 0.88;
		letter-spacing: -0.06em;
	}

	.copy-lines {
		display: grid;
		gap: 3px;
		width: 72%;
		margin-top: 9px;
	}

	.copy-lines i {
		height: 2px;
		background: rgb(20 20 20 / 28%);
	}

	.copy-lines i:last-child {
		width: 65%;
	}

	.editorial-stat {
		padding-top: 7px;
		border-top: 1px solid #151515;
		text-align: right;
	}

	.editorial-stat span {
		display: block;
		color: var(--c2);
		font-family: Georgia, serif;
		font-size: 25px;
		font-weight: 700;
		line-height: 1;
	}

	.editorial-stat small {
		display: block;
		margin-top: 5px;
		font-size: 7px;
		font-weight: 700;
		line-height: 1.15;
	}

	.mini-footer {
		position: absolute;
		right: 18px;
		bottom: 11px;
		left: 18px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 6px;
		font-weight: 800;
		letter-spacing: 0.13em;
	}

	.mini-footer i {
		flex: 1;
		height: 1px;
		background: rgb(20 20 20 / 24%);
	}

	.mini-footer b {
		color: var(--c2);
	}

	/* Data: numerical evidence, KPIs, and a readable chart. */
	.analysis {
		background:
			linear-gradient(rgb(20 20 20 / 5%) 1px, transparent 1px),
			linear-gradient(90deg, rgb(20 20 20 / 5%) 1px, transparent 1px), var(--c1);
		background-size: 24px 24px;
	}

	.analysis-head {
		padding-bottom: 8px;
		border-bottom: 1px solid #151515;
	}

	.analysis-head b {
		color: var(--c2);
	}

	.kpis {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
		margin-top: 8px;
	}

	.kpis > div {
		position: relative;
		padding: 6px 7px;
		border: 1px solid rgb(20 20 20 / 15%);
		background: rgb(255 255 255 / 68%);
	}

	.kpis small,
	.kpis strong,
	.kpis em {
		display: block;
	}

	.kpis small {
		font-size: 6px;
		font-weight: 800;
		letter-spacing: 0.1em;
	}

	.kpis strong {
		margin-top: 2px;
		font-size: 16px;
		line-height: 1;
		letter-spacing: -0.05em;
	}

	.kpis em {
		position: absolute;
		right: 6px;
		bottom: 5px;
		color: var(--c2);
		font-size: 6px;
		font-style: normal;
		font-weight: 800;
	}

	.chart {
		display: flex;
		height: 58px;
		margin-top: 8px;
		padding-top: 4px;
		border-top: 1px solid rgb(20 20 20 / 22%);
	}

	.chart-axis {
		display: flex;
		width: 20px;
		flex-direction: column;
		justify-content: space-between;
		padding-bottom: 3px;
		color: rgb(20 20 20 / 48%);
		font-size: 5px;
	}

	.chart-bars {
		display: flex;
		flex: 1;
		align-items: flex-end;
		justify-content: space-around;
		border-bottom: 1px solid rgb(20 20 20 / 20%);
	}

	.chart-bars i {
		width: 11%;
		background: var(--c2);
	}

	.chart-bars i:nth-child(odd) {
		background: var(--c3);
	}

	/* Systems: an explicit connected-node architecture map. */
	.systems {
		background:
			radial-gradient(circle at 16px 16px, rgb(113 89 255 / 12%) 1.4px, transparent 1.6px),
			var(--c1);
		background-size: 16px 16px;
	}

	.systems-head b {
		padding: 3px 7px;
		border-radius: 999px;
		color: white;
		background: var(--c2);
		letter-spacing: 0;
	}

	.systems svg {
		position: absolute;
		inset: 28px 13px 3px;
		width: calc(100% - 26px);
		height: calc(100% - 31px);
		overflow: visible;
	}

	.systems path {
		fill: none;
		stroke: var(--c2);
		stroke-dasharray: 3 3;
		stroke-width: 1.5;
	}

	.system-node {
		position: absolute;
		display: flex;
		width: 49px;
		height: 29px;
		align-items: center;
		justify-content: center;
		border: 1px solid rgb(20 20 20 / 14%);
		border-radius: 8px;
		background: rgb(255 255 255 / 90%);
		box-shadow: 0 5px 12px rgb(40 40 50 / 10%);
		font-size: 7px;
		font-weight: 800;
	}

	.system-node small {
		position: absolute;
		top: -6px;
		right: -5px;
		display: grid;
		width: 14px;
		height: 14px;
		place-items: center;
		border-radius: 50%;
		color: #151515;
		background: var(--c3);
		font-size: 5px;
	}

	.system-node.input {
		top: 75px;
		left: 17px;
	}

	.system-node.logic {
		top: 41px;
		left: 34%;
	}

	.system-node.model {
		bottom: 16px;
		left: 34%;
	}

	.system-node.signal {
		top: 41px;
		right: 31%;
	}

	.system-node.output {
		top: 75px;
		right: 17px;
		color: white;
		background: var(--c2);
	}

	/* Executive: a compact dark brief optimized for fast decisions. */
	.executive {
		color: #f5f6f1;
		background:
			radial-gradient(circle at 85% 20%, rgb(119 102 255 / 28%), transparent 35%), var(--c1);
	}

	.executive-head {
		padding-bottom: 8px;
		border-bottom: 1px solid rgb(255 255 255 / 18%);
	}

	.executive-head b {
		padding: 3px 6px;
		border-radius: 999px;
		color: #10110e;
		background: var(--c2);
		font-size: 6px;
		letter-spacing: 0.08em;
	}

	.executive-main {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: end;
		gap: 12px;
		padding: 12px 0 8px;
	}

	.executive-main small,
	.executive-main strong,
	.executive-main em {
		display: block;
	}

	.executive-main small {
		color: rgb(255 255 255 / 55%);
		font-size: 6px;
		font-weight: 800;
		letter-spacing: 0.12em;
	}

	.executive-main strong {
		margin: 3px 0;
		color: var(--c2);
		font-size: 23px;
		letter-spacing: -0.06em;
	}

	.executive-main em {
		color: rgb(255 255 255 / 62%);
		font-size: 6px;
		font-style: normal;
	}

	.executive-main svg path {
		fill: none;
		stroke: var(--c2);
		stroke-width: 2;
	}

	.executive-main svg circle {
		fill: var(--c2);
	}

	.executive-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 0;
		border-top: 1px solid rgb(255 255 255 / 12%);
		font-size: 6px;
	}

	.executive-row i {
		flex: 1;
		height: 3px;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--c3) 72%, rgb(255 255 255 / 12%) 72%);
	}

	.executive-row b {
		color: var(--c2);
		text-transform: uppercase;
	}

	/* Playful: metaphor, illustration, and a simple teaching sequence. */
	.playful {
		background:
			radial-gradient(circle at 18% 80%, rgb(255 109 138 / 16%) 0 25px, transparent 26px), var(--c1);
	}

	.playful-head b {
		display: grid;
		width: 20px;
		height: 20px;
		place-items: center;
		border-radius: 50%;
		color: white;
		background: var(--c2);
		font-size: 11px;
	}

	.idea-orbit {
		position: relative;
		height: 82px;
	}

	.idea-core {
		position: absolute;
		top: 17px;
		left: 50%;
		display: grid;
		width: 55px;
		height: 55px;
		place-items: center;
		border: 3px solid #151515;
		border-radius: 48% 52% 45% 55%;
		color: white;
		background: var(--c2);
		box-shadow: 6px 6px 0 var(--c3);
		font-size: 9px;
		font-weight: 900;
		transform: translateX(-50%) rotate(-4deg);
	}

	.orbit {
		position: absolute;
		width: 11px;
		height: 11px;
		border: 2px solid #151515;
		border-radius: 50%;
		background: var(--c3);
	}

	.orbit.one {
		top: 12px;
		left: 25%;
	}

	.orbit.two {
		top: 29px;
		right: 23%;
		width: 15px;
		height: 8px;
		border-radius: 999px;
		background: var(--c2);
		transform: rotate(18deg);
	}

	.orbit.three {
		bottom: 2px;
		left: 30%;
		background: #ffd75e;
	}

	.steps {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 4px;
	}

	.steps span {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 6px;
		font-weight: 800;
	}

	.steps span b {
		display: grid;
		width: 15px;
		height: 15px;
		place-items: center;
		border-radius: 5px;
		color: white;
		background: var(--c3);
		font-size: 7px;
	}

	.steps i {
		color: var(--c2);
		font-size: 10px;
		font-style: normal;
		font-weight: 900;
	}

	/* Adaptive: a model-generated blend of information strategies. */
	.adaptive {
		background:
			radial-gradient(circle at 82% 14%, rgb(212 134 90 / 30%), transparent 31%),
			linear-gradient(145deg, var(--c1), #f7f4e9);
	}

	.adaptive-label {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 7px;
		border-radius: 999px;
		color: white;
		background: var(--c2);
		font-size: 6px;
		font-weight: 800;
		letter-spacing: 0.1em;
	}

	.adaptive-cards {
		position: relative;
		height: 91px;
		margin-top: 6px;
	}

	.adaptive-card {
		position: absolute;
		top: 5px;
		left: 50%;
		width: 92px;
		height: 76px;
		padding: 9px;
		border: 1px solid rgb(20 20 20 / 15%);
		border-radius: 6px;
		background: #fffef9;
		box-shadow: 0 9px 22px rgb(50 45 35 / 14%);
	}

	.narrative-card {
		transform: translateX(-105%) rotate(-8deg);
	}

	.narrative-card b {
		display: block;
		margin-bottom: 9px;
		color: var(--c2);
		font-family: Georgia, serif;
		font-size: 19px;
		line-height: 1;
	}

	.narrative-card i {
		display: block;
		width: 86%;
		height: 2px;
		margin-top: 5px;
		background: rgb(20 20 20 / 24%);
	}

	.data-card {
		z-index: 2;
		display: flex;
		align-items: flex-end;
		justify-content: space-around;
		transform: translateX(-50%);
	}

	.data-card i {
		width: 12px;
		background: var(--c2);
	}

	.data-card i:nth-child(1) {
		height: 28%;
	}

	.data-card i:nth-child(2) {
		height: 57%;
		background: var(--c3);
	}

	.data-card i:nth-child(3) {
		height: 43%;
	}

	.data-card i:nth-child(4) {
		height: 78%;
		background: var(--c3);
	}

	.map-card {
		transform: translateX(5%) rotate(8deg);
	}

	.map-card span {
		position: absolute;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--c2);
	}

	.map-card span:nth-child(1) {
		top: 12px;
		left: 12px;
	}

	.map-card span:nth-child(2) {
		top: 29px;
		right: 12px;
		background: var(--c3);
	}

	.map-card span:nth-child(3) {
		bottom: 9px;
		left: 29px;
		width: 13px;
		height: 13px;
		background: var(--c2);
	}

	.adaptive-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 6px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.adaptive-footer b {
		display: grid;
		width: 21px;
		height: 21px;
		place-items: center;
		border-radius: 50%;
		color: white;
		background: var(--c2);
		font-size: 7px;
	}

	@keyframes roll {
		50% {
			transform: rotate(115deg) scale(1.2);
		}
	}

	@media (max-width: 720px) {
		.style-widget {
			padding: 18px;
		}

		.style-grid {
			grid-template-columns: 1fr;
		}

		.widget-head p {
			display: none;
		}

		.surprise {
			font-size: 0;
		}
	}
</style>
