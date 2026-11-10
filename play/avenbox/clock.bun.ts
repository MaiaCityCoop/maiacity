// Bun's tests run at the pinned instant (./clock.ts): preloaded by each bunfig.toml, before every test file and test.
import { beforeEach, setSystemTime } from "bun:test";
import { PINNED } from "./clock";

setSystemTime(new Date(PINNED));
beforeEach(() => void setSystemTime(new Date(PINNED)));
