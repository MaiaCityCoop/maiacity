#ifdef USE_SKINNING
	objectNormal = ( bindMatrixInverse * vec4( dqTurn( dqReal, ( bindMatrix * vec4( objectNormal, 0.0 ) ).xyz ), 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = ( bindMatrixInverse * vec4( dqTurn( dqReal, ( bindMatrix * vec4( objectTangent, 0.0 ) ).xyz ), 0.0 ) ).xyz;
	#endif
