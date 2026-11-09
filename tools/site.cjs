// play/site as every tool reaches it (its src, its static files, the packages only its node_modules hold: three,
// Playwright): PLAY_SITE when set, else the repository's play/site beside tools/. CommonJS, so the .cjs tools require it
// and the .mjs and .ts ones import it alike.
const path = require('node:path');
const { createRequire } = require('node:module');

const SITE = path.resolve(process.env.PLAY_SITE ?? path.join(__dirname, '../play/site'));
/** require() as play/site resolves it */
const siteRequire = createRequire(path.join(SITE, 'package.json'));

module.exports = { SITE, siteRequire };
