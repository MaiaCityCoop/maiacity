import { expect, test } from "bun:test";
import { summary } from "../src/assets";

test("a version's measures are shown only where they were measured on its own recipe", () => {
  const measured = { card: { label: "Fig", size: [6.338, 5.054, 6.889], triangles: 108398 } };
  // its first: its own
  expect(summary(measured)).toMatchObject({ size: [6.338, 5.054, 6.889], triangles: 108398 });
  // one that took its parent's card whole (before 2026-11-05): its parent's measures, not its own
  expect(summary({ card: { label: "Fig 'Brown Turkey'", size: [6.338, 5.054, 6.889], triangles: 108398 } }, measured)).toMatchObject({ size: null, triangles: null, skinned: null });
  // one measured again: its own
  expect(summary({ card: { size: [4.1, 3.0, 4.0], triangles: 411680 } }, measured)).toMatchObject({ size: [4.1, 3.0, 4.0], triangles: 411680 });
  // none measured
  expect(summary({ card: { label: "Fig" } }, measured)).toMatchObject({ size: null, triangles: null });
});
