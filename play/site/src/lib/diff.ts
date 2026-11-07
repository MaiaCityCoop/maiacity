// The lines that changed between two texts, for people reading a proposed version's source beside its base's: the
// longest common subsequence of their lines, each line kept (same), taken out (del) or put in (add). Long texts fall
// back to the whole new text, all added, rather than hold up the page.
export type Line = { op: 'same' | 'add' | 'del'; text: string };

/** a text as a review diffs it: line by line, then each line one sentence a line (a `.`, `!` or `?` before a space and a
 * capital, a backtick, a quote or a parenthesis), empty lines kept, so a changed sentence in a paragraph is that sentence */
export function sentences(text: unknown): string {
	if (typeof text !== 'string') return '';
	return text
		.split('\n')
		.map((line) => line.replace(/([.!?]) (?=[A-Z`"(])/g, '$1\n'))
		.join('\n');
}

export function lineDiff(before: string, after: string, most = 4000): Line[] {
	const a = before.split('\n');
	const b = after.split('\n');
	if (a.length > most || b.length > most) return b.map((text) => ({ op: 'add', text }));
	const n = a.length;
	const m = b.length;
	const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
	for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
	const out: Line[] = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) (out.push({ op: 'same', text: a[i] }), i++, j++);
		else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ op: 'del', text: a[i++] });
		else out.push({ op: 'add', text: b[j++] });
	}
	while (i < n) out.push({ op: 'del', text: a[i++] });
	while (j < m) out.push({ op: 'add', text: b[j++] });
	return out;
}

/** the changed lines with `context` unchanged lines round each, every longer unchanged run told by its length */
export function changesOnly(lines: Line[], context = 3): (Line | { op: 'skip'; text: string })[] {
	const near = lines.map(() => false);
	lines.forEach((l, i) => {
		if (l.op !== 'same') for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) near[k] = true;
	});
	const out: (Line | { op: 'skip'; text: string })[] = [];
	for (let i = 0; i < lines.length; ) {
		if (near[i]) out.push(lines[i++]);
		else {
			let j = i;
			while (j < lines.length && !near[j]) j++;
			out.push({ op: 'skip', text: `… ${j - i} unchanged line${j - i === 1 ? '' : 's'}` });
			i = j;
		}
	}
	return out;
}
