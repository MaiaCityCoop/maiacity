<!-- the 24 hours, a section of its own: from booking to delivery -->
<script lang="ts">
	import { COPY } from './copy';
	const c = COPY.speed;
</script>

<section class="bj-section paper" data-section="speed">
	<div class="bj-wrap bj-split reverse">
		<div class="bj-clock" aria-hidden="true">
			<b>{c.number}</b><span>{c.unit}</span>
			<div class="bj-clock-line"><i>{c.from}</i><i>{c.to}</i></div>
		</div>
		<div>
			<p class="bj-eyebrow">{c.eyebrow}</p>
			<h2>{c.title}</h2>
			<p class="bj-lead">{c.text}</p>
		</div>
	</div>
</section>
