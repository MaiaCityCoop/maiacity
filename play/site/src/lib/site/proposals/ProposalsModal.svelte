<!--
	The proposals board in a modal (Samuel 2026-11-05): the nav pill's star opens it over whatever page is open, nearly
	the whole screen, the pill still below it. Back (the pill's, $lib/site/app/back.svelte.js), the star again, Escape,
	its Close or a click beside it close it, Back first closing what is open on the board (a review, an item). The
	board's code is loaded when it first opens, not with every page.
-->
<script lang="ts">
	import { wayBack } from '$lib/site/app/back.svelte.js';
	import { closeProposals } from './proposals.svelte';

	const board = import('./ProposalsBoard.svelte');
	$effect(() => wayBack('Close the proposals', closeProposals));
</script>

<button class="scrim" onclick={closeProposals} aria-label="Close the proposals" tabindex="-1"></button>
<div class="modal" role="dialog" aria-modal="true" aria-label="Proposals">
	{#await board}
		<p class="muted wait">Opening the proposals…</p>
	{:then { default: Board }}
		<Board onclose={closeProposals} />
	{:catch e}
		<p class="error wait">The proposals could not be opened: {e?.message ?? e}</p>
	{/await}
</div>

<style>
	/* under the nav pill (the dock is 50), so Back and the star stay in reach; the modal leaves the pill its room */
	.scrim { all: unset; position: fixed; inset: 0; z-index: 44; background: rgb(38 56 44 / 0.32); backdrop-filter: blur(2px); }
	.modal {
		position: fixed; z-index: 45;
		top: max(0.6rem, env(safe-area-inset-top, 0px));
		left: max(0.6rem, env(safe-area-inset-left, 0px));
		right: max(0.6rem, env(safe-area-inset-right, 0px));
		bottom: var(--nav-room);
		border-radius: 18px; background: var(--cream, #f1ede3); box-shadow: 0 24px 70px rgb(38 56 44 / 0.3); overflow: hidden;
	}
	.wait { margin: 1.2rem; }
</style>
