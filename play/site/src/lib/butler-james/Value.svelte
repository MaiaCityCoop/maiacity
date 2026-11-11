<!-- the value equation, in the reader's words: the outcome, the certainty, the time, the effort -->
<script lang="ts">
	import { COPY } from './copy';
	const c = COPY.value;
</script>

<div class="bj-value">
	<p class="bj-eyebrow">{c.eyebrow}</p>
	<h2>{c.title}</h2>
	<ol class="bj-value-list">
		{#each c.items as item}
			<li><h3>{item.name}</h3><p>{item.text}</p></li>
		{/each}
	</ol>
</div>
