<script lang="ts">
	// The line every versioned view shows over a document read as its intent's work would make it (doc_at's `intent`):
	// the variant's own status (open, proposed, accepted, archived), worded only once it is decided.
	import type { Snippet } from 'svelte';
	let { intent, children }: { intent: { status: string; note: string }; children?: Snippet } = $props();
	const decided = $derived(intent.status === 'accepted' || intent.status === 'archived');
</script>

<p class="asif">As its intent's work would make it{decided ? ` (${intent.status})` : ''}: “{intent.note}” {@render children?.()}</p>

<style>
	.asif { margin: 0.4rem 0 0.5rem; padding: 0.45rem 0.6rem; border-radius: 8px; background: var(--mustard-soft, rgb(232 178 60 / 0.18)); font-size: 0.78rem; line-height: 1.4; }
</style>
