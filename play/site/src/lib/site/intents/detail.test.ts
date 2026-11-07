import { describe, expect, it } from 'vitest';
import { detailOf, headline, type Intent, type TabId } from './detail';
import { BRIEF, FIXTURES, HEAD, LIVE, MERGE, RUN } from './fixtures';

/** everything an agent needs and a person deciding does not, which must never be on top */
const forbidden = (i: Intent) => [
	RUN,
	HEAD,
	HEAD.slice(0, 7),
	MERGE,
	MERGE.slice(0, 7),
	LIVE.slice(0, 7),
	BRIEF,
	...(i.spec?.checks.flatMap((c) => (c.run ? [c.run] : [])) ?? []),
	...Object.values(i.results ?? {}).flatMap((r) => [r.evidence, ...(r.commit ? [r.commit, r.commit.slice(0, 7)] : [])]),
	...(i.ship?.report ? [i.ship.report.log] : [])
];
/** the tabs that have something in them, as the board would show it */
const withContent = (i: Intent, brief: string | null): TabId[] =>
	(
		[
			['spec', !!i.spec],
			['checks', !!i.spec?.checks.length],
			['changes', !!(i.work || i.pull_request || i.came_with)],
			['ship', !!(i.ship?.steps.length || i.ship?.report)],
			['deps', !!(i.depends_on?.length || i.needed_by?.length)],
			['history', true],
			['note', !!i.note],
			['agent', !!brief]
		] as [TabId, boolean][]
	)
		.filter(([, has]) => has)
		.map(([t]) => t);

describe('detailOf: every stage', () => {
	for (const [name, i] of Object.entries(FIXTURES)) {
		for (const brief of [BRIEF, null]) {
			it(`${name}${brief ? ', with its brief' : ''}: nothing an agent needs on top, every tab with content listed`, () => {
				const d = detailOf(i, { brief });
				const top = JSON.stringify(d.top);
				for (const f of forbidden(i)) expect(top, `${name}: "${f.slice(0, 40)}" on top`).not.toContain(f);
				expect(top).not.toMatch(/\b[0-9a-f]{40}\b/);
				expect(d.tabs).toEqual(withContent(i, brief));
				expect(d.tabs).toContain(d.tab);
				expect(d.top.length).toBeGreaterThan(0);
			});
		}
	}
});

