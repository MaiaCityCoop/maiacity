<!-- Butler James's wordmark (../butler-james/brand.ts): a butler's bell and the name, set in the brand's serif -->
<script lang="ts">
	import { COPY } from './copy';
	let { small = false }: { small?: boolean } = $props();
</script>

<span class="bj-mark" class:small>
	<svg viewBox="0 0 32 32" aria-hidden="true">
		<path d="M5 23h22M7.5 23a8.5 8.5 0 0 1 17 0M16 14.5v-3M13.5 9.5h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
		<circle cx="16" cy="8.2" r="1.6" fill="currentColor" />
	</svg>
	<span>{COPY.brand}</span>
</span>
