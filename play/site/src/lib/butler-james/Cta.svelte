<!-- the call to action, repeated through the page: it leads to the closing section (nothing is sent yet) -->
<script lang="ts">
	import { COPY } from './copy';
	let { note = false, quiet = false, short = false }: { note?: boolean; quiet?: boolean; short?: boolean } = $props();
	function go(e: MouseEvent) {
		const el = document.getElementById('kontakt');
		if (!el) return;
		e.preventDefault();
		el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
	}
</script>

<span class="bj-cta-wrap">
	<a class="bj-cta" class:quiet href="#kontakt" data-cta onclick={go}>{short ? COPY.ctaShort : COPY.cta}</a>
	{#if note}<small>{COPY.ctaNote}</small>{/if}
</span>
