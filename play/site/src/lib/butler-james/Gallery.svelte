<!--
	The demo properties: slots for walkable worlds and films (./slots.ts). Each is a placeholder until it is given a
	world's UUID or a video file's hash; a filled slot carries its reference, never a title or a path.
-->
<script lang="ts">
	import { COPY, PLACEHOLDER } from './copy';
	import Gap from './Gap.svelte';
	import { SLOTS, isPlaceholder } from './slots';
	const c = COPY.gallery;
</script>

<section class="bj-section paper" id="demos" data-section="gallery">
	<div class="bj-wrap">
		<header class="bj-head">
			<p class="bj-eyebrow">{c.eyebrow}</p>
			<h2>{c.title}</h2>
			<p class="bj-lead">{c.lead}</p>
		</header>
		<ul class="bj-slots">
			{#each SLOTS as s}
				<li class="bj-slot" data-slot={s.kind} data-placeholder={isPlaceholder(s)} data-ref={s.ref}>
					<svg viewBox="0 0 48 48" aria-hidden="true">
						{#if s.kind === 'world'}
							<path d="M24 6 42 16v16L24 42 6 32V16zM24 6v36M6 16l18 10 18-10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
						{:else}
							<rect x="6" y="11" width="36" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" />
							<path d="M21 18v12l10-6z" fill="currentColor" />
						{/if}
					</svg>
					<b>{PLACEHOLDER} · {s.kind === 'world' ? c.world : c.video}</b>
					<span>{s.kind === 'world' ? c.worldNote : c.videoNote}</span>
				</li>
			{/each}
		</ul>
		{#each c.gaps as g}<Gap of={g} />{/each}
	</div>
</section>
