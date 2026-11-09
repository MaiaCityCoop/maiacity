// The factories kept in the repo as they were first made (./factories/<id>/: the line and its bill of process as code,
// AirSup's runtime's spec and our numbers worked out from the parts): each written into play's Postgres as the v1 of its
// Loro document (./seeddocs.ts) only when play holds no factory of its id yet. From then on play's Postgres is the
// source of truth: a factory changes only by proposal (over MCP), and nothing here writes over it. Run with every
// deploy, by ./run.ts.
import type { Db } from "../src/kit/pg";
import { seedDocs, type Seed } from "./seeddocs";
import { FACTORY } from "../src/kit/ids";
import { lifetracLine } from "./factories/lifetrac-line/index.js";

export { lifetracLine };

export const FACTORIES: Seed[] = [
  {
    id: FACTORY.lifetrac,
    at: new Date("2026-11-03T12:00:00Z"),
    note: "First version: 24 LifeTracs a day on 3 × 8 h, fully automated, 42 stations on a main line and nine cells (tubes, angles, pins, wheel units, the Power Cube, valves, hoses, cylinders, the controller); every one of the 135 parts of machines/lifetrac@1 made from its raw stock or bought, its every operation timed",
    json: lifetracLine,
  },
];

export const seedFactories = (db: Db) => seedDocs(db, "factory", FACTORIES);
