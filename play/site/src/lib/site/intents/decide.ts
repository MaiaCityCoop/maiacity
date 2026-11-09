// An intent decided from the board, so a press always answers (intent 2df30a21, Samuel 2026-11-07: "when I press this
// Accept nothing happens"). One decision at a time: while it runs its button says so and can't be pressed again, for
// every intent (not only code). Its answer is the intent as it now is, or the reason it was refused, said where the
// button is. Where play gives no answer (its proxy's 502/503/504 while the API restarts or works long, or the network
// gone), the decision may still be going through on the server: the intent is read again until it is decided, and only
// then, or once it plainly isn't, does the board say what happened.
import { ApiError, NO_ANSWER } from '$lib/api';

export type Verdict = 'approve' | 'accept' | 'reject' | 'reopen';
/** what the board needs of an intent to tell whether a decision went through */
export type Decidable = { id: string; stage: string; decided_at?: string | null; approved_at?: string | null; ship?: unknown };

/** an answer that isn't play's: its proxy's while the API restarts or is busy, or no network at all */
export const noAnswer = (e: unknown) => (e instanceof ApiError && NO_ANSWER.has(e.status)) || e instanceof TypeError;

/** the waits between reading the intent again after no answer, in ms: about a minute and a half in all */
export const REREAD = [2000, 3000, 5000, 10_000, 15_000, 20_000, 30_000];

/** whether `now` shows a decision taken since `was` */
export const moved = (was: Decidable, now: Decidable) =>
	now.stage !== was.stage || (now.decided_at ?? null) !== (was.decided_at ?? null) || (now.approved_at ?? null) !== (was.approved_at ?? null) || (!was.ship && !!now.ship);

const WORD: Record<Verdict, string> = { approve: 'approval', accept: 'Accept', reject: 'rejection', reopen: 'reopening' };

export type Decided<T> = { intent: T; message: string; reread: boolean };

/**
 * Makes the board's decider: `post` sends a decision and gives back the intent (with the decision's message, if any);
 * `read` reads an intent again. `decide` takes one decision at a time (a second press while one runs is ignored:
 * null) and calls `onchange` as it starts and ends, so the button shows it. A refusal throws its reason; no answer is
 * followed by reading the intent again until it is decided (its answer then the intent as read), else it throws why.
 */
export function createDecider<T extends Decidable>(o: {
	post: (id: string, verdict: Verdict) => Promise<T & { message?: string }>;
	read: (id: string) => Promise<T>;
	onchange?: (busy: { id: string; verdict: Verdict } | null) => void;
	sleep?: (ms: number) => Promise<void>;
	waits?: number[];
}) {
	const sleep = o.sleep ?? ((ms: number) => new Promise<void>((ok) => setTimeout(ok, ms)));
	let busy: { id: string; verdict: Verdict } | null = null;
	const set = (b: typeof busy) => {
		busy = b;
		o.onchange?.(b);
	};
	return {
		get busy() {
			return busy;
		},
		async decide(was: T, verdict: Verdict): Promise<Decided<T> | null> {
			if (busy) return null;
			set({ id: was.id, verdict });
			try {
				try {
					const r = await o.post(was.id, verdict);
					return { intent: r, message: r.message ?? '', reread: false };
				} catch (e) {
					if (!noAnswer(e)) throw e;
				}
				// no answer: it may still be going through; read the intent until it is decided
				for (const ms of o.waits ?? REREAD) {
					await sleep(ms);
					const now = await o.read(was.id).catch((e) => (noAnswer(e) ? null : Promise.reject(e)));
					if (now && moved(was, now)) return { intent: now, message: '', reread: true };
				}
				throw new Error(`play gave no answer to the ${WORD[verdict]}, and the intent still reads as it was: it was not taken. Press it again.`);
			} finally {
				set(null);
			}
		}
	};
}
