<script lang="ts">
	import { Check, Eye, EyeOff, KeyRound, ShieldCheck, SlidersHorizontal, X } from '@lucide/svelte';
	import type { StudioSettings } from '$lib/studio/types';

	let {
		open,
		settings,
		onClose,
		onSave
	}: {
		open: boolean;
		settings: StudioSettings;
		onClose: () => void;
		onSave: (settings: StudioSettings) => void;
	} = $props();

	let draft = $state<StudioSettings>({
		apiKey: '',
		plannerModel: 'gpt-5.4',
		imageModel: 'gpt-image-2',
		quality: 'medium',
		defaultBatchSize: 4,
		autoGenerate: true,
		generationWallWidth: 420,
		theme: 'light'
	});
	let reveal = $state(false);
	let saved = $state(false);

	$effect(() => {
		if (open) draft = { ...settings };
	});

	function submit() {
		onSave({ ...draft, defaultBatchSize: Math.min(10, Math.max(1, draft.defaultBatchSize)) });
		saved = true;
		setTimeout(() => {
			saved = false;
			onClose();
		}, 500);
	}

	function onBackdrop(event: MouseEvent) {
		if (event.target === event.currentTarget) onClose();
	}
</script>

{#if open}
	<div class="settings-backdrop" role="presentation" onclick={onBackdrop}>
		<div class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-heading">
			<header>
				<div>
					<span class="settings-icon"><SlidersHorizontal size={16} /></span>
					<div>
						<h2 id="settings-heading">Studio settings</h2>
						<p>Your connection, your defaults.</p>
					</div>
				</div>
				<button type="button" onclick={onClose} aria-label="Close settings"><X size={17} /></button>
			</header>

			<div class="settings-body">
				<div class="section-title"><KeyRound size={13} /><span>OpenAI connection</span></div>
				<label class="api-field">
					<span>API key</span>
					<div>
						<input
							type={reveal ? 'text' : 'password'}
							bind:value={draft.apiKey}
							placeholder="sk-proj-••••••••••••"
							autocomplete="off"
							spellcheck="false"
						/><button
							type="button"
							onclick={() => (reveal = !reveal)}
							aria-label={reveal ? 'Hide key' : 'Show key'}
							>{#if reveal}<EyeOff size={15} />{:else}<Eye size={15} />{/if}</button
						>
					</div>
				</label>
				<div class="privacy-note">
					<ShieldCheck size={14} />
					<p>
						<strong>Stored only on this device.</strong> This static app sends your key directly to OpenAI
						from the browser. Use a restricted project key and avoid shared devices.
					</p>
				</div>

				<div class="section-title models">
					<SlidersHorizontal size={13} /><span>Generation defaults</span>
				</div>
				<div class="field-grid">
					<label><span>Creative director</span><input value={draft.plannerModel} disabled /></label>
					<label><span>Image model</span><input value={draft.imageModel} disabled /></label>
				</div>

				<div class="field-grid">
					<label
						><span>Quality</span><select bind:value={draft.quality}
							>{#each ['low', 'medium', 'high'] as quality (quality)}<option value={quality}
									>{quality[0].toUpperCase() + quality.slice(1)}</option
								>{/each}</select
						></label
					>
					<label
						><span>Default batch</span><input
							type="number"
							min="1"
							max="10"
							bind:value={draft.defaultBatchSize}
						/></label
					>
				</div>

				<label class="toggle-row">
					<div>
						<strong>Auto-render first drafts</strong>
						<span>Start one image per direction as soon as the prompts are ready.</span>
					</div>
					<input type="checkbox" bind:checked={draft.autoGenerate} />
					<i aria-hidden="true"></i>
				</label>
			</div>

			<footer>
				<button class="cancel" type="button" onclick={onClose}>Cancel</button><button
					class="save"
					type="button"
					onclick={submit}
					>{#if saved}<Check size={14} /> Saved{:else}Save settings{/if}</button
				>
			</footer>
		</div>
	</div>
{/if}

<style>
	.settings-backdrop {
		position: fixed;
		z-index: 50;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		background: rgb(18 19 22 / 30%);
		backdrop-filter: blur(6px);
		animation: fade 160ms ease;
	}
	.settings-panel {
		width: min(100%, 560px);
		overflow: hidden;
		border: 1px solid rgb(255 255 255 / 55%);
		border-radius: 22px;
		background: #faf9f6;
		box-shadow: 0 32px 90px rgb(16 17 19 / 28%);
		animation: enter 180ms ease;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 20px;
		border-bottom: 1px solid var(--line);
		background: white;
	}
	header > div {
		display: flex;
		align-items: center;
		gap: 11px;
	}
	.settings-icon {
		display: grid;
		width: 34px;
		height: 34px;
		place-items: center;
		border-radius: 10px;
		color: white;
		background: var(--ink);
	}
	h2 {
		margin: 0 0 2px;
		font-size: 16px;
		letter-spacing: -0.035em;
	}
	header p {
		margin: 0;
		color: var(--muted);
		font-size: 12px;
	}
	header > button {
		display: grid;
		width: 31px;
		height: 31px;
		place-items: center;
		border: 1px solid var(--line);
		border-radius: 9px;
		color: var(--muted);
		background: white;
	}
	.settings-body {
		padding: 20px;
	}
	.section-title {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-bottom: 10px;
		color: var(--ink-2);
		font-size: 12px;
		font-weight: 720;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.section-title.models {
		margin-top: 21px;
		padding-top: 18px;
		border-top: 1px solid var(--line);
	}
	label {
		display: block;
	}
	label > span {
		display: block;
		margin-bottom: 6px;
		color: var(--muted);
		font-size: 12px;
		font-weight: 600;
	}
	.api-field > div {
		position: relative;
	}
	input,
	select {
		width: 100%;
		height: 44px;
		padding: 0 11px;
		border: 1px solid var(--line);
		border-radius: 10px;
		color: var(--ink);
		outline: 0;
		background: white;
		font: inherit;
		font-size: 13px;
		box-shadow: none;
	}
	input:focus,
	select:focus {
		border-color: #aaa69d;
		box-shadow: 0 0 0 3px rgb(20 20 22 / 5%);
	}
	input:disabled {
		color: var(--muted);
		background: #f1efea;
	}
	.api-field input {
		padding-right: 40px;
		font-family: ui-monospace, monospace;
	}
	.api-field button {
		position: absolute;
		top: 4px;
		right: 4px;
		display: grid;
		width: 30px;
		height: 30px;
		place-items: center;
		border: 0;
		border-radius: 8px;
		color: var(--muted);
		background: transparent;
	}
	.privacy-note {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin-top: 9px;
		padding: 10px;
		border-radius: 10px;
		color: #536f61;
		background: #edf3ef;
	}
	.privacy-note :global(svg) {
		flex: 0 0 auto;
		margin-top: 1px;
	}
	.privacy-note p {
		margin: 0;
		font-size: 11px;
		line-height: 1.45;
	}
	.privacy-note strong {
		font-weight: 700;
	}
	.field-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 12px;
	}
	.toggle-row {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		margin-top: 16px;
		padding: 14px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: white;
		cursor: pointer;
	}
	.toggle-row > div {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 3px;
	}
	.toggle-row strong {
		font-size: 14px;
		font-weight: 680;
	}
	.toggle-row span {
		color: var(--muted);
		font-size: 12px;
		line-height: 1.4;
	}
	.toggle-row input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}
	.toggle-row i {
		position: relative;
		width: 38px;
		height: 22px;
		flex: 0 0 auto;
		border-radius: 999px;
		background: #d8d5cf;
		transition: 160ms ease;
	}
	.toggle-row i::after {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: white;
		box-shadow: 0 2px 6px rgb(20 20 22 / 18%);
		content: '';
		transition: 160ms ease;
	}
	.toggle-row input:checked + i {
		background: var(--ink);
	}
	.toggle-row input:checked + i::after {
		transform: translateX(16px);
	}
	.toggle-row input:focus-visible + i {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		padding: 14px 20px;
		border-top: 1px solid var(--line);
		background: white;
	}
	footer button {
		height: 40px;
		padding: 0 14px;
		border-radius: 9px;
		font-size: 12px;
		font-weight: 650;
	}
	.cancel {
		border: 1px solid var(--line);
		color: var(--muted);
		background: white;
	}
	.save {
		display: inline-flex;
		min-width: 96px;
		align-items: center;
		justify-content: center;
		gap: 5px;
		border: 0;
		color: white;
		background: var(--ink);
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@keyframes enter {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.98);
		}
	}
	@media (max-width: 520px) {
		.field-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
