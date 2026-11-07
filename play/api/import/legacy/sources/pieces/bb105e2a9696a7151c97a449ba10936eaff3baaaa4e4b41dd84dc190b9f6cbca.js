const clamp = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => x * x * (3 - 2 * x);
const span = (k, [a, b]) => clamp((k - a) / (b - a));
