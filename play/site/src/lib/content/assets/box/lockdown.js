// @ts-nocheck — plain JS, runs inside the box before anything else
// The box's second lock is the shell's ($lib/kernel/sandbox/lockdown.js), the same for every worker running untrusted code.
import '$lib/kernel/sandbox/lockdown.js';
