// kept for ./assetdocs.ts (held by other intents: intent-work/5884ade4/held.txt), which takes these from here: an
// intent's work is ./held.ts' SQL and ./intents.ts' stage moves now, and play's one error ./kit/errors.ts'
export { closeWork, holdVariant, stageAfter, WORK_OF } from "./held";
export { putAtProposal, settle } from "./intents";
export { HttpError as WorkError } from "./kit/errors";
