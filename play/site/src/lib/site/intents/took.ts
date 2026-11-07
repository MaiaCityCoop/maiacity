// How long something took, as people read it: the intent detail's ship steps and the delivery page
// (/delivery/, play/api/src/delivery.ts) say it one way.

/** a span of milliseconds: "42 s", "7 min 5 s", "2 h 15 min"; '' where there is none */
export function span(ms: number | null | undefined): string {
	if (ms == null || !(ms >= 0)) return '';
	const sec = Math.round(ms / 1000);
	if (sec < 60) return `${sec} s`;
	if (sec < 3600) return `${Math.floor(sec / 60)} min ${sec % 60} s`;
	const min = Math.round(sec / 60);
	return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** how long a step took: from its start to its end, or to `at` while it runs */
export function took(s: { started?: string; finished?: string }, at: number): string {
	if (!s.started) return '';
	return span((s.finished ? Date.parse(s.finished) : at) - Date.parse(s.started));
}
