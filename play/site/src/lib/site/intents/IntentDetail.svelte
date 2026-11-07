<!--
	AN INTENT'S DETAIL, BY STAGE (intent bb3b0773, Samuel 2026-11-07: "the clear point of decision … reduced to the actual
	essence of decision point, while keeping overall the information that the agents need for their work intact";
	play/SPEC.md §4.12 *The detail, by stage*). Opened from the board (./IntentsBoard.svelte) over it: on top only what a
	person needs at the moment the intent is in (what it is, where it stands), the one decision its stage asks for always
	at the foot, and everything else kept whole in tabs, sticky under the header and scrolling sideways on a phone, in the
	aside's style (play/SPEC.md §4.15 *One aside*). What goes where is ./detail.ts's detailOf's, never decided here.

	Read only: an intent is added and specified over MCP; here an admin approves its spec, accepts it (Accept and ship for
	code: play/api/src/ship.ts), rejects it (it ends archived) or reopens it. Only a whole intent is decided, whatever its
	work (Samuel 2026-11-07); its work's review opens over the board (onopenwork), read only.
-->
<script lang="ts">
	import { api } from '$lib/api';
	import { markdown } from '$lib/site/markdown/index.js';
	import { detailOf, isCode, notLive, shipsAgain, STAGE_NAME, TABS, type Check, type Intent, type Kind, type Results, type ShipStep, type Stage, type TabId, type Work } from './detail';

	let {
		intent: i,
		cameWith = null,
		schemaNames = new Map(),
		now = Date.now(),
		error = '',
		merging = false,
		onclose,
		ondecide,
		onopenwork,
		onopenintent
	}: {
		intent: Intent;
		/** the title of the intent it was proposed for, if any */
		cameWith?: string | null;
		/** the schemas' labels by their UUIDs, to name its declared work (only shown) */
		schemaNames?: Map<string, string>;
		now?: number;
		/** a refused decision's reason, at the foot */
		error?: string;
		/** an Accept that merges (Accept and ship): GitHub takes a few seconds */
		merging?: boolean;
		onclose: () => void;
		ondecide: (verdict: 'approve' | 'accept' | 'reject' | 'reopen') => void;
		onopenwork: () => void;
		onopenintent: (id: string) => void;
	} = $props();

	const REPO_URL = 'https://github.com/MyAvenCEO/maiacity';
	const KIND_NAME: Record<Kind, string> = { idea: 'Make', fix: 'Fix', improve: 'Improve' };
	const TAB_NAME = Object.fromEntries(TABS) as Record<TabId, string>;
	const when = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	const shortWhen = (s: string) => new Date(s).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	const md = (s: string | null | undefined) => markdown(s ?? '');
	const workKindName = (k: string) => (k === 'code' ? 'code' : (schemaNames.get(k) ?? k));
	const whereOf = (r: Results[string]) => (r.where === 'main' ? `main${r.commit ? ` @ ${r.commit.slice(0, 7)}` : ''}` : 'avenBOX');
	const titleOf = (w: Work) => (w.number == null ? 'a change' : `v${w.number}`);
	const GROUP_TYPE: Record<string, string> = { plants: 'Plant', things: 'Thing', machines: 'Machine', buildings: 'Building', actors: 'Actor', biomes: 'Biome', worlds: 'World', sandboxes: 'Sandbox' };
	const typeOf = (w: Work) => GROUP_TYPE[w.grp ?? ''] ?? (w.what ? w.what[0].toUpperCase() + w.what.slice(1) : (w.grp ?? ''));
	const STEP_MARK: Record<ShipStep['state'], string> = { queued: '·', running: '●', green: '✓', red: '✗', skipped: '–' };
	const STEP_WORD: Record<ShipStep['state'], string> = { queued: 'waiting', running: 'running', green: 'done', red: 'red', skipped: 'skipped' };
	const tookOf = (s: ShipStep, at: number) => {
		if (!s.started) return '';
		const ms = (s.finished ? Date.parse(s.finished) : at) - Date.parse(s.started);
		if (!(ms >= 0)) return '';
		const sec = Math.round(ms / 1000);
		return sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)} min ${sec % 60} s`;
	};
	/** a log shown from its end, where it went red */
	const toEnd = (el: HTMLElement) => {
		el.scrollTop = el.scrollHeight;
	};

	/** what to tell an agent sent to it: play's (GET /api/intents/<id>'s brief, the Intents skill's part for its stage,
	 *  play/api/src/skills.ts), never written here; null where there is nothing for an agent to do */
	let brief = $state<{ id: string; stage: Stage; text: string | null } | null>(null);
	let briefError = $state('');
	$effect(() => {
		const { id, stage } = i;
		if (brief?.id === id && brief.stage === stage) return;
		api<{ brief: string | null }>(`/intents/${id}`)
			.then((r) => {
				if (i.id === id) brief = { id, stage, text: r.brief };
			})
			.catch((e) => {
				if (i.id === id) briefError = (e as Error).message;
			});
	});
	const briefText = $derived(brief?.id === i.id && brief.stage === i.stage ? brief.text : null);
	const d = $derived(detailOf(i, { brief: briefText }));

	// the tab opened first is the stage's (detailOf's), again whenever another intent, or another stage, is opened
	let tab = $state<TabId>('history');
	let shownFor = '';
	$effect.pre(() => {
		const key = `${i.id}:${i.stage}`;
		if (key === shownFor) return;
		shownFor = key;
		tab = d.tab;
	});
	const current = $derived(d.tabs.includes(tab) ? tab : d.tab);

	let copied = $state(false);
	let copyError = $state('');
	async function copyBrief(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copyError = 'The brief could not be copied here: select it and copy it by hand.';
		}
	}
	const refused = $derived(error || copyError || briefError);
</script>

{#snippet chips(list: { id: string; must: boolean; state: 'pass' | 'fail' | 'none' }[])}
	<span class="chips">{#each list as c (c.id)}<span class="chk" class:pass={c.state === 'pass'} class:fail={c.state === 'fail'} class:nice={!c.must} title={c.must ? 'must' : 'nice to have'}>{c.state === 'pass' ? '✓' : c.state === 'fail' ? '✗' : '·'} {c.id}</span>{/each}</span>
{/snippet}

{#snippet checkList(list: Check[])}
	<ol class="checks">
		{#each list as c (c.id)}
			{@const r = i.results?.[c.id]}
			<li class:pass={r?.pass === true} class:fail={r?.pass === false}>
				<span class="mark" title={r ? (r.pass ? 'Passed' : 'Failed') : 'No result yet'}>{r ? (r.pass ? '✓' : '✗') : '·'}</span>
				<div class="what">
					<p><span class="cid">{c.id}</span> {c.check}{#if !c.must}{' '}<span class="pill nice" title="Nice to have: it does not hold the proposal back">nice</span>{/if}</p>
					<p class="muted small"><span class="how">{c.how}</span> · {c.by}</p>
					{#if c.run}<code class="run" title="Its run: the command that decides it in avenBOX, and on main once merged">{c.run}</code>{/if}
					{#if r}<p class="evidence small"><span class="where" class:main={r.where === 'main'} title={r.where === 'main' ? 'Run on main after the merge' : 'Run in avenBOX'}>{whereOf(r)}</span>{' '}{r.evidence}{#if r.by}{' '}<span class="muted">· {r.by}, {shortWhen(r.at)}</span>{/if}</p>{/if}
				</div>
			</li>
		{/each}
	</ol>
{/snippet}

<button class="scrim" onclick={onclose} aria-label="Close" tabindex="-1"></button>
<div class="review item-review" role="dialog" aria-modal="true" aria-label={i.title} data-stage={i.stage}>
	<header class="review-head">
		<!-- the way back to the board, seen on a phone too (Samuel 2026-11-06) -->
		<button class="to-board" onclick={onclose} title="Back to the intents (Esc)">‹ Intents</button>
		<p class="tags"><span class="type" data-kind={i.kind}>{KIND_NAME[i.kind] ?? i.kind}</span> <span class="pill" class:shipping={i.stage === 'ship'}>{STAGE_NAME[i.stage]}</span>{#if i.sub}{' '}<span class="pill" data-sub={i.sub.state} title={i.sub.why}>{i.sub.state} · {i.sub.tag}</span>{/if}</p>
		<h2>{i.title}</h2>
	</header>

	<div class="item-body">
		<!-- on top: the stage's parts, as detailOf gives them (play/SPEC.md §4.12 The detail, by stage) -->
		<section class="top" aria-label="Where it stands">
			{#each d.top as p, n (n)}
				{#if p.part === 'want'}<p class="want">{p.text}</p>
				{:else if p.part === 'next'}<p class="next">{p.text}</p>
				{:else if p.part === 'goal'}<p class="goal">{p.text}</p>
				{:else if p.part === 'lines'}
					<div class="lines"><h4>{p.label}</h4>
						<ul>{#each p.lines as l (l.id)}<li><span class="cid">{l.id}</span> <span>{l.text}</span>{#if !l.must}{' '}<span class="pill nice">nice</span>{/if}</li>{/each}</ul>
					</div>
				{:else if p.part === 'deps'}
					<p class="row"><span class="label">Depends on</span> {#each p.deps as dep, j (dep.id)}{j ? ', ' : ''}<button class="link" onclick={() => onopenintent(dep.id)}>{dep.title}</button> <span class="muted">({STAGE_NAME[dep.stage]})</span>{/each}{#if p.held}{' '}<span class="held-tag">Held</span>{/if}</p>
				{:else if p.part === 'progress'}
					<p class="row"><span class="label">{p.label}</span> <strong>{p.passed} of {p.of}</strong> {@render chips(p.chips)}</p>
				{:else if p.part === 'work'}
					<p class="row"><span class="label">{p.label}</span>
						{#if p.pr}<a href="{REPO_URL}/pull/{p.pr}" target="_blank" rel="noopener">{p.text}</a>
						{:else if p.review}<button class="link" onclick={onopenwork}>{p.text}</button>
						{:else}<span class="muted">{p.text}</span>{/if}
					</p>
				{:else if p.part === 'reason'}<p class="reason" data-tone={p.tone}>{p.text}</p>
				{:else if p.part === 'steps'}
					<ol class="steps-compact" aria-label="Its way to production">{#each p.steps as st (st.key)}<li data-state={st.state} title={STEP_WORD[st.state]}><span class="mark">{STEP_MARK[st.state]}</span>{st.name}</li>{/each}</ol>
				{:else if p.part === 'outcome'}<p class="outcome">{p.text}{#if p.at}{' '}<span class="muted">· {when(p.at)}</span>{/if}</p>
				{/if}
			{/each}
		</section>

		<!-- the rest, kept whole in tabs; a tab with nothing in it is not shown -->
		<div class="band">
			<div class="tabs" role="tablist" aria-label="More of it">
				{#each d.tabs as t (t)}
					<button role="tab" aria-selected={current === t} class:on={current === t} onclick={() => (tab = t)}>{TAB_NAME[t]}</button>
				{/each}
			</div>
		</div>

		<div class="panel" role="tabpanel" aria-label={TAB_NAME[current]}>
			{#if current === 'spec' && i.spec}
				<!-- its two steps (Samuel 2026-11-06): what it takes away first, then the MVP -->
				<h3>Goal</h3>
				<div class="md">{@html md(i.spec.goal)}</div>
				<h3>Scope</h3>
				<div class="md">{@html md(i.spec.scope)}</div>
				<h3>Reduce <span class="muted small">what it removes, simplifies or compacts first</span></h3>
				{#if i.spec.checks.some((c) => c.step === 'reduce')}<p class="small">{i.spec.checks.filter((c) => c.step === 'reduce').map((c) => c.id).join(', ')}: in Checks.</p>
				{:else if i.spec.nothing_to_reduce}<p class="small"><span class="muted">Nothing to reduce:</span> {i.spec.nothing_to_reduce}</p>
				{:else}<p class="muted small">Specified before the reduce step: none named.</p>{/if}
				<h3>MVP</h3>
				<p class="small">{i.spec.checks.filter((c) => c.step !== 'reduce').map((c) => c.id).join(', ') || 'No checks.'}{i.spec.checks.some((c) => c.step !== 'reduce') ? ': in Checks.' : ''}</p>
			{:else if current === 'checks' && i.spec}
				{@const reduce = i.spec.checks.filter((c) => c.step === 'reduce')}
				{@const mvp = i.spec.checks.filter((c) => c.step !== 'reduce')}
				<p class="muted small">{i.stage === 'specify' ? 'What will be checked, once approved.' : 'Once every must check passes, it moves to Proposal by itself.'}</p>
				{#if reduce.length}<h3>Reduce</h3>{@render checkList(reduce)}{/if}
				{#if mvp.length}<h3>MVP</h3>{@render checkList(mvp)}{/if}
			{:else if current === 'changes'}
				{#if !i.work && i.pull_request}<p class="small">Code: <a href="{REPO_URL}/pull/{i.pull_request}" target="_blank" rel="noopener">pull request #{i.pull_request}</a> <span class="muted">· {i.stage === 'proposal' ? 'Accept merges it into main and ships it' : i.stage === 'ship' ? (i.ship?.pending ? 'in Ship, merged in its turn' : 'merged, on its way to production') : i.stage === 'accepted' ? 'in production' : 'named by its agent'}</span></p>
				{:else if i.work}
					{@const w = i.work}
					<ul class="linked">
						<li>
							<button class="open" onclick={onopenwork}>
								<span class="type" data-type={typeOf(w)}>{typeOf(w)}</span>
								<span class="what">{w.label} <span class="muted">{titleOf(w)}</span>{#if (w.docs ?? 1) > 1}<span class="muted">{' '}· and {w.docs! - 1} more {w.docs === 2 ? 'document' : 'documents'}, accepted together</span>{/if}</span>
								<span class="pill">{w.status === 'proposal' ? 'waiting' : w.status}</span>
								<span class="date muted">{shortWhen(w.created)}</span>
							</button>
						</li>
					</ul>
					{#if w.note}<p class="muted small">{w.note}</p>{/if}
				{/if}
				{#if i.came_with}<p class="muted small">Proposed for <button class="link" onclick={() => onopenintent(i.came_with!)}>{cameWith ?? 'another intent'}</button>, beside the work it kept.</p>{/if}
			{:else if current === 'ship'}
				{#if i.ship?.outcome === 'red' && i.ship.report}
					{@const rep = i.ship.report}
					<!-- a red ship: what went red, where, and the log's last lines; Accept ships it again -->
					<section class="ship-report" aria-label="The ship's report">
						<h3>Not shipped: red at {rep.step}</h3>
						<p class="small">{rep.why}{#if rep.link}{' · '}<a href={rep.link} target="_blank" rel="noopener">Open it on GitHub</a>{/if} <span class="muted">· {shortWhen(rep.at)}</span></p>
						{#if rep.log}<pre class="log" use:toEnd>{rep.log}</pre>{/if}
						<p class="muted small">{shipsAgain(i) ? `Accept ships it again (${i.ship.again === 'main' ? "main's failed jobs run again" : 'the release of ' + i.ship.merge.slice(0, 7) + ' again'}); or an agent fixes it in a new pull request of the intent, its checks recorded on its head.` : 'Accept merges its newer pull request and ships it.'}</p>
					</section>
				{/if}
				{#if notLive(i)}
					<!-- the reconcile's flag: its stage left as it is, its commit not in what play runs (rolled back, never merged) -->
					<p class="not-live" role="status">{notLive(i)}{i.ship?.merge ? ` (its merge ${i.ship.merge.slice(0, 7)} is not in it)` : ''}</p>
				{:else if i.ship?.note}<p class="muted small">{i.ship.note}</p>{/if}
				{#if i.ship?.steps?.length}
					{@const sh = i.ship}
					<section class="ship" aria-label="Its way to production">
						<h3>{i.stage === 'ship' ? 'Shipping' : i.stage === 'accepted' ? 'Shipped' : 'Its last ship'} <span class="muted small">#{sh.pr}{sh.merge ? ` as ${sh.merge.slice(0, 7)}` : ''} · accepted by {sh.by}{sh.round > 1 ? ` · round ${sh.round}` : ''}</span></h3>
						<ol class="steps-live">
							{#each sh.steps as st (st.key)}
								<li data-state={st.state}>
									<span class="mark" title={STEP_WORD[st.state]}>{STEP_MARK[st.state]}</span>
									<span class="name">{st.name}</span>
									<span class="muted small">{st.note ?? ''}{st.note && tookOf(st, now) ? ' · ' : ''}{tookOf(st, now)}</span>
									{#if st.link}<a class="small" href={st.link} target="_blank" rel="noopener">GitHub</a>{/if}
								</li>
							{/each}
						</ol>
					</section>
				{/if}
			{:else if current === 'deps'}
				{#if i.held_by?.length}<p class="small"><span class="held-tag">Held</span> until every intent it depends on is shipped: it waits for {i.held_by.map((x) => x.title).join(', ')}.</p>{/if}
				<h3>Depends on</h3>
				{#if i.depends_on?.length}<ul class="dep-list">{#each i.depends_on as x (x.id)}<li><button class="link" onclick={() => onopenintent(x.id)}>{x.title}</button> <span class="muted small">· {STAGE_NAME[x.stage]}{x.stage === 'accepted' ? ' · shipped' : ''}</span></li>{/each}</ul>{:else}<p class="muted small">Nothing.</p>{/if}
				{#if i.needed_by?.length}
					<h3>Needed by</h3>
					<ul class="dep-list">{#each i.needed_by as x (x.id)}<li><button class="link" onclick={() => onopenintent(x.id)}>{x.title}</button> <span class="muted small">· {STAGE_NAME[x.stage]}</span></li>{/each}</ul>
				{/if}
			{:else if current === 'history'}
				<ul class="history">
					<li>Added by {i.author ?? 'someone'}{#if i.via === 'mcp'}{' '}<span class="via" title="Added by an agent working for them over MCP">via MCP</span>{/if} <span class="muted">· {when(i.created)}</span></li>
					{#if i.specified_by && i.specified_at}<li>Specified by {i.specified_by} <span class="muted">· {when(i.specified_at)}</span></li>{/if}
					{#if i.approved_by && i.approved_at}<li>Spec approved by {i.approved_by} <span class="muted">· {when(i.approved_at)}</span></li>{/if}
					{#if i.decided_by && i.decided_at}<li>{i.stage === 'ship' || i.stage === 'proposal' ? 'Accepted' : STAGE_NAME[i.stage]} by {i.decided_by} <span class="muted">· {when(i.decided_at)}</span></li>{/if}
				</ul>
				{#if i.work_kind?.length}<p class="small">Declares its work: {i.work_kind.map(workKindName).join(', ')}</p>{/if}
				<!-- decided by a rule, not a person: which rule, the rule set's version it was decided by, and its reason -->
				{#each [['approve', 'Spec approved by rule'], ['accept', i.stage === 'ship' ? 'Accepted into Ship by rule' : 'Accepted by rule']] as [g, said] (g)}
					{@const a = i.auto?.[g as 'approve' | 'accept']}
					{#if a}
						<p class="auto-line"><span class="auto">Auto</span> {said} <a href="/rules/?rules={a.rules}&rule={a.rule}">{a.label}</a> <span class="muted">· the rules at {a.rules.slice(0, 12)} · {when(a.at)}</span><span class="why">{a.reason}</span></p>
					{/if}
				{/each}
				<!-- its steps back, each with its reason: an agent sends an intent back over MCP itself (step_back_intent), no
				     button here; only Approve spec moves it forward again (intent 5a78e0b7, Samuel 2026-11-07) -->
				{#if i.steps?.length}
					<h3>Steps back</h3>
					<ol class="steps-back" aria-label="Steps back">
						{#each i.steps as s, n (n)}
							<li><span class="meta">Back from {STAGE_NAME[s.from] ?? s.from} to {STAGE_NAME[s.to] ?? s.to} by {s.by ?? 'someone'} <span class="via">via MCP</span> · {when(s.at)}</span><span class="why">{s.reason}</span></li>
						{/each}
					</ol>
				{/if}
				{#if i.sub}<p class="muted small">Now: {i.sub.why}</p>{/if}
			{:else if current === 'note'}
				<div class="md">{@html md(i.note)}</div>
			{:else if current === 'agent' && briefText}
				<p class="muted small">Give this to an agent with play's MCP server: what to do with the intent at its stage, the Intents skill's (get_intent gives it the same).</p>
				<pre class="brief">{briefText}</pre>
				<button class="btn small ghost" onclick={() => copyBrief(briefText)}>{copied ? 'Copied' : 'Copy the brief'}</button>
			{/if}
		</div>
	</div>

	<!-- a refused decision's reason at the foot, right above the buttons (Samuel 2026-11-06) -->
	{#if refused}<p class="refused" role="alert">{refused}</p>{/if}
	<!-- the decision at its foot, always in sight: Reject (it ends archived) on the left, the stage's one decision on the
	     right, primary, its reason under it while it may not be taken. No Close: Back, Escape or the scrim close it. -->
	{#if d.decision || d.reject}
		<footer class="decide">
			<div class="buttons">
				{#if d.reject}<button class="btn reject" onclick={() => ondecide('reject')} title="Not to be done: it ends archived">Reject</button>{/if}
				{#if d.decision}
					{@const dec = d.decision}
					<button class="btn primary" class:ghost={dec.verdict === 'reopen'} onclick={() => ondecide(dec.verdict)} disabled={!dec.enabled || merging} title={dec.why}>{merging ? 'Accepting…' : dec.label}</button>
				{/if}
			</div>
			{#if d.decision && !d.decision.enabled && d.decision.why}<p class="why-not">{d.decision.why}</p>{/if}
		</footer>
	{/if}
</div>

<style>
	/* an intent opened: a panel in the middle of the screen over a scrim; its header and its decision stay, what is
	   between them scrolls, the tabs sticky at its top */
	.scrim { all: unset; position: absolute; inset: 0; z-index: 9; border-radius: inherit; background: rgb(38 56 44 / 0.28); }
	.review { position: absolute; z-index: 10; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(48rem, calc(100% - 1rem)); max-height: calc(100% - 1rem); box-sizing: border-box; background: var(--bg, #fbf8f2); border-radius: 16px; box-shadow: 0 20px 60px rgb(0 0 0 / 0.25); display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem 1.1rem 0.8rem; overflow: hidden; }
	@media (max-width: 520px) { .review { padding: 0.8rem 0.8rem 0.7rem; height: calc(100% - 1rem); } }
	.review-head { flex: 0 0 auto; min-width: 0; }
	.review-head h2 { margin: 0; font-size: 1.3rem; line-height: 1.25; }
	/* ‹ Intents: back to the board; a tap's height (44 px), drawn as a quiet link */
	.to-board { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; min-height: 44px; margin: -0.65rem 0 -0.35rem -0.45rem; padding: 0 0.6rem 0 0.45rem; border-radius: 10px; font-size: 0.88rem; font-weight: 600; color: var(--ink-soft, #4d5d51); }
	.to-board:hover { background: color-mix(in srgb, var(--ink, #26382c) 6%, transparent); color: var(--ink, #1f2a22); }
	.to-board:focus-visible { outline: 2px solid var(--ink, #222); outline-offset: -2px; }
	.tags { margin: 0 0 0.3rem; display: flex; gap: 0.35rem; align-items: center; white-space: nowrap; min-width: 0; }
	.tags [data-sub] { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
	.tags [data-sub]::first-letter { text-transform: uppercase; }
	.item-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }

	/* the top: the stage's parts, short lines, nothing an agent alone needs */
	.top { display: flex; flex-direction: column; gap: 0.55rem; padding: 0.15rem 0 0.8rem; font-size: 0.95rem; line-height: 1.45; }
	.top p { margin: 0; overflow-wrap: anywhere; }
	.want, .goal { font-size: 1rem; }
	.next { color: var(--ink-soft, #4d5d51); font-size: 0.88rem; }
	.row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.25rem 0.45rem; }
	.label, .lines h4 { flex: 0 0 auto; margin: 0; color: var(--accent, #2f6b4f); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
	.lines ul { list-style: none; margin: 0.2rem 0 0; padding: 0; display: grid; gap: 0.2rem; }
	.lines li { display: flex; gap: 0.4rem; align-items: baseline; font-size: 0.9rem; }
	.chips { display: inline-flex; flex-wrap: wrap; gap: 0.25rem; }
	.chk { padding: 0 0.5em; border-radius: 999px; font-size: 0.74rem; font-weight: 600; background: var(--paper, #f6f1e6); color: var(--muted, #777); white-space: nowrap; }
	.chk.pass { background: color-mix(in srgb, var(--sage, #8fae8b) 40%, transparent); color: var(--brand-green, #24452f); }
	.chk.fail { background: color-mix(in srgb, var(--terracotta, #c8744f) 25%, transparent); color: #9c3b22; }
	.chk.nice { opacity: 0.75; font-style: italic; }
	.reason { padding: 0.35rem 0.6rem; border-radius: 8px; font-size: 0.88rem; border-left: 3px solid var(--tone); background: color-mix(in srgb, var(--tone) 10%, transparent); }
	.reason[data-tone='failed'] { --tone: #9c3b22; color: #9c3b22; font-weight: 600; }
	.reason[data-tone='held'] { --tone: var(--muted, #777); }
	.reason[data-tone='info'] { --tone: var(--mustard, #efb54d); }
	.outcome { font-weight: 600; }
	.steps-compact { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.3rem 0.8rem; font-size: 0.86rem; }
	.steps-compact li { display: inline-flex; align-items: center; gap: 0.3rem; }
	.steps-compact li[data-state='queued'] { color: var(--muted, #777); }

	/* the tabs' band, sticky at the top of what scrolls, in the aside's style (play/SPEC.md §4.15 One aside); on a
	   narrow screen it scrolls sideways */
	.band { position: sticky; top: 0; z-index: 1; margin: 0 -0.2rem; padding: 0.3rem 0.2rem 0.45rem; background: var(--bg, #fbf8f2); overflow-x: auto; scrollbar-width: none; text-align: center; }
	.band::-webkit-scrollbar { display: none; }
	.tabs { display: inline-flex; gap: 2px; padding: 3px; border-radius: 999px; background: rgb(0 0 0 / 0.06); white-space: nowrap; }
	.tabs button { font: inherit; color: inherit; border: 0; cursor: pointer; flex: 0 0 auto; padding: 0.32rem 0.9rem; border-radius: 999px; background: none; font-size: 0.8rem; font-weight: 600; }
	.tabs button.on { background: var(--paper, #fff); box-shadow: 0 1px 2px rgb(0 0 0 / 0.12); }
	.tabs button:focus-visible { outline: 2px solid var(--ink, #222); outline-offset: -2px; }
	.panel { padding: 0.4rem 0 0.6rem; font-size: 0.9rem; }
	.panel h3 { margin: 0.8rem 0 0.35rem; font-size: 0.95rem; }
	.panel h3:first-child { margin-top: 0.2rem; }
	.panel > p { margin: 0 0 0.4rem; }

	.type { display: inline-block; padding: 0 0.45em; border-radius: 999px; background: var(--mustard-soft); color: var(--ink); font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
	[data-kind='idea'] { --kind: var(--mustard, #efb54d); }
	[data-kind='fix'] { --kind: var(--terracotta, #c8744f); }
	[data-kind='improve'] { --kind: var(--sage, #a8b88a); }
	.type[data-kind] { background: color-mix(in srgb, var(--kind) 35%, transparent); }
	.pill.shipping { background: color-mix(in srgb, var(--mustard, #efb54d) 35%, transparent); }
	.pill.nice { font-size: 0.68rem; padding: 0 0.45em; }
	[data-sub] { --sub: var(--ink-soft, #4d5d51); }
	[data-sub='failed'] { --sub: #9c3b22; color: #9c3b22; }
	[data-sub='waiting'] { --sub: var(--brand-green, #24452f); }
	.via, .auto { display: inline-block; padding: 0 0.45em; border-radius: 999px; background: var(--mustard-soft); color: var(--ink); font-size: 0.72rem; font-weight: 600; }
	.auto { background: color-mix(in srgb, var(--brand-green, #26382c) 18%, transparent); }
	.auto-line { margin: 0.3rem 0 0; font-size: 0.82rem; }
	.auto-line .why { display: block; margin-top: 0.1rem; color: var(--ink-soft); font-size: 0.78rem; }
	.held-tag { display: inline-block; padding: 0 0.5em; border-radius: 999px; background: color-mix(in srgb, #9c3b22 15%, transparent); color: #9c3b22; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.02em; }
	.dep-list, .history { margin: 0.2rem 0; padding-left: 1.1rem; font-size: 0.86rem; }
	.history { list-style: none; padding: 0; display: grid; gap: 0.2rem; }
	.not-live { font-weight: 600; color: #9c3b22; margin: 0.4rem 0; }
	.link { all: unset; cursor: pointer; text-decoration: underline; font-weight: 600; color: var(--brand-green, #24452f); }
	.link:focus-visible { outline: 2px solid var(--mustard); }
	.small { font-size: 0.8rem; }
	.meta { font-size: 0.78rem; color: var(--muted, #777); }

	/* Ship: its way to production, step by step, live; a red ship's report */
	.ship, .ship-report { margin-bottom: 0.6rem; padding: 0.7rem 0.9rem; border-radius: 12px; border: 1px solid var(--line, #dcd5c4); background: var(--card, #fff); }
	.ship h3, .ship-report h3 { margin: 0 0 0.4rem; }
	.ship h3 .small { font-weight: 400; margin-left: 0.3rem; }
	.ship-report { border-color: color-mix(in srgb, var(--terracotta, #c8744f) 60%, transparent); background: color-mix(in srgb, var(--terracotta, #c8744f) 8%, var(--card, #fff)); }
	.ship-report p { margin: 0 0 0.4rem; }
	.ship-report .log { margin: 0 0 0.4rem; max-height: 16rem; overflow: auto; padding: 0.5rem 0.65rem; border-radius: 8px; background: #1f2a22; color: #e9efe6; font-size: 0.72rem; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; }
	.steps-live { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.25rem; }
	.steps-live li { display: grid; grid-template-columns: 1.4rem minmax(0, auto) 1fr auto; gap: 0.5rem; align-items: center; font-size: 0.88rem; }
	.mark { width: 1.4rem; height: 1.4rem; display: grid; place-items: center; border-radius: 50%; font-weight: 700; font-size: 0.8rem; background: var(--paper, #f6f1e6); color: var(--muted, #777); }
	.steps-compact .mark { width: 1.15rem; height: 1.15rem; font-size: 0.68rem; }
	[data-state='green'] .mark { background: color-mix(in srgb, var(--sage, #8fae8b) 45%, transparent); color: var(--brand-green, #24452f); }
	[data-state='red'] .mark { background: color-mix(in srgb, var(--terracotta, #c8744f) 30%, transparent); color: #9c3b22; }
	[data-state='running'] .mark { background: color-mix(in srgb, var(--mustard, #efb54d) 40%, transparent); color: var(--ink, #1f2a22); animation: beat 1.2s ease-in-out infinite; }
	.steps-live li[data-state='queued'] .name { color: var(--muted, #777); }
	@keyframes beat { 50% { opacity: 0.45; } }
	@media (prefers-reduced-motion: reduce) { [data-state='running'] .mark { animation: none; } }

	/* its steps back, and its note and spec as Markdown */
	.steps-back { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
	.steps-back li { display: flex; flex-direction: column; gap: 0.1rem; padding: 0.4rem 0.6rem; border-left: 3px solid var(--muted, #999); background: var(--paper, #faf8f2); border-radius: 0 8px 8px 0; }
	.steps-back .why { font-size: 0.88rem; overflow-wrap: anywhere; }
	.md { font-size: 0.92rem; line-height: 1.5; overflow-wrap: anywhere; }
	.md :global(:first-child) { margin-top: 0; }
	.md :global(:last-child) { margin-bottom: 0; }
	.md :global(ul), .md :global(ol) { padding-left: 1.3rem; }
	.md :global(pre) { white-space: pre-wrap; background: var(--paper, #faf8f2); padding: 0.5rem 0.7rem; border-radius: 8px; }
	.md :global(table) { display: block; overflow-x: auto; border-collapse: collapse; font-size: 0.85rem; }
	.md :global(th), .md :global(td) { border: 1px solid var(--line, #dcd5c4); padding: 0.25rem 0.45rem; vertical-align: top; }

	/* its checks: each its mark (✓ passed, ✗ failed, · no result yet), its statement, how and by what it is checked,
	   its run, and its last result's evidence and where it ran */
	.checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
	.checks li { display: flex; gap: 0.55rem; align-items: flex-start; padding: 0.45rem 0.6rem; border-radius: 10px; background: var(--card, #fff); border: 1px solid var(--line, #dcd5c4); }
	.checks li.pass { border-color: color-mix(in srgb, var(--sage, #8fae8b) 70%, transparent); }
	.checks li.fail { border-color: color-mix(in srgb, var(--terracotta, #c8744f) 60%, transparent); }
	.checks .mark { flex: 0 0 1.4rem; }
	.checks li.pass .mark { background: color-mix(in srgb, var(--sage, #8fae8b) 45%, transparent); color: var(--brand-green, #24452f); }
	.checks li.fail .mark { background: color-mix(in srgb, var(--terracotta, #c8744f) 30%, transparent); color: #9c3b22; }
	.checks .what { min-width: 0; flex: 1 1 auto; }
	.checks .what p { margin: 0; font-size: 0.88rem; overflow-wrap: anywhere; }
	.checks .what p + p { margin-top: 0.15rem; }
	.cid { font-family: ui-monospace, monospace; font-size: 0.76rem; color: var(--muted, #777); margin-right: 0.15rem; }
	.how { font-weight: 600; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.04em; }
	.evidence { white-space: pre-line; color: var(--ink-soft, #4d5d51); }
	.checks code.run { display: block; margin-top: 0.2rem; padding: 0.25rem 0.45rem; border-radius: 6px; background: var(--paper, #f6f1e6); font-family: ui-monospace, monospace; font-size: 0.74rem; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--ink, #1f2a22); }
	.where { display: inline-block; padding: 0 0.4em; border-radius: 999px; font-size: 0.68rem; font-weight: 600; background: var(--paper, #f6f1e6); color: var(--muted, #777); white-space: nowrap; }
	.where.main { background: color-mix(in srgb, var(--sage, #8fae8b) 40%, transparent); color: var(--brand-green, #24452f); }

	/* its work, a tap away */
	.linked { list-style: none; margin: 0 0 0.4rem; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.3rem; }
	.linked .open { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.4rem 0.55rem; border-radius: 10px; background: var(--paper, #faf8f2); border: 1px solid var(--line, #dcd5c4); font-size: 0.88rem; }
	.linked .what { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
	.linked .date { font-size: 0.76rem; white-space: nowrap; }
	@media (max-width: 520px) { .linked .date { display: none; } }
	.brief { margin: 0 0 0.5rem; padding: 0.6rem 0.75rem; border-radius: 10px; background: var(--paper, #faf8f2); border: 1px solid var(--line, #dcd5c4); font-size: 0.8rem; line-height: 1.45; white-space: pre-wrap; word-break: break-word; user-select: all; }

	/* the foot: a refused decision's reason, then Reject and the one decision, primary, its reason under it if it is
	   disabled */
	.refused { flex: 0 0 auto; margin: 0; padding: 0.45rem 0.7rem; border-radius: 10px; font-size: 0.85rem; line-height: 1.4; max-height: 5.6em; overflow-y: auto; overflow-wrap: anywhere; color: #9c3b22; background: color-mix(in srgb, var(--terracotta, #c8744f) 12%, var(--card, #fff)); border: 1px solid color-mix(in srgb, var(--terracotta, #c8744f) 45%, transparent); }
	.decide { flex: 0 0 auto; padding: 0.6rem 0 0.1rem; border-top: 1px solid var(--line, #dcd5c4); }
	.buttons { display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem; }
	.decide .btn { min-height: 44px; justify-content: center; }
	.btn.primary { flex: 0 1 15rem; }
	.btn.reject { margin-right: auto; background: color-mix(in srgb, var(--terracotta, #c8744f) 14%, transparent); color: #9c3b22; border-color: color-mix(in srgb, var(--terracotta, #c8744f) 55%, transparent); }
	.btn.reject:hover { background: color-mix(in srgb, var(--terracotta, #c8744f) 26%, transparent); filter: none; }
	.why-not { margin: 0.35rem 0 0; text-align: right; font-size: 0.78rem; color: var(--ink-soft, #4d5d51); overflow-wrap: anywhere; }
	@media (max-width: 520px) { .btn.primary { flex: 1 1 auto; } .why-not { text-align: left; } }
</style>
