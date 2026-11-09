/**
 * Intents at every stage, as play's API serves them, for detail.test.ts and the detail's screenshots
 * (scripts/intent-shots.ts): each with the run commands, hashes, evidence and brief an agent needs, none of which may
 * be on top of its detail. Their UUIDs are made up; nothing here is play's.
 */
import type { Check, Intent, Results } from './detail';

export const RUN = 'cd play/site && bunx vitest run src/lib/site/intents/detail.test.ts';
export const HEAD = '3f1c9a7be0d24c6a8f15e2b7c9d04a1e6b8f2c35';
export const MERGE = '9e2b7d41c0a35f86b1d2e4c7a9f03b5d8e6c1a27';
export const LIVE = '1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d';
const EVIDENCE = 'vitest: 14 passed (14) in detail.test.ts, 0 skipped';
export const BRIEF = 'Build Maia City\'s intent 00000000-… on play in avenBOX. Read it with get_intent, build what its goal and scope say, then run `bun play/avenbox/intent.ts <id>`.';

const CHECKS: Check[] = [
	{ id: 'c1', check: 'The board and the detail are apart: IntentDetail.svelte exists, and IntentsBoard.svelte is under 68,098 bytes.', how: 'measure', by: 'wc -c', run: 'test -f play/site/src/lib/site/intents/IntentDetail.svelte && [ $(wc -c < play/site/src/lib/site/intents/IntentsBoard.svelte) -lt 68098 ]', must: true, step: 'reduce' },
	{ id: 'c2', check: 'One place decides each stage\'s detail: detailOf gives the top, the decision and the tabs.', how: 'test', by: 'detail.test.ts', run: RUN, must: true, step: 'reduce' },
	{ id: 'c3', check: 'Nothing an agent needs is lost: every field is reachable in a tab.', how: 'look', by: 'one intent per stage, tab by tab', must: true, step: 'mvp' },
	{ id: 'c4', check: 'The decision is clean on top: the stage\'s parts and its button, no run or hash above the tabs.', how: 'look', by: '14 screenshots', must: true, step: 'mvp' },
	{ id: 'c5', check: 'It is written down in play/SPEC.md §4.12.', how: 'test', by: 'grep', run: "grep -q 'detailOf' play/SPEC.md", must: true, step: 'mvp' },
	{ id: 'c6', check: 'Deciding at Specify and Proposal takes one look and one tap on a phone.', how: 'look', by: 'Samuel on his phone', must: false, step: 'mvp' }
];
const SPEC = {
	goal: 'Opened at any stage, an intent\'s detail shows on top only what a person needs at that moment: what it is, where it stands and the one decision the stage asks for. Everything else is kept whole in tabs.',
	scope: 'Code, by pull request into main. Under `play/site/src/lib/site/intents/`.\n\n### Step 1, reduce\n- The detail goes into its own component.\n\n### Step 2, the MVP\n- **The top, by stage**, and the tabs.',
	checks: CHECKS
};
const NOTE = 'Samuel 2026-11-07: "each stage has its own overview … reduced to the actual essence of decision point, while keeping the information that the agents need intact."\n\nAudit of main: one 68,098-byte file holds the board and the detail; the decision sits at the foot under prose, run commands, hashes and evidence.';
const at = (h: number) => new Date(Date.UTC(2026, 10, 7, h, 12)).toISOString();
const res = (ids: string[], fail: string[] = []): Results =>
	Object.fromEntries([...ids.map((id) => [id, { pass: true, evidence: `${EVIDENCE} (${id})`, by: 'avenMAIA', at: at(11), where: 'avenBOX' as const, commit: HEAD }]), ...fail.map((id) => [id, { pass: false, evidence: `${id}: 2 failed, expected 68098 > 70847`, by: 'avenMAIA', at: at(11), where: 'avenBOX' as const, commit: HEAD }])]);