describe('detailOf: the top and the decision, stage by stage', () => {
	it('Idea: what is wanted, an agent specifies it next, Reject only', () => {
		const d = detailOf(FIXTURES.idea);
		expect(d.top.map((p) => p.part)).toEqual(['want', 'next']);
		expect(d.decision).toBeNull();
		expect(d.reject).toBe(true);
		expect(d.tabs).not.toContain('spec');
	});
	it('Specify: the goal, what it removes first, its checks one line each, its dependencies; Approve spec', () => {
		const d = detailOf(FIXTURES.specify);
		expect(d.top.map((p) => p.part)).toEqual(['goal', 'lines', 'lines', 'deps']);
		const [, reduce, checks] = d.top as any[];
		expect(reduce.lines.map((l: any) => l.id)).toEqual(['c1', 'c2']);
		expect(checks.lines.map((l: any) => [l.id, l.must])).toEqual([['c3', true], ['c4', true], ['c5', true], ['c6', false]]);
		expect(reduce.lines[0].text).toBe('The board and the detail are apart');
		expect(d.decision).toMatchObject({ verdict: 'approve', label: 'Approve spec', enabled: true });
		expect(d.reject).toBe(true);
		expect(d.tab).toBe('spec');
	});
	it('Specify, not waiting: Approve spec disabled, its reason given', () => {
		const d = detailOf({ ...FIXTURES.specify, sub: { state: 'idle', tag: 'held', why: 'held: waits for X' } });
		expect(d.decision).toMatchObject({ enabled: false, why: 'held: waits for X' });
	});
	it('Build: progress as chips, who builds it, no decision but Reject', () => {
		const d = detailOf(FIXTURES.build);
		expect(d.top.map((p) => p.part)).toEqual(['progress', 'work']);
		expect(d.top[0]).toMatchObject({ passed: 2, of: 5 });
		expect(d.top[1]).toMatchObject({ pr: 2150, text: 'pull request #2150, a draft' });
		expect(d.decision).toBeNull();
		expect(d.reject).toBe(true);
		expect(d.tab).toBe('checks');
	});
	it('Build, held: what holds it', () => {
		const d = detailOf(FIXTURES['build-held']);
		expect(d.top.find((p) => p.part === 'reason')).toMatchObject({ tone: 'held' });
		expect(d.tabs).toContain('deps');
	});
	it('Build, failed: the failure in a line', () => {
		const d = detailOf(FIXTURES['build-failed']);
		expect(d.top.find((p) => p.part === 'reason')).toMatchObject({ tone: 'failed', text: 'c1 failed on its last run' });
		expect((d.top[0] as any).chips.find((c: any) => c.id === 'c1').state).toBe('fail');
	});
	it('Proposal, code: the goal, every must passed, the pull request; Accept and ship', () => {
		const d = detailOf(FIXTURES['proposal-code']);
		expect(d.top.map((p) => p.part)).toEqual(['goal', 'progress', 'work']);
		expect(d.top[1]).toMatchObject({ passed: 5, of: 5 });
		expect(d.decision).toMatchObject({ verdict: 'accept', label: 'Accept and ship', enabled: true });
		expect(d.tab).toBe('changes');
	});
	it("Proposal, play's work: what changes, its review a tap away; Accept", () => {
		const d = detailOf(FIXTURES['proposal-work']);
		expect(d.top.find((p) => p.part === 'work')).toMatchObject({ review: true, text: "play's work: Olive tree v4, and 1 more document" });
		expect(d.decision).toMatchObject({ label: 'Accept', enabled: true });
	});
	it('Proposal, a red ship: its step and reason in a line; Ship again', () => {
		const d = detailOf(FIXTURES['proposal-red']);
		expect(d.top.find((p) => p.part === 'reason')).toMatchObject({ tone: 'failed', text: 'Not shipped: red at Release. production did not fast-forward to the merge' });
		expect(d.decision).toMatchObject({ label: 'Ship again', enabled: true });
		expect(d.tabs).toContain('ship');
	});
	it('Ship: the live steps, no decision, no Reject', () => {
		const d = detailOf(FIXTURES.ship);
		expect(d.top[0]).toMatchObject({ part: 'steps' });
		expect(d.decision).toBeNull();
		expect(d.reject).toBe(false);
		expect(d.tab).toBe('ship');
	});
	it('Accepted: what shipped and when; Reopen', () => {
		const d = detailOf(FIXTURES.accepted);
		expect(d.top[0]).toMatchObject({ part: 'outcome', text: 'Pull request #2150 merged and in production, accepted by Samuel.' });
		expect(d.decision).toMatchObject({ verdict: 'reopen', label: 'Reopen' });
		expect(d.reject).toBe(false);
	});
	it('Accepted, not live: flagged on top without the commit', () => {
		const i = { ...FIXTURES.accepted, ship: { ...FIXTURES.accepted.ship!, live: false, commit: LIVE } };
		const d = detailOf(i);
		expect(d.top.find((p) => p.part === 'reason')).toMatchObject({ tone: 'failed' });
	});
	it('Archived: why it ended; Reopen', () => {
		const d = detailOf(FIXTURES.archived);
		expect(d.top[0]).toMatchObject({ part: 'outcome', text: 'Rejected by Samuel: it ended archived.' });
		expect(d.decision?.label).toBe('Reopen');
	});
	it('a check in a line: its headline, up to its colon', () => {
		expect(headline('Nothing an agent needs is lost: every field is reachable.')).toBe('Nothing an agent needs is lost');
		expect(headline('It is written down in `SPEC.md`. And more.')).toBe('It is written down in SPEC.md.');
	});
});
