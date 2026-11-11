<!--
	BEFORE AND AFTER (intent 42a96129): six reference photos as they come, badly lit, beside the 3D walkthrough made of
	them. Both sides are placeholders, drawn here and marked: no real photos exist yet. The walkthrough's place is a slot
	(./slots.ts) that takes a world by its UUID.
-->
<script lang="ts">
	import { COPY, PLACEHOLDER } from './copy';
	import Gap from './Gap.svelte';
	import { isPlaceholder, slot } from './slots';

	const c = COPY.compare;
	/** the photos: one of each room, and one more */
	const photos = [...Object.values(COPY.scene.rooms), c.extra];
	/** the walkthrough made of them: none yet */
	const after = slot('world');
</script>

<section class="bj-section paper" id="vorher-nachher" data-section="compare">
	<div class="bj-wrap">
		<header class="bj-head">
			<p class="bj-eyebrow">{c.eyebrow}</p>
			<h2>{c.title}</h2>
			<p class="bj-lead">{c.lead}</p>
		</header>
		<div class="bj-compare">
			<div class="bj-side">
				<b>{c.before}</b>
				<ul class="bj-before">
					{#each photos as room}
						<li data-before data-placeholder="true"><small>{PLACEHOLDER} · {c.photo}</small><b>{room}</b><span>{c.dark}</span></li>
					{/each}
				</ul>
			</div>
			<div class="bj-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12h16M13 5l7 7-7 7" /></svg></div>
			<div class="bj-side">
				<b>{c.after}</b>
				<div class="bj-after" data-after data-slot={after.kind} data-placeholder={isPlaceholder(after)} data-ref={after.ref}>
					<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 42 16v16L24 42 6 32V16zM24 6v36M6 16l18 10 18-10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" /></svg>
					<b>{PLACEHOLDER} · {c.walk}</b>
					<span>{c.walkNote}</span>
				</div>
			</div>
		</div>
		{#each c.gaps as g}<Gap of={g} />{/each}
	</div>
</section>