const base = (n: number, over: Partial<Intent>): Intent => ({
	id: `${String(n).padStart(8, '0')}-b4f4-4128-bcc1-${String(n).padStart(12, '0')}`,
	kind: 'improve',
	title: 'An intent\'s detail shows the decision its stage asks for, clean on top',
	note: NOTE,
	stage: 'idea',
	via: 'mcp',
	created: at(9),
	author: 'Samuel',
	spec: null,
	results: null,
	specified_at: null,
	specified_by: null,
	approved_at: null,
	approved_by: null,
	decided_at: null,
	decided_by: null,
	came_with: null,
	work: null,
	pull_request: null,
	ship: null,
	sub: null,
	steps: [],
	depends_on: [],
	held_by: [],
	needed_by: [],
	...over
});
const specified = { spec: SPEC, specified_at: at(10), specified_by: 'Samuel' };
const approved = { ...specified, approved_at: at(10), approved_by: 'Samuel' };
const DEP = { id: '11111111-2222-4333-8444-555555555555', title: 'Ship merges main into every open pull request', stage: 'build' as const };
const STEPS = (red = false) => [
	{ key: 'merge', name: 'Merged into main', state: 'green' as const, started: at(12), finished: at(12), note: `as ${MERGE.slice(0, 7)}` },
	{ key: 'main', name: "Main's checks", state: 'green' as const, started: at(12), finished: at(12), link: 'https://github.com/MyAvenCEO/maiacity/actions/runs/1' },
	{ key: 'release', name: 'Release', state: red ? ('red' as const) : ('green' as const), started: at(12), finished: at(12), link: 'https://github.com/MyAvenCEO/maiacity/actions/runs/2' },
	{ key: 'backup', name: 'Backup', state: red ? ('skipped' as const) : ('running' as const), started: at(12) },
	{ key: 'server', name: 'Server', state: 'queued' as const },
	{ key: 'website', name: 'Website', state: 'queued' as const }
];
const WORK = { kind: 'asset_version', what: 'asset', doc: 'asset:44444444-5555-4666-8777-888888888888', doc_variant: 3, docs: 2, asset_id: '44444444-5555-4666-8777-888888888888', label: 'Olive tree', grp: 'plants', slug: null, version_label: null, number: 4, status: 'proposal', note: 'Its bark furrows with age.', author: 'Samuel', decided_by: null, created: at(11), via: 'mcp' as const };

/** asset upgrades at Proposal, on real accepted versions of play's (their recipes drawn by the shots from play's files):
 *  the olive's v3 on its v2, and the delivery van's v3 (four paints) on its v2 */
export const ASSETS = {
	'proposal-plant': { asset: '8323f07d-60c6-5d46-8c23-644e5b1efc20', recipes: ['23ee39d5f005a5ef6630780ecee536368b0c37aa58e9ef87b48901a6fb53306c'], source: '4044d0ea3add20bf29131f84bb7743b535665f89bfb2fc430e41139eb2a01f1d', base: { number: 2, source: 'fdbfead840506022ac0e9d636d9bea9a7da602309fa201b9df5892acd42ffcde' } },
	'proposal-machine': { asset: '53d1af5a-bbcf-4eba-9fe0-3a147baedd34', recipes: ['6585f835b903f6ba64f4c7db4e968cbb9160d41662449495d3ad648cbeab0ae5', 'bceb127662872272e93a6559b416f3dca69ea81ae77481c8e56a2f7350543cbd', 'a19aa4e7d1fe049b17188fc0c651e32a33ee559f7e282d11313f0710e4150ddd', '70e5a46a136e3923d31fcd6afb037b683dd8378d371deb574abf48429974d699'], source: '9c28860e6f7e86c90247bcc32e8fa6a3772dea609394026ec65ab2cd620f99e2', base: { number: 2, source: '803d400e84cb4b2747fbbf19343990a8bfc71ec3ec782b5a4e1360e8a4fb5017' } }
} as const;

/** a story at Proposal, played in its Changes tab (intent 668e9ffd): play's own accepted story 7436c87e v1, "How small
 *  can a city start?" (1:1, 10 s), its frames and its video play's files, drawn by the shots from play */
const HEX_VIDEO = 'fabc343a4b85408880e4cf66d07212d1b66a72725c81ed0ffd908ed1feb971de';
const hexShot = (id: string, at: number, duration: number, frame: string) => ({ id, at, duration, frame, video: HEX_VIDEO, video_in: at, transition: 'cut' });
export const STORIES = {
	'proposal-story': {
		story: {
			id: '7436c87e-68e7-486d-a130-83d65f4b5349', title: 'How small can a city start?', schema: 'story/1' as const, format: '1:1', fps: 30, duration: 10, links: {},
			tracks: [
				{ id: 'shots', kind: 'shots', clips: [
					hexShot('s1', 0, 2, 'ff3c3e6ed62d343a49a379144ba156821cb63a75aaa78516eda3e119772af162'),
					hexShot('s2', 2, 3, '11a21cdc1c69a5f79ef38e072e5ef6eb17d46225d9fbc743f1cbd1efd5e29d1b'),
					hexShot('s3', 5, 3.5, '9ad7cc27cfa3ed6a285a09ac6780db854b6c48ae9483e4963bf953b00ced5293'),
					hexShot('s4', 8.5, 1.5, '98161d92027a0949425866b583af4f649c805fa61df15d0985ecb814d7386a3b')
				] },
				{ id: 'voice', kind: 'voice', clips: [{ id: 'v1', at: 0, duration: 10, who: 'subtitles', line: 'How small can a city start? One hex. Add six… 7 hexes = 1 village', cues: [{ at: 0.3, text: 'How small can a city start?' }, { at: 2.1, text: 'One hex.' }, { at: 5.1, text: 'Add six…' }, { at: 8.5, text: '7 hexes = 1 village', em: true }] }] },
				{ id: 'notes', kind: 'notes', clips: [{ id: 'n1', at: 0, duration: 2, section: 'The question', mood: '↑' }, { id: 'n2', at: 2, duration: 3, section: 'One hex', mood: '↑' }, { id: 'n3', at: 5, duration: 3.5, section: 'Six join', mood: '↑↑' }, { id: 'n4', at: 8.5, duration: 1.5, section: 'A village', mood: '↕' }] }
			]
		}
	}
};

