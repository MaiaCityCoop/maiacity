<!--
	The turntable of the asset library ($lib/content/assets/VaultAsset.svelte): the thing on its canvas, in its place in
	the page's column, and round it what the page gives it to say and do, in three places —

	  bar      what it does, the row of chips the page is most used by (the actors' moves, the plants' stages)
	  panel    the finer controls (a joint's turn, the biome's layers, the seed id, the variants)
	  readout  what it is: its name, its note, its measure, how to turn it

	and anything else floating over the canvas itself as its children (a joystick, a hint, a button). A block in the
	page's column, laid out by the room the column gives it rather than the screen's: the deck over the canvas where the
	column is wide, under it where it is not. Its `head` (its name and the bar's chips) stands above the canvas and stays
	at the top of the column while the rest of it scrolls by. `compact`, in a card that has its own answers under it (an
	intent's review), keeps only the head and a short canvas; `fill` makes it as tall as the column.
-->
<script>
	/**
	 * @type {{
	 *   name: string,
	 *   inline?: boolean,
	 *   canvas?: HTMLDivElement,
	 *   stage?: HTMLDivElement,
	 *   compact?: boolean,
	 *   fill?: boolean,
	 *   head?: import('svelte').Snippet,
	 *   bar?: import('svelte').Snippet,
	 *   panel?: import('svelte').Snippet,
	 *   readout?: import('svelte').Snippet,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let { name, canvas = $bindable(), stage = $bindable(), compact = false, fill = false, head, bar, panel, readout, children } = $props();
</script>

<div class="turntable inline {name}" class:compact class:fill>
	{#if head}<header class="head">{@render head()}</header>{/if}
	<section class="view">
		<div class="stage" bind:this={stage}>
			<div class="canvas" bind:this={canvas}></div>
			{@render children?.()}
		</div>
		{#if bar || ((panel || readout) && !compact)}
			<div class="deck">
				{#if bar}<div class="card bar">{@render bar()}</div>{/if}
				{#if panel && !compact}<div class="card panel">{@render panel()}</div>{/if}
				{#if readout && !compact}<div class="card readout">{@render readout()}</div>{/if}
			</div>
		{/if}
	</section>
</div>

<style>
	.turntable {
		position: fixed;
		inset: 0;
		padding: env(safe-area-inset-top, 0px) 0 0;
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: minmax(0, 1fr);
		background: #f4f1eb;
		color: #1f2a23;
		font-size: 0.85rem;
	}

	.view {
		position: relative;
		min-width: 0;
		min-height: 0;
	}

	.stage {
		position: absolute;
		inset: 0;
	}

	.canvas {
		position: absolute;
		inset: 0;
		cursor: grab;
		touch-action: none;
	}

	/* a desktop or a tablet: over the canvas, in a grid — the bar across the top, the panel down the right, the readout
	   at the foot on the left, above the nav pill */
	.deck {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-rows: auto minmax(0, 1fr);
		grid-template-areas:
			'bar bar'
			'readout panel';
		gap: 0.75rem 1rem;
		padding: 1rem 1rem var(--nav-room);
		pointer-events: none;
	}

	.card {
		min-width: 0;
		padding: 0.6rem 0.8rem;
		border-radius: 12px;
		background: rgb(255 255 255 / 0.8);
		-webkit-backdrop-filter: blur(10px);
		backdrop-filter: blur(10px);
		pointer-events: auto;
	}

	/* a place the page has nothing for just now takes no room */
	.card:not(:has(*)) {
		display: none;
	}

	.bar {
		grid-area: bar;
		justify-self: stretch;
	}

	.panel {
		grid-area: panel;
		align-self: start;
		width: 15rem;
		max-height: 100%;
		overflow: auto;
		overscroll-behavior: contain;
	}

	.readout {
		grid-area: readout;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		align-self: end;
		justify-self: start;
		max-width: 32rem;
		max-height: 100%;
		overflow: auto;
	}

	/* the shared look of what the pages put in it: small capitals for a heading, round chips that press dark (the least
	   specific of rules, so a page's own look of a chip wins) */
	:where(.turntable) :global(.label) {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		opacity: 0.55;
	}

	:where(.turntable) :global(button) {
		font: inherit;
		color: inherit;
		cursor: pointer;
	}

	:where(.turntable) :global(.chip) {
		padding: 0.3rem 0.65rem;
		border: 1px solid rgb(0 0 0 / 0.12);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.7);
		white-space: nowrap;
	}

	:where(.turntable) :global(.chip.on) {
		background: #1f2a23;
		border-color: #1f2a23;
		color: #fff;
	}

	:where(.turntable) :global(.chips) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
	}

	.readout :global(small) {
		opacity: 0.6;
	}

	/* inline: a block in its page's column, as tall as the column's screen allows; the deck under the canvas, the bar's
	   chips in one row scrolling sideways, as on a phone — and over it, as on a desktop, where the column is wide */
	.turntable.inline {
		position: relative;
		inset: auto;
		display: block;
		padding: 0;
		border-radius: 14px;
		/* clipped to its round corners without being a scroller of its own, so its head stays at the column's top */
		overflow: clip;
		container-type: inline-size;
	}

	/* at the top of the column it scrolls in: up through the column's own top margin where the page says how far
	   (`--turntable-top`, below 0), as a scroller keeps a sticky box inside its padding */
	.turntable.inline > .head {
		position: sticky;
		top: var(--turntable-top, 0px);
		z-index: 3;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.65rem 0.8rem;
		border-bottom: 1px solid rgb(0 0 0 / 0.08);
		background: rgb(255 255 255 / 0.94);
		-webkit-backdrop-filter: blur(10px);
		backdrop-filter: blur(10px);
	}

	.turntable.inline > .head:not(:has(*)) {
		display: none;
	}

	.turntable.inline .head :global(.chips) {
		flex-wrap: nowrap;
		overflow-x: auto;
		scrollbar-width: none;
		margin: -0.2rem -0.8rem;
		padding: 0.2rem 0.8rem;
	}

	.turntable.inline .head :global(.chips)::-webkit-scrollbar {
		display: none;
	}

	.turntable.inline .head :global(.chip) {
		flex: none;
	}

	.turntable.inline .view {
		display: flex;
		flex-direction: column;
	}

	.turntable.inline .stage {
		position: relative;
		inset: auto;
		height: clamp(17rem, 52vh, 34rem);
	}

	/* fill: as tall as the page's column, its head on top and the canvas taking the rest (what is said of it is the
	   page's to put elsewhere, its aside) */
	.turntable.inline.fill {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.turntable.inline.fill > .head {
		position: relative;
		top: auto;
	}

	.turntable.inline.fill .view {
		flex: 1;
		min-height: 0;
	}

	.turntable.inline.fill .stage {
		flex: 1;
		height: auto;
		min-height: 17rem;
	}

	/* compact: in a card that scrolls on its own, its head stays in its place */
	.turntable.inline.compact > .head {
		position: relative;
		top: auto;
	}

	.turntable.inline.compact .stage {
		height: clamp(10rem, 26vh, 14rem);
	}

	.turntable.inline .deck {
		position: relative;
		inset: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.6rem;
		border-top: 1px solid rgb(0 0 0 / 0.08);
		pointer-events: auto;
	}

	.turntable.inline .card {
		flex: none;
		align-self: stretch;
		width: auto;
		max-width: none;
		max-height: none;
		overflow: visible;
		padding: 0.6rem 0.8rem;
		border: 0;
		border-radius: 12px;
		background: #fff;
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
	}

	.turntable.inline .bar :global(.chips) {
		flex-wrap: nowrap;
		overflow-x: auto;
		scrollbar-width: none;
		margin: -0.2rem -0.8rem;
		padding: 0.2rem 0.8rem;
	}

	.turntable.inline .bar :global(.chips)::-webkit-scrollbar {
		display: none;
	}

	.turntable.inline .bar :global(.chip) {
		flex: none;
	}

	/* the shared look of a chip and a heading, held against the page's own (a page may have a chip of its own) */
	.turntable.inline :global(.chip) {
		display: inline-block;
		padding: 0.3rem 0.65rem;
		border: 1px solid rgb(0 0 0 / 0.12);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.7);
		font-size: inherit;
		font-weight: 400;
		line-height: normal;
		color: inherit;
		white-space: nowrap;
	}

	.turntable.inline :global(.chip.on) {
		background: #1f2a23;
		border-color: #1f2a23;
		color: #fff;
	}

	.turntable.inline :global(.chip:disabled) {
		opacity: 0.4;
		cursor: default;
	}

	/* a column of a tablet's width: the bar across under the canvas, the readout and the panel side by side under it */
	@container (min-width: 36rem) {
		.turntable.inline .deck {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			grid-template-rows: auto auto;
			grid-template-areas:
				'bar bar'
				'readout panel';
			gap: 0.5rem;
		}

		.turntable.inline .card {
			align-self: start;
		}
	}

	/* a column of a desktop's width: the deck over the canvas */
	@container (min-width: 60rem) {
		.turntable.inline .stage {
			height: clamp(28rem, calc(100dvh - 11rem), 52rem);
		}

		.turntable.inline .deck {
			position: absolute;
			inset: 0;
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-rows: auto minmax(0, 1fr);
			grid-template-areas:
				'bar bar'
				'readout panel';
			gap: 0.75rem 1rem;
			padding: 1rem;
			border-top: 0;
			pointer-events: none;
		}

		.turntable.inline .card {
			background: rgb(255 255 255 / 0.8);
			-webkit-backdrop-filter: blur(10px);
			backdrop-filter: blur(10px);
		}

		.turntable.inline .panel {
			align-self: start;
			width: 15rem;
			max-height: 100%;
			overflow: auto;
		}

		.turntable.inline .readout {
			align-self: end;
			justify-self: start;
			max-width: 32rem;
			max-height: 100%;
			overflow: auto;
		}

		.turntable.inline .bar :global(.chips),
		.turntable.inline .head :global(.chips) {
			flex-wrap: wrap;
			overflow-x: visible;
			margin: 0;
			padding: 0;
		}
	}

</style>
