// The pieces with their hashes: each template in pieces/ names another as require('@piece:<name>'); written to
// pieces/out/ with the hash of the other's final text, in order. Prints each piece's hash (pieces/out/hashes.json).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { hash } from './box.mjs';
const ORDER = ['skeleton', 'head', 'ik', 'clips-man', 'clips-elder', 'clips-actions', 'person', 'motion'];
const hashes = {};
for (const name of ORDER) {
	if (!existsSync(`pieces/${name}.js`)) continue;
	let text = readFileSync(`pieces/${name}.js`, 'utf8');
	text = text.replace(/require\('@piece:([a-z-]+)'\)/g, (_, n) => {
		if (!hashes[n]) throw new Error(`${name} needs ${n} first`);
		return `require('${hashes[n]}')`;
	});
	const long = text.split('\n').findIndex((l) => l.length > 990);
	if (long >= 0) throw new Error(`${name}: line ${long + 1} is too long`);
	writeFileSync(`pieces/out/${name}.js`, text);
	hashes[name] = hash(text);
	console.log(name, hashes[name], (text.length / 1024).toFixed(0) + ' kB');
}
writeFileSync('pieces/out/hashes.json', JSON.stringify(hashes, null, 1));
