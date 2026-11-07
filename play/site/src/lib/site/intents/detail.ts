/**
 * AN INTENT'S DETAIL, BY STAGE (intent bb3b0773, Samuel 2026-11-07; play/SPEC.md §4.12 *The detail, by stage*): what a
 * person needs at the moment the intent is in, on top (what it is, where it stands, the one decision its stage asks for),
 * and everything else kept whole in tabs. One pure function, `detailOf`, decides it for every stage; ./IntentDetail.svelte
 * only draws what it says (no `{#if stage === …}` chain decides the layout). Nothing on top is a run command, a hash, a
 * check's evidence or the brief: those are the agents', in the tabs.
 *
 * The intent's types, as play's API serves them (play/api/src/intents.ts), are kept here too, for the board and the detail.
 */

/** an intent's work, as the board lists it: what it changes, the version it would be, who proposed it and how, its status */
export type Work = { kind: string; what: string | null; doc: string | null; doc_variant: number | null; docs?: number; asset_id: string | null; label: string; grp: string; slug: string | null; version_label: string | null; number: number | null; status: string; note: string; author: string | null; decided_by: string | null; created: string; decided_at?: string | null; via?: 'web' | 'mcp' };
export type Kind = 'idea' | 'fix' | 'improve';
export type Stage = 'idea' | 'specify' | 'build' | 'proposal' | 'ship' | 'accepted' | 'archived';
/** its way to production once merged (play/api/src/ship.ts): each step's state, when, its link; a red one's report */
export type ShipStep = { key: string; name: string; state: 'queued' | 'running' | 'green' | 'red' | 'skipped'; started?: string; finished?: string; link?: string; note?: string };
export type Ship = { pr: number; head: string; merge: string; by: string; round: number; started: string; steps: ShipStep[]; report?: { step: string; why: string; link?: string; log: string; at: string } | null; ended?: string; outcome?: 'green' | 'red'; again?: 'main' | 'release'; pending?: { kind: 'merge' | 'main' | 'release'; head?: string } | null; accepted?: string; live?: boolean; commit?: string; note?: string };
/** run: the command that decides a check in avenBOX; step: reduce first, then the MVP (specs from before have none: mvp) */
export type Check = { id: string; check: string; how: 'test' | 'measure' | 'look'; by: string; run?: string; must: boolean; step?: 'reduce' | 'mvp' };
export type Spec = { goal: string; scope: string; checks: Check[]; nothing_to_reduce?: string };
/** where: in avenBOX (the agent's), or on main after the merge (.github/workflows/intents.yml), on which commit */
export type Results = Record<string, { pass: boolean; evidence: string; by: string | null; at: string; where?: 'avenBOX' | 'main'; commit?: string }>;
/** one step back an agent took over MCP, with its reason (play/api/src/stepback.ts) */
export type StepBack = { at: string; by: string | null; via: 'mcp'; from: Stage; to: Stage; reason: string };
/** a decision a rule made (play/SPEC.md §4.12 "Auto-accept rules"): the rule, the rule set's version, its reason */
export type AutoEntry = { rule: string; label: string; rules: string; reason: string; at: string };
/** an intent it depends on, or one that depends on it (play/api/src/intents.ts heldBy), by its UUID */
export type Dep = { id: string; title: string; stage: Stage };
/** its sub-state (play/api/src/substate.ts): a person needed (failed, waiting) or not (working, idle), and why */
export type Sub = { state: 'failed' | 'waiting' | 'working' | 'idle'; tag: string; why: string };
/** what GitHub last said of its pull request (play/api/src/substate.ts PrSeen), as far as the detail reads it */
export type PrSeen = { pr: number; draft: boolean; state?: string; merged?: boolean; mergeable?: boolean | null };
export type Intent = {
	id: string; kind: Kind; title: string; note: string; stage: Stage; via: 'web' | 'mcp'; created: string; author: string | null;
	spec: Spec | null; results: Results | null; specified_at: string | null; specified_by: string | null; approved_at: string | null; approved_by: string | null;
	decided_at: string | null; decided_by: string | null; came_with: string | null; work: Work | null; pull_request: number | null; ship: Ship | null; sub: Sub | null;
	auto?: { approve?: AutoEntry; accept?: AutoEntry }; work_kind?: string[] | null; steps?: StepBack[]; depends_on?: Dep[]; held_by?: Dep[]; needed_by?: Dep[]; pr_seen?: PrSeen | null;
};

