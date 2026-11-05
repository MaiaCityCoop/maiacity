// node play/proposals/forest-dome/parts/make.mjs — joins the dome's parts (src/NN-*.js, in order) into ../forest-dome.js,
// the readable source proposed to play. Run it after changing a part (e.g. a plant's hash in src/10-plan.js when play's
// catalog holds a newer version of a plant), then check the result with ../../../site/scripts/propose.mjs --check.
// The things are made from things-src/<slug>.js (their own part) with the kit (src/01-core.js, src/05-materials.js) and
// tail.js by `node make.mjs things`, which also rewrites src/15-things.js with their recipe hashes.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const here = new URL('.', import.meta.url).pathname;
const req = createRequire(here + '../../../site/package.json');
const { blake3 } = req('@noble/hashes/blake3.js');
const { bytesToHex, utf8ToBytes } = req('@noble/hashes/utils.js');
const HEAD = 'defineRecipe(function (require) {\n"use strict";\nvar module = { exports: {} }, exports = module.exports;\n';
const end = (id, v) => `\nreturn module.exports.recipe(${JSON.stringify(id)}, ${v}, null);\n});\n`;
const read = (f) => readFileSync(here + f, 'utf8').trimEnd();
if (process.argv[2] === 'things') {
	const kit = ['src/01-core.js', 'src/05-materials.js'].map(read).join('\n\n');
	const tail = read('tail.js');
	const table = {};
	for (const f of readdirSync(here + 'things-src').filter((f) => f.endsWith('.js')).sort()) {
		const slug = f.replace(/\.js$/, '');
		const own = read('things-src/' + f);
		const m = /^\/\*[\s\S]*?\*\/\n/.exec(own);
		const source = (m ? m[0] + '\n' : '') + kit + '\n\n' + (m ? own.slice(m[0].length) : own).trim() + '\n\n' + tail + '\n';
		const label = /label:\s*'([^']*)'/.exec(own)?.[1] ?? slug;
		table[slug] = { hash: bytesToHex(blake3(utf8ToBytes(HEAD + source + end(slug, 1)))), label, file: `things/${slug}.js` };
		writeFileSync(here + '../things/' + slug + '.js', source);
	}
	const rows = Object.entries(table).map(([k, t]) => `\t'${k}': { hash: '${t.hash}', label: ${JSON.stringify(t.label)} }`);
	writeFileSync(here + 'src/15-things.js', `/**\n * THE THINGS — play's own furniture the rooms are furnished with, each its own asset of the Things group, named by the\n * hash of its recipe file (things/<slug>@1): the page draws each where the dome places it (dome.place), never copied in.\n */\nconst THINGS = {\n${rows.join(',\n')}\n};\n`);
	writeFileSync(here + '../things.json', JSON.stringify(table, null, 1));
	console.log(`${Object.keys(table).length} things made`);
}
const parts = readdirSync(here + 'src').filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
const out = parts.map((f) => read('src/' + f)).join('\n\n') + '\n';
writeFileSync(here + '../forest-dome.js', out);
console.log(`forest-dome.js: ${parts.join(' ')} — ${(out.length / 1024) | 0} kB, recipe ${bytesToHex(blake3(utf8ToBytes(HEAD + out + end('forest-dome', 1)))).slice(0, 12)}…`);
