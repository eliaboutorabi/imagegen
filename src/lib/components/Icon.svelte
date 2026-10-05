<script lang="ts">
	import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/svelte';
	let {
		icon,
		size = 20,
		strokeWidth = 1.7,
		class: className = '',
		fill = 'none'
	}: {
		icon: IconSvgElement;
		size?: number;
		strokeWidth?: number;
		class?: string;
		fill?: string;
	} = $props();
</script>

{#key icon}
	<HugeiconsIcon
		{icon}
		{size}
		{strokeWidth}
		class={className}
		{fill}
		aria-hidden="true"
		focusable="false"
	/>
{/key}