export const STAGE_NAME: Record<Stage, string> = { idea: 'Idea', specify: 'Specify', build: 'Build', proposal: 'Proposal', ship: 'Ship', accepted: 'Accepted', archived: 'Archived' };

/** whether an intent's Accept ships it: it names its pull request (with play's work beside it or not: intent 7c8986c5) */
export const isCode = (i: Intent) => !!i.pull_request;
/** its pull request merged by an earlier ship that went red: Accept ships that again */
export const shipsAgain = (i: Intent) => isCode(i) && !!i.ship?.merge && i.ship.pr === i.pull_request && i.ship.outcome === 'red';
/** a person may decide it now (the API refuses the rest): waiting, or red after its merge (Accept ships it again) */
export const decidable = (i: Intent) => i.sub?.state === 'waiting' || shipsAgain(i);
/** the reconcile's flag (play/api/src/ship.ts reconcile): its commit not in what play runs */
export const notLive = (i: Intent) => (i.ship?.live === false && i.ship.commit ? `not live: production runs ${i.ship.commit.slice(0, 7)}` : '');

// ---- what goes on top

/** a check as a chip: its id and its last result, nothing else */
export type Chip = { id: string; must: boolean; state: 'pass' | 'fail' | 'none'; text: string };
/** one part of the top, drawn by ./IntentDetail.svelte in the order given */
export type Part =
	/** what is wanted (Idea): the note's first lines */
	| { part: 'want'; text: string }
	/** one quiet line of what happens next */
	| { part: 'next'; text: string }
	/** the goal in a sentence */
	| { part: 'goal'; text: string }
	/** checks as one line each: their statement's headline and must or nice, never their run */
	| { part: 'lines'; label: string; lines: { id: string; text: string; must: boolean }[] }
	/** what it depends on, and whether that holds it */
	| { part: 'deps'; deps: Dep[]; held: boolean }
	/** musts passed n of m, every check as a chip */
	| { part: 'progress'; passed: number; of: number; chips: Chip[]; label: string }
	/** who builds it, or what it changes: a pull request (opened on GitHub) or play's work (its review opened here) */
	| { part: 'work'; label: string; text: string; pr?: number; review?: boolean }
	/** a line in its colour: a failure, a hold, a red ship, a note */
	| { part: 'reason'; tone: 'failed' | 'held' | 'info'; text: string }
	/** the live steps to production, compact */
	| { part: 'steps'; steps: { key: string; name: string; state: ShipStep['state'] }[] }
	/** what shipped, or why it ended, and when */
	| { part: 'outcome'; text: string; at: string | null };

/** the one decision the stage asks for: its primary button (null where there is none), and Reject beside it where it may */
export type Decision = {
	/** what the button posts (play/api: /intents/<id>/<verdict>) */
	verdict: 'approve' | 'accept' | 'reopen';
	label: 'Approve spec' | 'Accept' | 'Accept and ship' | 'Ship again' | 'Reopen';
	enabled: boolean;
	/** what it does, or, disabled, why not (shown under it) */
	why: string;
} | null;

export type TabId = 'spec' | 'checks' | 'changes' | 'ship' | 'deps' | 'history' | 'note' | 'agent';
export const TABS: [TabId, string][] = [
	['spec', 'Spec'],
	['checks', 'Checks'],
	['changes', 'Changes'],
	['ship', 'Ship'],
	['deps', 'Dependencies'],
	['history', 'History'],
	['note', 'Note'],
	['agent', 'For an agent']
];

export type Detail = { top: Part[]; decision: Decision; reject: boolean; tabs: TabId[]; tab: TabId };

/** Markdown taken down to plain words for one line (the full text stays in its tab) */
const plain = (s: string) =>
	s
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]*)`/g, '$1')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
		.replace(/^\s{0,3}(#+|[-*+]|\d+\.|>)\s+/gm, '')
		.replace(/\s+/g, ' ')
		.trim();
/** at most `n` characters, cut at a word */
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n).replace(/\s+\S*$/, '')}…`);
/** a text's first sentence */
export const firstSentence = (s: string) => {
	const p = plain(s);
	const m = p.match(/^.+?[.!?](?=\s|$)/);
	return clip(m ? m[0] : p, 240);
};
/** a check's headline: its statement up to its first colon where it has one ("The board and the detail are apart: …") */
export const headline = (s: string) => {
	const p = plain(s);
	const colon = p.indexOf(': ');
	return clip(colon > 12 && colon < 140 ? p.slice(0, colon) : (p.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? p), 140);
};
/** what is wanted: the note's first lines (its first paragraph), else nothing */
const wantOf = (note: string) => {
	const first = (note ?? '').split(/\n\s*\n/).find((x) => x.trim()) ?? '';
	return first ? clip(plain(first), 280) : '';
};

