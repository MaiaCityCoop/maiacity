// an asset's source with its pieces' hashes in (assets/out/<name>.js) and the pieces list for render.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const H = JSON.parse(readFileSync('pieces/out/hashes.json'));
mkdirSync('assets/out', { recursive: true });
for (const n of process.argv.slice(2)) {
	const code = readFileSync(`assets/${n}.js`, 'utf8').replace(/require\('@piece:([a-z-]+)'\)/g, (_, k) => `require('${H[k]}')`);
	writeFileSync(`assets/out/${n}.js`, code);
}
writeFileSync('assets/out/pieces.json', JSON.stringify(Object.keys(H).map((k) => ({ file: `../../pieces/out/${k}.js`, as: H[k] }))));
