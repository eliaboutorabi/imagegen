<script lang="ts">
	import { InformationCircleIcon } from '@hugeicons/core-free-icons';
	import Icon from './Icon.svelte';

	let open = $state(false);
	let container: HTMLDivElement;
	let trigger: HTMLButtonElement;

	function closeOutside(event: PointerEvent | FocusEvent) {
		if (event.target instanceof Node && !container?.contains(event.target)) open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			open = false;
			event.stopPropagation();
			trigger.focus();
		}
	}
</script>

<svelte:window onpointerdown={closeOutside} onfocusin={closeOutside} />

<div class="creator-credit" bind:this={container}>
	<button
		bind:this={trigger}
		type="button"
		aria-label="About the creator"
		aria-expanded={open}
		aria-controls="creator-credit-note"
		title="About the creator"
		onclick={() => (open = !open)}
		onkeydown={handleKeydown}
	>
		<Icon icon={InformationCircleIcon} size={18} />
	</button>
	{#if open}
		<div id="creator-credit-note" class="credit-popover" role="note" aria-label="Creator credit">
			Built by <strong>Eli Aboutorabi</strong>
		</div>
	{/if}
</div>

<style>
	.creator-credit {
		position: relative;
		flex-shrink: 0;
	}
	button {
		display: grid;
		width: 32px;
		height: 32px;
		padding: 0;
		place-items: center;
		border: 1px solid transparent;
		border-radius: 8px;
		color: var(--muted);
		background: transparent;
	}
	button:hover,
	button[aria-expanded='true'] {
		color: var(--ink);
		background: var(--surface);
	}
	.credit-popover {
		position: absolute;
		z-index: 45;
		top: calc(100% + 10px);
		left: 0;
		width: max-content;
		max-width: calc(100vw - 32px);
		padding: 14px 18px;
		border: 1px solid var(--line);
		border-radius: 12px;
		color: var(--ink-2);
		background: var(--panel);
		box-shadow: var(--shadow-soft);
		font-size: 13px;
		line-height: 1.5;
	}
	strong {
		color: var(--ink);
		font-weight: 600;
	}
	@media (max-width: 740px) {
		button {
			width: 40px;
			height: 44px;
		}
	}
</style>
