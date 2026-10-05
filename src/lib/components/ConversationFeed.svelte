<script lang="ts">
	import { ArrowUpRight, ImageIcon, LoaderCircle } from '@lucide/svelte';
	import ConceptCard from './ConceptCard.svelte';
	import type {
		Generation,
		InfographicConcept,
		ReferenceAsset,
		StudioMessage
	} from '$lib/studio/types';
	let {
		messages,
		concepts,
		generations,
		references,
		activeMessageId,
		selectedConceptId,
		onSelect,
		onPrompt,
		onFocus
	}: {
		messages: StudioMessage[];
		concepts: InfographicConcept[];
		generations: Generation[];
		references: ReferenceAsset[];
		activeMessageId: string | null;
		selectedConceptId: string | null;
		onSelect: (concept: InfographicConcept) => void;
		onPrompt: (concept: InfographicConcept) => void;
		onFocus: (generation: Generation) => void;
	} = $props();
</script>

<div class="conversation-feed" aria-label="Conversation">
	{#each messages as message (message.id)}
		<article class:user={message.role === 'user'} class="message">
			<div class="message-label">
				{message.role === 'user'
					? 'You'
					: 'Creative partner'}{#if message.id === activeMessageId}<LoaderCircle
						size={13}
						class="spin"
					/>{/if}
			</div>
			{#if message.referenceIds?.length}
				<div class="message-references">
					{#each message.referenceIds as id (id)}
						{@const reference = references.find((item) => item.id === id)}
						{#if reference}<img src={reference.dataUrl} alt={reference.name} />{/if}
					{/each}
				</div>
			{/if}
			{#if message.content}<p class="message-text">
					{message.content}
				</p>{:else if message.id === activeMessageId}<div
					class="thinking-dots"
					aria-label="Thinking"
				>
					<i></i><i></i><i></i>
				</div>{/if}
			{#if message.conceptIds?.length}
				<div class="message-concepts">
					{#each message.conceptIds as id, index (id)}
						{@const concept = concepts.find((item) => item.id === id)}
						{@const thumbnail =
							generations.find((item) => item.conceptId === id && item.status === 'complete') ??
							null}
						{#if concept}<ConceptCard
								{concept}
								{index}
								selected={selectedConceptId === id}
								{thumbnail}
								onSelect={() => onSelect(concept)}
								onOpenPrompt={() => onPrompt(concept)}
								onOpenGeneration={onFocus}
							/>{/if}
					{/each}
				</div>
			{/if}
			{#if message.generationIds?.length}
				<div class="message-images">
					{#each message.generationIds as id (id)}
						{@const generation = generations.find((item) => item.id === id)}
						{#if generation}
							<button type="button" onclick={() => onFocus(generation)}>
								{#if generation.imageUrl}<img
										src={generation.imageUrl}
										alt={generation.conceptTitle}
									/>{:else}<span class="image-icon"
										>{#if generation.status === 'queued' || generation.status === 'generating'}<LoaderCircle
												size={18}
												class="spin"
											/>{:else}<ImageIcon size={18} />{/if}</span
									>{/if}
								<span
									><strong>{generation.conceptTitle}</strong><small
										>{generation.status === 'complete'
											? 'Ready · view in wall'
											: generation.status === 'error'
												? 'Needs attention · view details'
												: generation.status === 'queued'
													? 'Queued · waiting for a slot'
													: 'Rendering in the wall'}</small
									></span
								><ArrowUpRight size={16} />
							</button>
						{/if}
					{/each}
				</div>
			{/if}
		</article>
	{/each}
</div>

<style>
	.conversation-feed {
		display: flex;
		flex-direction: column;
		gap: 30px;
	}
	.message {
		min-width: 0;
	}
	.message-label {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--muted);
		font-size: 12px;
		font-weight: 600;
		margin-bottom: 10px;
	}
	.message-text {
		margin: 0;
		font-size: 16px;
		line-height: 1.75;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.user {
		align-self: flex-end;
		max-width: 85%;
		padding: 16px 20px;
		border-radius: 18px 18px 4px 18px;
		background: var(--surface);
	}
	.user .message-text {
		font-size: 15px;
	}
	.user .message-label {
		margin-bottom: 5px;
	}
	.message-concepts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
		gap: 14px;
		margin-top: 20px;
	}
	.message-images {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
		gap: 10px;
		margin-top: 16px;
	}
	.message-images button {
		display: flex;
		align-items: center;
		gap: 14px;
		text-align: left;
		border: 1px solid var(--line);
		border-radius: 14px;
		background: var(--panel);
		padding: 12px;
		color: var(--ink);
	}
	.message-images button > span:not(.image-icon) {
		flex: 1;
		min-width: 0;
	}
	.message-images strong {
		display: block;
		font-size: 14px;
		font-weight: 550;
	}
	.message-images small {
		display: block;
		margin-top: 4px;
		font-size: 12px;
		color: var(--muted);
	}
	.message-images img {
		width: 68px;
		max-height: 86px;
		object-fit: contain;
		border-radius: 5px;
	}
	.image-icon {
		display: grid;
		width: 54px;
		height: 54px;
		place-items: center;
		color: var(--muted);
		background: var(--surface);
		border-radius: 8px;
	}
	.message-references {
		display: flex;
		gap: 8px;
		margin-bottom: 10px;
	}
	.message-references img {
		width: auto;
		max-width: 100px;
		height: 70px;
		object-fit: contain;
		border-radius: 6px;
	}
	:global(.message .spin) {
		animation: spin 1.3s linear infinite;
	}
	.thinking-dots {
		display: flex;
		gap: 5px;
		padding: 10px 0;
	}
	.thinking-dots i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--muted);
		animation: pulse 1.2s infinite alternate;
	}
	.thinking-dots i:nth-child(2) {
		animation-delay: 0.2s;
	}
	.thinking-dots i:nth-child(3) {
		animation-delay: 0.4s;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes pulse {
		to {
			opacity: 0.2;
		}
	}
</style>
