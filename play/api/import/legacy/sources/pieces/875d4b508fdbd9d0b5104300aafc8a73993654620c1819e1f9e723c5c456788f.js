	}
//#piece 73c462d0e4f06a765e2b9534c32cc636de3e96758d093dac7351d1702d1d7b23
	vec3 dqTurn( vec4 q, vec3 v ) { return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v ); }
#endif
`;
const BASE = `
//#piece e321a11d921d1e76f4ad08a4a232eac4274d1edb3c6c30b96a85058ff8a505a3
	}
