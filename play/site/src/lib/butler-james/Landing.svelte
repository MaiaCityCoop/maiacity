<!--
	BUTLER JAMES'S LANDING PAGE (intent 42a96129; play/SPEC.md §8): the offer of walkable 3D worlds of apartments and
	houses as an interactive showcase. The show on top tells it with the apartment itself as the page scrolls (./Show
	.svelte); then, after Hormozi's Grand Slam Offer, the flat prices and their calculator, the guarantee and the 24
	hours as sections of their own, the steps, the demo slots, the objections, and the call to action throughout. In
	Butler James's own brand (./brand.ts), German, and self-contained but for play's renderer and the shell it scrolls in.
-->
<script lang="ts">
	import './fonts/faces.css';
	import './landing.css';
	import { cssVars } from './brand';
	import { COPY } from './copy';
	import Band from './Band.svelte';
	import Closing from './Closing.svelte';
	import Compare from './Compare.svelte';
	import Cta from './Cta.svelte';
	import Dashboard from './Dashboard.svelte';
	import Faq from './Faq.svelte';
	import Gallery from './Gallery.svelte';
	import Guarantee from './Guarantee.svelte';
	import Mark from './Mark.svelte';
	import { motion } from './motion';
	import Offer from './Offer.svelte';
	import Show from './Show.svelte';
	import Speed from './Speed.svelte';
	import Steps from './Steps.svelte';
	import Test from './Test.svelte';
</script>

<svelte:head><title>{COPY.brand} · {COPY.hero.eyebrow}</title></svelte:head>

<div class="bj" lang="de" style={cssVars()} data-butler-james use:motion>
	<div class="bj-read" aria-hidden="true"></div>
	<header class="bj-top">
		<Mark />
		<nav aria-label={COPY.brand}>
			<a href="#aufwand">{COPY.need.eyebrow}</a>
			<a href="#test">{COPY.test.eyebrow}</a>
			<a href="#angebot">{COPY.nav.offer}</a>
			<a href="#garantie">{COPY.risk.name}</a>
			<a href="#ablauf">{COPY.nav.steps}</a>
			<a href="#demos">{COPY.nav.demos}</a>
			<a href="#fragen">{COPY.nav.faq}</a>
		</nav>
		<Cta quiet short />
	</header>
	<main>
		<Show />
		<Band />
		<Compare />
		<Test />
		<Offer />
		<Guarantee />
		<Speed />
		<Steps />
		<Dashboard />
		<Gallery />
		<Faq />
		<Closing />
	</main>
	<div class="bj-sticky" data-sticky><Cta /></div>
</div>