const chipsOf = (i: Intent): Chip[] => (i.spec?.checks ?? []).map((c) => ({ id: c.id, must: c.must, text: headline(c.check), state: i.results?.[c.id] ? (i.results[c.id].pass ? 'pass' : 'fail') : 'none' }));
const progressOf = (i: Intent, label: string): Part | null => {
	const musts = i.spec?.checks.filter((c) => c.must) ?? [];
	if (!i.spec?.checks.length) return null;
	return { part: 'progress', passed: musts.filter((c) => i.results?.[c.id]?.pass === true).length, of: musts.length, chips: chipsOf(i), label };
};
const depsOf = (i: Intent): Part | null => (i.depends_on?.length ? { part: 'deps', deps: i.depends_on, held: !!i.held_by?.length } : null);
const goalOf = (i: Intent): Part | null => (i.spec?.goal ? { part: 'goal', text: firstSentence(i.spec.goal) } : null);
/** its pull request in words: its number and how GitHub last saw it (draft, ready, merged, closed) */
const prText = (i: Intent) => {
	const seen = i.pr_seen && i.pr_seen.pr === i.pull_request ? i.pr_seen : null;
	const state = seen ? (seen.merged ? ', merged' : seen.state === 'closed' ? ', closed' : seen.draft ? ', a draft' : ', ready') : '';
	return `pull request #${i.pull_request}${state}`;
};
/** its work in a line: play's (a version of a document, and how many more), its pull request (draft or ready), or both (intent 7c8986c5) */
const workOf = (i: Intent, label: string): Part | null => {
	const w = i.work;
	if (w) {
		const more = (w.docs ?? 1) > 1 ? `, and ${w.docs! - 1} more ${w.docs === 2 ? 'document' : 'documents'}` : '';
		const code = i.pull_request ? `; ${prText(i)}` : '';
		return { part: 'work', label, text: `play's work: ${w.label} ${w.number == null ? 'a change' : `v${w.number}`}${more}${code}`, review: true };
	}
	if (i.pull_request) return { part: 'work', label, text: prText(i), pr: i.pull_request };
	return null;
};

