// @ts-nocheck — plain JS, runs in the page
/*
 * The sandboxes by their ids (Samuel 2026-11-04: every reference is a UUID or a hash; a name, a slug or a route is
 * only shown). A slot of a sandbox's pins is `pin:<its id>/<slot>` (../content/assets/catalog.js) and its config is read at
 * /api/sandboxes/<its id>/config. Written once, in play/api's src/kit/ids.ts `SANDBOX` (beside the migrations that
 * give each its row): this is that object, so the site and the API never name a sandbox by two copies (intent 67f0404a).
 */
export { SANDBOX } from '../../../../api/src/kit/ids.ts';
