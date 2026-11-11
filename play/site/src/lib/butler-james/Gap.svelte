<!-- a text the page cannot state yet (./copy.ts `gap`): a marked placeholder for the admin to fill -->
<script lang="ts">
	import { PLACEHOLDER, type Gap } from './copy';
	let { of }: { of: Gap } = $props();
</script>

<p class="bj-gap" data-gap={of.gap}><b>{PLACEHOLDER}</b><span>{of.text}</span></p>
