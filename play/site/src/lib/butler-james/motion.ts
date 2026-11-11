// THE PAGE'S MOTION (intent 42a96129), one Svelte action on the page's root: what comes in as it is reached, the price
// cards that tilt under the pointer, the call to action that pulls toward it, and the bar that shows how far the page
// is read. Every one of them is off under prefers-reduced-motion (the root then never gets `motion`, and the page is
// simply there), and none is needed to read or use the page.

/** the box an element scrolls in: its nearest scrolling ancestor, else the window's document */
export function scrollerOf(el: Element): HTMLElement {
	for (let p = el.parentElement; p; p = p.parentElement) {
		const o = getComputedStyle(p).overflowY;
		if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
	}
	return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

/** what comes in as it is reached */
const COMES_IN = '.bj-head, .bj-plan, .bj-stack, .bj-calc, .bj-value-list li, .bj-steps li, .bj-slot, .bj-faq-item, .bj-seal, .bj-clock, .bj-split > div, .bj-gap, .bj-closing > *';

export function motion(root: HTMLElement) {
	const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const scroller = scrollerOf(root);
	const off: (() => void)[] = [];

	// ---- how far the page is read: --bj-read on the root, 0..1
	let asked = 0;
	const read = () => {
		asked = 0;
		const most = scroller.scrollHeight - scroller.clientHeight;
		root.style.setProperty('--bj-read', String(most > 0 ? Math.min(1, scroller.scrollTop / most) : 0));
	};
	const onScroll = () => (asked ||= requestAnimationFrame(read));
	const target: HTMLElement | Window = scroller === document.scrollingElement ? window : scroller;
	target.addEventListener('scroll', onScroll, { passive: true });
	off.push(() => target.removeEventListener('scroll', onScroll));
	read();

	if (!still) {
		// ---- coming in: each waits its turn among its siblings
		root.classList.add('motion');
		const seen = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (!e.isIntersecting) continue;
					e.target.classList.add('bj-in');
					seen.unobserve(e.target);
				}
			},
			{ root: scroller === document.scrollingElement ? null : scroller, rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
		);
		for (const el of root.querySelectorAll<HTMLElement>(COMES_IN)) {
			const turn = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
			el.style.setProperty('--bj-turn', String(Math.min(turn, 8)));
			el.classList.add('bj-comes');
			seen.observe(el);
		}
		off.push(() => seen.disconnect());

		// ---- under a mouse: the price cards tilt, the call to action pulls
		const onMove = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse') return;
			const at = e.target as Element | null;
			const card = at?.closest<HTMLElement>('.bj-plan');
			if (card) {
				const r = card.getBoundingClientRect();
				card.style.setProperty('--bj-tilt-x', String(((e.clientY - r.top) / r.height - 0.5) * -7));
				card.style.setProperty('--bj-tilt-y', String(((e.clientX - r.left) / r.width - 0.5) * 9));
				card.style.setProperty('--bj-at-x', `${((e.clientX - r.left) / r.width) * 100}%`);
				card.style.setProperty('--bj-at-y', `${((e.clientY - r.top) / r.height) * 100}%`);
			}
			const cta = at?.closest<HTMLElement>('a.bj-cta');
			if (cta) {
				const r = cta.getBoundingClientRect();
				cta.style.setProperty('--bj-pull-x', `${(e.clientX - r.left - r.width / 2) * 0.18}px`);
				cta.style.setProperty('--bj-pull-y', `${(e.clientY - r.top - r.height / 2) * 0.3}px`);
			}
		};
		const onOut = (e: PointerEvent) => {
			const el = (e.target as Element | null)?.closest<HTMLElement>('.bj-plan, a.bj-cta');
			if (!el || el.contains(e.relatedTarget as Node | null)) return;
			for (const v of ['--bj-tilt-x', '--bj-tilt-y', '--bj-pull-x', '--bj-pull-y']) el.style.removeProperty(v);
		};
		root.addEventListener('pointermove', onMove);
		root.addEventListener('pointerout', onOut);
		off.push(() => {
			root.removeEventListener('pointermove', onMove);
			root.removeEventListener('pointerout', onOut);
		});
	}
	return {
		destroy() {
			if (asked) cancelAnimationFrame(asked);
			for (const f of off) f();
		}
	};
}