export const FIXTURES: Record<string, Intent> = {
	idea: base(1, { title: "The garden's paths show where people walk most", stage: 'idea', sub: { state: 'idle', tag: 'an idea', why: 'an idea: an agent specifies it next' } }),
	specify: base(2, { stage: 'specify', ...specified, depends_on: [DEP], sub: { state: 'waiting', tag: 'Approve spec', why: 'waits for Approve spec' } }),
	build: base(3, { title: 'Factories show their bottleneck live on the line', stage: 'build', ...approved, results: res(['c1', 'c2']), pull_request: 2150, pr_seen: { pr: 2150, draft: true, state: 'open' }, sub: { state: 'working', tag: 'being built', why: 'being built: its checks are recorded as they pass' } }),
	'build-held': base(4, { title: "Sandbox 2's pond fills with rain over a season", stage: 'build', ...approved, depends_on: [DEP], held_by: [DEP], sub: { state: 'idle', tag: 'held', why: `held: waits for ${DEP.title}` } }),
	'build-failed': base(5, { title: 'The Library finds a file by its label', stage: 'build', ...approved, results: res(['c2'], ['c1']), pull_request: 2150, pr_seen: { pr: 2150, draft: false, state: 'open' }, sub: { state: 'failed', tag: 'c1 failed', why: 'c1 failed on its last run' } }),
	'proposal-code': base(6, { title: 'Members invite a friend with one link', stage: 'proposal', ...approved, results: res(['c1', 'c2', 'c3', 'c4', 'c5']), pull_request: 2150, pr_seen: { pr: 2150, draft: false, state: 'open', mergeable: true }, sub: { state: 'waiting', tag: 'Accept and ship', why: 'waits for Accept and ship' } }),
	'proposal-work': base(7, { stage: 'proposal', ...approved, spec: { ...SPEC, goal: 'The olive tree\'s bark furrows and twists with age, as old Picual trunks in Jaén do.' }, title: 'The olive tree\'s bark furrows with age', results: res(['c1', 'c2', 'c3', 'c4', 'c5']), work: WORK, sub: { state: 'waiting', tag: 'Accept', why: 'waits for Accept' } }),
	'proposal-red': base(8, { title: 'Ship merges main into every open pull request',
		stage: 'proposal', ...approved, results: res(['c1', 'c2', 'c3', 'c4', 'c5']), pull_request: 2150, decided_by: 'Samuel', decided_at: at(12),
		ship: { pr: 2150, head: HEAD, merge: MERGE, by: 'Samuel', round: 1, started: at(12), steps: STEPS(true), report: { step: 'Release', why: 'production did not fast-forward to the merge', link: 'https://github.com/MyAvenCEO/maiacity/actions/runs/2', log: `error: ${MERGE} is not a descendant of production\n##[error]Process completed with exit code 1.`, at: at(12) }, outcome: 'red', again: 'release' },
		sub: { state: 'failed', tag: 'Ship red', why: 'Ship red at Release: Accept ships it again' }
	}),
	ship: base(9, { title: 'Every deploy backs play up first, like Time Machine', stage: 'ship', ...approved, results: res(['c1', 'c2', 'c3', 'c4', 'c5']), pull_request: 2150, decided_by: 'Samuel', decided_at: at(12), ship: { pr: 2150, head: HEAD, merge: MERGE, by: 'Samuel', round: 1, started: at(12), steps: STEPS() }, sub: { state: 'working', tag: 'shipping', why: 'shipping: the backup runs' } }),
	accepted: base(10, { title: 'Stories play their trailer before every film',
		stage: 'accepted', ...approved, results: res(['c1', 'c2', 'c3', 'c4', 'c5']), pull_request: 2150, decided_by: 'Samuel', decided_at: at(12),
		ship: { pr: 2150, head: HEAD, merge: MERGE, by: 'Samuel', round: 1, started: at(12), steps: STEPS().map((s) => ({ ...s, state: 'green' as const, started: at(12), finished: at(13) })), outcome: 'green', accepted: at(13), live: true, commit: MERGE },
		steps: [{ at: at(11), by: 'Samuel', via: 'mcp', from: 'build', to: 'specify', reason: 'the spec named the wrong file' }],
		auto: {}
	}),
	archived: base(11, { title: 'A second board for ideas only', stage: 'archived', ...specified, decided_by: 'Samuel', decided_at: at(12) }),
	'proposal-plant': base(12, { stage: 'proposal', ...approved, spec: { ...SPEC, goal: 'The olive grows to the size measured Picual trees have at each age: 3.2 m high at eight years, not 2.6 m.' }, title: "The olive grows to its measured size sooner", results: res(['c1', 'c2', 'c3', 'c4', 'c5']), work: { ...WORK, label: 'Olive', grp: 'plants', number: 3, docs: 1, asset_id: '8323f07d-60c6-5d46-8c23-644e5b1efc20', doc: 'asset:8323f07d-60c6-5d46-8c23-644e5b1efc20', note: 'A sizing fix to v2: the scaffolds and branches grow out sooner, so an 8-year tree is 3.2 m high, as measured Picual trees are.' }, sub: { state: 'waiting', tag: 'Accept', why: 'waits for Accept' } }),
	// an intent holding all its work (intent 7c8986c5): two assets side by side and a pull request, decided by Accept and ship
	'proposal-all': base(14, { stage: 'proposal', ...approved, spec: { ...SPEC, goal: 'People move like people: the render bench\'s motion mode, and Stand-in and Elder woman walking on it.' }, title: 'Stand-in and Elder woman walk, with the render bench\'s motion mode', results: res(['c1', 'c2', 'c3', 'c4', 'c5']), pull_request: 2152, pr_seen: { pr: 2152, draft: false, state: 'open', mergeable: true }, work: { ...WORK, label: 'Stand-in', grp: 'actors', number: 2, docs: 2, asset_id: '6f1e2d3c-4b5a-4968-8776-a5b4c3d2e1f0', doc: 'asset:6f1e2d3c-4b5a-4968-8776-a5b4c3d2e1f0', note: 'Both people on the open skeleton, their feet planted.' }, sub: { state: 'waiting', tag: 'Accept and ship', why: 'waits for Accept and ship' } }),
	'proposal-story': base(15, { stage: 'proposal', ...approved, spec: { ...SPEC, goal: 'Play holds a 10-second square story, "How small can a city start?": motion design in the look of the game screens with its four subtitles.' }, title: 'A 10 s square motion-graphics story: "How small can a city start?"', results: res(['c1', 'c2', 'c3', 'c4', 'c5']), work: { ...WORK, kind: 'story_version', what: 'story', grp: 'stories', label: 'How small can a city start?', number: 1, docs: 1, asset_id: null, doc: '7436c87e-68e7-486d-a130-83d65f4b5349', doc_variant: 1322, note: 'A 10 s square motion-graphics explainer: one hex is a settlement, seven make a village. Motion design and subtitles only.' }, sub: { state: 'waiting', tag: 'Accept', why: 'waits for Accept' } }),
	'proposal-machine': base(13, { stage: 'proposal', ...approved, spec: { ...SPEC, goal: 'The delivery van looks as it did, every paint, but draws with 3 materials instead of 8, so a city jam stays smooth.' }, title: 'The delivery van draws with far fewer materials', results: res(['c1', 'c2', 'c3', 'c4', 'c5']), work: { ...WORK, label: 'Delivery van', grp: 'machines', number: 3, docs: 1, asset_id: '53d1af5a-bbcf-4eba-9fe0-3a147baedd34', doc: 'asset:53d1af5a-bbcf-4eba-9fe0-3a147baedd34', note: 'The same van and every paint, drawn with 3 materials instead of 8, so a jam of hundreds costs far fewer draw calls.' }, sub: { state: 'waiting', tag: 'Accept', why: 'waits for Accept' } })
};

/** the review play gives for 'proposal-all' (GET /api/intents/<id>'s review.docs): each document it changes */
export const ALL_WORK_DOCS = [
	{ doc: { id: '6f1e2d3c-4b5a-4968-8776-a5b4c3d2e1f0', kind: 'asset', what: 'asset', label: 'Stand-in', group: 'actors', open: null }, seedNumber: 1, moved: false, changes: [], edits: [] },
	{ doc: { id: '0a9b8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d', kind: 'asset', what: 'asset', label: 'Elder woman', group: 'actors', open: null }, seedNumber: 2, moved: false, changes: [], edits: [] }
];
