// What the lists show (intent 08566782): a document on Main and listed is one not retired (./retire.ts: an accepted
// document taken off every list by an intent's Accept, its history kept by its UUID), and a story also one not folded
// into another (./stories.ts folds). Written once here, read by every list: list_docs, the Stories list, the Library's
// uses, the stories linking a story. A read by UUID or by hash never asks it.

/** the SQL saying document `<prefix>:<alias>.id` is not retired */
const notRetired = (prefix: string, alias: string) =>
  `NOT EXISTS (SELECT 1 FROM play.docs rd WHERE rd.id = '${prefix}:' || ${alias}.id::text AND rd.retired_at IS NOT NULL)`;

/** the SQL saying story row `alias` (play.stories) is listed: neither folded into another nor retired */
export const storyListed = (alias: string) => `${alias}.folded_into IS NULL AND ${notRetired("story", alias)}`;