/** what an intent's detail shows at its stage: the top's parts, the decision, whether it may be rejected, its tabs and the one opened first */
export function detailOf(i: Intent, opts: { brief?: string | null } = {}): Detail {
	const top: (Part | null)[] = [];
	let decision: Decision = null;
	let reject = false;
	let tab: TabId = 'spec';
	const failed = i.sub?.state === 'failed' ? ({ part: 'reason', tone: 'failed', text: i.sub.why } as Part) : null;
	const held = i.held_by?.length ? ({ part: 'reason', tone: 'held', text: `Held: waits for ${i.held_by.map((d) => d.title).join(', ')}` } as Part) : null;
	switch (i.stage) {
		case 'idea':
			top.push(wantOf(i.note) ? { part: 'want', text: wantOf(i.note) } : null, { part: 'next', text: 'An agent specifies it next.' });
			reject = true;
			// the note is on top already: the brief that sends an agent to specify it
			tab = 'agent';
			break;
		case 'specify': {
			const reduce = i.spec?.checks.filter((c) => c.step === 'reduce') ?? [];
			const mvp = i.spec?.checks.filter((c) => c.step !== 'reduce') ?? [];
			const line = (c: Check) => ({ id: c.id, text: headline(c.check), must: c.must });
			top.push(
				goalOf(i),
				reduce.length ? { part: 'lines', label: 'Removes first', lines: reduce.map(line) } : i.spec?.nothing_to_reduce ? { part: 'lines', label: 'Removes first', lines: [{ id: '—', text: `Nothing: ${headline(i.spec.nothing_to_reduce)}`, must: false }] } : null,
				mvp.length ? { part: 'lines', label: 'Checked by', lines: mvp.map(line) } : null,
				depsOf(i),
				failed
			);
			if (i.spec) decision = { verdict: 'approve', label: 'Approve spec', enabled: decidable(i), why: decidable(i) ? 'The spec is right: an agent may build it.' : (i.sub?.why ?? '') };
			reject = true;
			tab = 'spec';
			break;
		}
		case 'build':
			top.push(progressOf(i, 'Checks passed'), workOf(i, 'Built in') ?? { part: 'work', label: 'Built in', text: 'no pull request or work of play’s yet' }, held, failed);
			reject = true;
			tab = 'checks';
			break;
		case 'proposal': {
			const rep = i.ship?.outcome === 'red' ? i.ship.report : null;
			top.push(goalOf(i), progressOf(i, 'Checks passed'), workOf(i, 'What changes'), rep ? { part: 'reason', tone: 'failed', text: `Not shipped: red at ${rep.step}. ${rep.why}` } : failed, rep ? null : held);
			const label = isCode(i) ? (shipsAgain(i) ? 'Ship again' : 'Accept and ship') : 'Accept';
			const ok = decidable(i);
			decision = {
				verdict: 'accept',
				label,
				enabled: ok,
				why: !ok
					? (i.sub?.why ?? '')
					: isCode(i)
						? (shipsAgain(i) ? 'The release (or main’s failed jobs) runs again.' : `Merged into main in its turn, then to production.`) + (i.work ? ' Its work of play’s is accepted once its code is live.' : '')
						: i.work
							? 'Applies its work: what it asked is in.'
							: 'What it asked is in.'
			};
			reject = true;
			tab = i.work || i.pull_request ? 'changes' : 'checks';
			break;
		}
		case 'ship':
			top.push(i.ship?.steps?.length ? { part: 'steps', steps: i.ship.steps.map((s) => ({ key: s.key, name: s.name, state: s.state })) } : null, i.sub?.why ? { part: 'reason', tone: 'info', text: i.sub.why } : null);
			tab = 'ship';
			break;
		case 'accepted':
		case 'archived': {
			const live = notLive(i);
			const at = i.ship?.accepted ?? i.decided_at;
			const by = i.decided_by ? ` by ${i.decided_by}` : '';
			let text: string;
			if (i.stage === 'archived') {
				const back = i.steps?.length ? i.steps[i.steps.length - 1] : null;
				text = i.decided_by ? `Rejected${by}: it ended archived.` : back ? `Archived: ${back.reason}` : 'Archived.';
			} else if (i.work && i.ship?.merge) text = `${i.work.label} ${i.work.number == null ? 'changed' : `v${i.work.number}`}${(i.work.docs ?? 1) > 1 ? ` and ${i.work.docs! - 1} more` : ''}, with pull request #${i.ship.pr} merged and in production, accepted${by}.`;
			else if (i.work) text = `${i.work.label} ${i.work.number == null ? 'changed' : `v${i.work.number}`}, accepted${by}.`;
			else if (i.ship?.merge) text = `Pull request #${i.ship.pr} merged and in production${by ? `, accepted${by}` : ''}.`;
			else text = `Accepted${by}${i.auto?.accept ? ` (by rule ${i.auto.accept.label})` : ''}.`;
			top.push({ part: 'outcome', text, at }, live ? { part: 'reason', tone: 'failed', text: 'Not live: production runs another commit (the Ship tab says which).' } : null);
			decision = { verdict: 'reopen', label: 'Reopen', enabled: true, why: `Open again: back to ${i.spec ? 'Specify' : 'Idea'}.` };
			tab = 'history';
			break;
		}
	}
	const has: Record<TabId, boolean> = {
		spec: !!i.spec,
		checks: !!i.spec?.checks.length,
		changes: !!(i.work || i.pull_request || i.came_with),
		ship: !!(i.ship && (i.ship.steps?.length || i.ship.report || i.ship.note || notLive(i))),
		deps: !!(i.depends_on?.length || i.needed_by?.length),
		history: true,
		note: !!i.note?.trim(),
		agent: !!opts.brief
	};
	const tabs = TABS.map(([t]) => t).filter((t) => has[t]);
	return { top: top.filter((p): p is Part => !!p), decision, reject, tabs, tab: tabs.includes(tab) ? tab : tabs[0] };
}
