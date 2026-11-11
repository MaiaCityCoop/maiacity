<!--
	THE TEST OFFER (intent 42a96129): a demo trailer of a single room for 99 €, from at least 6 photos of it, in under an
	hour. The photos are chosen here and counted on the visitor's device; from six on the test is ready. Nothing is sent:
	there is no upload path and no payment yet, and the page says so as a marked placeholder.
-->
<script lang="ts">
	import { COPY } from './copy';
	import Gap from './Gap.svelte';
	import { TEST, enoughPhotos } from './offer';

	const c = COPY.test;
	let photos: { name: string; url: string }[] = $state([]);
	let over = $state(false);
	const ready = $derived(enoughPhotos(photos.length));

	/** the pictures among what was chosen or dropped, added to those already there */
	function take(files: FileList | null | undefined) {
		const more = [...(files ?? [])].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
		photos = [...photos, ...more.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }))];
	}
	function clear() {
		for (const p of photos) URL.revokeObjectURL(p.url);
		photos = [];
	}
	$effect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)));
</script>

<section class="bj-section ink bj-test" id="test" data-section="test">
	<div class="bj-wrap bj-test-grid">
		<div class="bj-test-copy">
			<p class="bj-eyebrow">{c.eyebrow}</p>
			<h2>{#each c.title as line, i}<span class:hot={i === 1}>{line}</span>{/each}</h2>
			<p class="bj-lead">{c.lead}</p>
			<ul class="bj-facts">{#each c.facts as f}<li>{f}</li>{/each}</ul>
			<p class="bj-per">{c.vat}</p>
		</div>
		<div class="bj-upload" data-upload data-ready={ready} data-count={photos.length}>
			<label
				class="bj-drop"
				class:over
				ondragover={(e) => { e.preventDefault(); over = true; }}
				ondragleave={() => (over = false)}
				ondrop={(e) => { e.preventDefault(); over = false; take(e.dataTransfer?.files); }}
			>
				<input type="file" accept="image/*,.heic,.heif" multiple onchange={(e) => { take(e.currentTarget.files); e.currentTarget.value = ''; }} />
				<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 32V10M15 19l9-9 9 9M8 32v6h32v-6" /></svg>
				<b>{c.drop}</b>
				<small>{c.dropHint}</small>
			</label>
			<div class="bj-meter" role="status" aria-live="polite">
				<div class="bj-meter-bar"><i style="width:{Math.min(100, (photos.length / TEST.photos) * 100)}%"></i></div>
				<p>
					<b data-chosen>{photos.length}</b> {c.chosen}
					{#if ready}<span class="ok" data-ready-note>{c.ready}</span>{:else}<span>{c.missing} {TEST.photos - photos.length}</span>{/if}
				</p>
			</div>
			{#if photos.length}
				<ul class="bj-thumbs">
					{#each photos as p (p.url)}<li><img src={p.url} alt={p.name} /></li>{/each}
				</ul>
				<button type="button" class="bj-clear" onclick={clear}>{c.clear}</button>
			{/if}
			{#each c.gaps as g}<Gap of={g} />{/each}
		</div>
	</div>
</section>
