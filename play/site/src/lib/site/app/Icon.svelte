<!-- The app's icons: plain line drawings, drawn in the text colour. -->
<script lang="ts">
	/** every icon this set draws */
	type IconName = 'back' | 'home' | 'play' | 'board' | 'calendar' | 'media' | 'studio' | 'journal' | 'spark' | 'user' | 'key' | 'ledger' | 'coops' | 'proposals' | 'leaf' | 'database' | 'universe' | 'gear' | 'chat' | 'factory' | 'paw' | 'box' | 'building' | 'mountain' | 'star' | 'link';

	let { name, size = 24 }: { name: IconName; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	{#if name === 'back'}
		<path d="M19.5 12h-15" /><path d="m10.5 6-6 6 6 6" />
	{:else if name === 'home'}
		<path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5.5h4V20" />
	{:else if name === 'play'}
		<path d="M4 18a8 8 0 0 1 16 0" /><path d="M12 10V4" /><path d="M9 5.5c1.8-1.2 4.2-1.2 6 0" /><circle cx="12" cy="18" r="1.4" />
	{:else if name === 'board'}
		<rect x="3.5" y="4.5" width="5" height="15" rx="1.5" /><rect x="9.5" y="4.5" width="5" height="10" rx="1.5" /><rect x="15.5" y="4.5" width="5" height="12.5" rx="1.5" />
	{:else if name === 'calendar'}
		<rect x="3.5" y="5.5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3.5v4M16 3.5v4" /><path d="M8 14h2M14 14h2M8 17h2" />
	{:else if name === 'media'}
		<rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
	{:else if name === 'studio'}
		<rect x="3.5" y="6" width="17" height="12.5" rx="2" /><path d="M3.5 10h17" /><path d="m6.5 6 2 4M11 6l2 4M15.5 6l2 4" />
	{:else if name === 'journal'}
		<path d="M5 4.5h10.5a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3v-12Z" /><path d="M5 16.5a3 3 0 0 1 3-3h10.5" /><path d="M9 8h6" />
	{:else if name === 'spark'}
		<path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.8 2.8M15.2 15.2 18 18M18 6l-2.8 2.8M8.8 15.2 6 18" />
	{:else if name === 'user'}
		<circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" />
	{:else if name === 'ledger'}
		<path d="M4.5 7.5h15v12h-15z" /><path d="M4.5 7.5 7 4.5h10l2.5 3" /><path d="M15.5 13.5h4" /><circle cx="15.5" cy="13.5" r="0.6" fill="currentColor" />
	{:else if name === 'coops'}
		<circle cx="12" cy="7" r="2.6" /><circle cx="6" cy="16" r="2.6" /><circle cx="18" cy="16" r="2.6" /><path d="M10.4 9 7.4 13.8M13.6 9l3 4.8M8.6 16h6.8" />
	{:else if name === 'proposals'}
		<path d="M6 3.5h8.5l3.5 3.5v13.5H6z" /><path d="M14.5 3.5V7H18" /><path d="m9 13.5 2 2 4-4.5" />
	{:else if name === 'leaf'}
		<path d="M5 19c0-8 5-13.5 14-14 .5 9-5 14-14 14Z" /><path d="M5 19 14 10" /><path d="M9.5 14.5h3.5M9.5 14.5V11" />
	{:else if name === 'gear'}
		<circle cx="12" cy="12" r="5.5" /><circle cx="12" cy="12" r="2.2" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M18.4 5.6l-2.2 2.2M7.8 16.2l-2.2 2.2" />
	{:else if name === 'key'}
		<circle cx="8" cy="14" r="4" /><path d="m11 11 8.5-8.5M16 6l2.5 2.5M13.5 8.5 16 11" />
	{:else if name === 'database'}
		<ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" /><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
	{:else if name === 'factory'}
		<path d="M3.5 20.5V11l5 3V11l5 3V11l5 3v-9.5h2v16Z" /><path d="M3.5 20.5h17" /><path d="M7 17.5h2M11.5 17.5h2" />
	{:else if name === 'chat'}
		<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /><path d="M8 10.5h8M8 14h5" />
	{:else if name === 'universe'}
		<circle cx="12" cy="12" r="3.2" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-25 12 12)" /><circle cx="19.2" cy="8.3" r="0.9" fill="currentColor" />
	{:else if name === 'paw'}
		<ellipse cx="12" cy="16" rx="4" ry="3.3" /><circle cx="6" cy="10.5" r="1.7" /><circle cx="9.5" cy="6.5" r="1.7" /><circle cx="14.5" cy="6.5" r="1.7" /><circle cx="18" cy="10.5" r="1.7" />
	{:else if name === 'box'}
		<path d="m12 3.5 8 4v9l-8 4-8-4v-9Z" /><path d="m4 7.5 8 4 8-4M12 11.5v9" />
	{:else if name === 'building'}
		<path d="M3.5 20.5h17" /><path d="M5 20.5v-6a7 7 0 0 1 14 0v6" /><path d="M10 20.5v-4h4v4" /><path d="M12 7.5v13M5.6 11.5h12.8" />
	{:else if name === 'star'}
		<!-- the AI's mark: a four-pointed spark and a small one beside it (Samuel 2026-11-05: the proposals' button) -->
		<path d="M10.5 4c.7 4.6 2.9 6.8 7.5 7.5-4.6.7-6.8 2.9-7.5 7.5-.7-4.6-2.9-6.8-7.5-7.5 4.6-.7 6.8-2.9 7.5-7.5Z" /><path d="M18.5 2.5c.25 1.5.95 2.25 2.5 2.5-1.55.25-2.25 1-2.5 2.5-.25-1.5-1-2.25-2.5-2.5 1.5-.25 2.25-1 2.5-2.5Z" />
	{:else if name === 'link'}
		<!-- two links of a chain: the Sources, every link Maia City keeps (Samuel 2026-11-06) -->
		<path d="M10 14a4.2 4.2 0 0 0 6 0l3.2-3.2a4.2 4.2 0 0 0-6-6L11.6 6.4" /><path d="M14 10a4.2 4.2 0 0 0-6 0l-3.2 3.2a4.2 4.2 0 0 0 6 6l1.6-1.6" />
	{:else if name === 'mountain'}
		<path d="m2.5 19.5 6.5-11 4 6.5 2.5-3.5 6 8Z" /><path d="m7 12 2 1.5 2-1" /><circle cx="17" cy="6" r="1.8" />
	{/if}
</svg>
