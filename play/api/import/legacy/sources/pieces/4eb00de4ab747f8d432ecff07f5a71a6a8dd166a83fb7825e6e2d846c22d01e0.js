//#piece bb7c285c7fc4ca81814c67cc5b3342ebc083a203a2e1158d6f2141a1a8b98c5a
const pointed = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .6) * (u > .85 ? 1 - (u - .85) * 2.8 : 1);
