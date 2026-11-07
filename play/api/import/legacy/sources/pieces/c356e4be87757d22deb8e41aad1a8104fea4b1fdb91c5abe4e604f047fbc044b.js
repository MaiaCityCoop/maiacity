//#piece a5d2fc773d0acfbf07bc7af9c62fc2469809f466a4bf30ab5ba13798a551d857
/** first order lag toward target with time constant tau (s): spool-up, thermal mass, filters */
const approach = (v, target, tau, dt) => target + (v - target) * Math.exp(-dt / Math.max(1e-6, tau));
//#piece 86f2474524638af5263b596122a940719d1988c4e2e19108aa5276a00fe54153
//#piece 95a9b76e441dc3e53b3327ae971aa6187ecdf8a72d10fed4c51362ac2c5457d2
