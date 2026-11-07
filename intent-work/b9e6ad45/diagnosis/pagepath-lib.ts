import { plugin } from 'bun';
plugin({ name: 'lib', setup(b) { b.onResolve({ filter: /^\$lib\// }, (a) => ({ path: '/home/user/maiacity/play/site/src/lib/' + a.path.slice(5) })); } });
