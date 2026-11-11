<!-- the guarantee in one line, wherever a price or a call to action stands: no risk, 100 % money back, no questions -->
<script lang="ts">
	import { COPY } from './copy';
	let { big = false }: { big?: boolean } = $props();
</script>

<p class="bj-risk" class:big data-risk>
	<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
	<b>{COPY.risk.name}</b><span>{COPY.risk.text}</span>
</p>
