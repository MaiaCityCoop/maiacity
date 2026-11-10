// vitest's tests run at the pinned instant (play/avenbox/clock.ts): vite.config.ts's setupFiles, before every test
// file and test. Only Date is held: timers and performance.now() run on.
import { beforeEach, vi } from 'vitest';
import { PINNED } from '../avenbox/clock';

const pin = () => void vi.useFakeTimers({ toFake: ['Date'] }).setSystemTime(PINNED);
pin();
beforeEach(pin);
