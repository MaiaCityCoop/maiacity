<!--
	AN INTENT'S DECISION BAR (intent bb3b0773, Samuel 2026-11-07: "the changes preview … should have like accept button,
	right?"): the one decision its stage asks for, primary, and Reject beside it where it may be rejected, its reason under
	it while it may not be taken; what they are is ./detail.ts's detailOf's, so the bar never disagrees with itself
	wherever it stands: at the foot of the intent's detail (./IntentDetail.svelte) and of its work's review opened from
	it (./IntentsBoard.svelte). Secondary actions (Source …) go beside it as quiet buttons (`extra`), never in its place.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Detail } from './detail';

	let {
		detail,
		merging = false,
		ondecide,
		extra
	}: {
		detail: Pick<Detail, 'decision' | 'reject'>;
		/** an Accept that merges (Accept and ship): GitHub takes a few seconds */
		merging?: boolean;
		ondecide: (verdict: 'approve' | 'accept' | 'reject' | 'reopen') => void;
		/** quiet secondary actions, before the decision */
		extra?: Snippet;
	} = $props();
	const dec = $derived(detail.decision);
</script>

{#if dec || detail.reject || extra}
	<!-- No Close: Back, Escape or the scrim close what it is the foot of -->
	<footer class="decide">
		<div class="buttons">
			{#if extra}<span class="extra">{@render extra()}</span>{/if}
			{#if detail.reject}<button class="btn reject" onclick={() => ondecide('reject')} title="Not to be done: it ends archived">Reject</button>{/if}
			{#if dec}
				<button class="btn primary" class:ghost={dec.verdict === 'reopen'} onclick={() => ondecide(dec.verdict)} disabled={!dec.enabled || merging} title={dec.why}>{merging ? 'Accepting…' : dec.label}</button>
			{/if}
		</div>
		{#if dec && !dec.enabled && dec.why}<p class="why-not">{dec.why}</p>{/if}
	</footer>
{/if}

<style>
	/* Reject and the one decision side by side at the right, the quiet extras at the left; on a phone both share the width */
	.decide { flex: 0 0 auto; padding: 0.5rem 0 0.1rem; }
	.buttons { display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem; }
	.extra { margin-right: auto; display: inline-flex; gap: 0.4rem; }
	.decide .btn { min-height: 44px; justify-content: center; }
	.btn.primary { flex: 0 1 15rem; }
	.btn.reject { flex: 0 0 auto; background: color-mix(in srgb, var(--terracotta, #c8744f) 14%, transparent); color: #9c3b22; border-color: color-mix(in srgb, var(--terracotta, #c8744f) 55%, transparent); }
	.btn.reject:hover { background: color-mix(in srgb, var(--terracotta, #c8744f) 26%, transparent); filter: none; }
	.why-not { margin: 0.35rem 0 0; text-align: right; font-size: 0.78rem; color: var(--ink-soft, #4d5d51); overflow-wrap: anywhere; }
	@media (max-width: 520px) {
		.btn.reject { flex: 1 1 0; }
		.btn.primary { flex: 2 1 0; }
		.why-not { text-align: left; }
	}
</style>
