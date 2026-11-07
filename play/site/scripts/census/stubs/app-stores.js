export const page = { subscribe: (f) => (f({ url: new URL('http://census.local/') }), () => {}) }; export const navigating = { subscribe: (f) => (f(null), () => {}) };
