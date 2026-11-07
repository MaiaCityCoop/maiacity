// wrap every line of 1000+ characters that holds one plain string literal (no ${}, no escapes) into a sum of shorter ones
export function wrap(src) {
  return src.split('\n').map((line) => {
    if (line.length < 1000) return line;
    const m = line.match(/^(\s*[\w$]+:\s*)([`"])(.*)\2(,?)$/);
    if (!m || (m[2] !== '`' && m[3].includes('${')) || m[3].includes('\\') || m[3].includes(m[2])) throw new Error('cannot wrap: ' + line.slice(0, 80));
    const [, head, q, text, tail] = m; const ind = head.match(/^\s*/)[0] + '\t';
    const parts = []; let rest = text;
    const inside = (t, i) => { let d = 0; for (let k = 0; k < i; k++) { if (t[k] === '$' && t[k + 1] === '{') d++; else if (t[k] === '}' && d) d--; } return d > 0; };
    while (rest.length > 400) { let i = rest.lastIndexOf(' ', 400); while (i > 0 && inside(rest, i)) i = rest.lastIndexOf(' ', i - 1); if (i < 100) throw new Error('no split point'); parts.push(rest.slice(0, i + 1)); rest = rest.slice(i + 1); }
    parts.push(rest);
    return head + parts.map((p) => q + p + q).join(' +\n' + ind) + tail;
  }).join('\n');
}
