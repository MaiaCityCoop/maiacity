// An intent's stages (play/SPEC.md §4.12), and a skill's stage keys, which are the same: written once, with no import,
// so play/api, play/avenbox/skills.ts and play/site ($stages) read the one list. A copy on the site once hid Build
// behind 'prototype' (intent 5884ade4).

/** the stages an intent is at before it is done, in order: the board's columns always loaded whole */
export const OPEN_STAGES = ["idea", "specify", "build", "proposal", "ship"] as const;
/** the stages an intent ends at: the board's columns loaded a page at a time */
export const CLOSED_STAGES = ["accepted", "archived"] as const;
/** an intent's stages in their order */
export const INTENT_STAGES = [...OPEN_STAGES, ...CLOSED_STAGES] as const;
export type IntentStage = (typeof INTENT_STAGES)[number];

/** the stages a skill's `stages` says something for, in order */
export const stagesSaid = (stages: Record<string, unknown> | null | undefined): IntentStage[] => INTENT_STAGES.filter((st) => `${stages?.[st] ?? ""}`.trim());

/** a skill's text where it has no body (avenMAIA's and the Intents skill's): `heading` where given, its system part, then each stage it says something for */
export function stagedBody(s: { system?: unknown; stages?: Record<string, unknown> | null }, heading?: string): string {
  return [heading ?? "", `${s.system ?? ""}`.trim(), ...stagesSaid(s.stages).map((st) => `## At ${st}\n\n${`${s.stages![st]}`.trim()}`)].filter(Boolean).join("\n\n");
}
