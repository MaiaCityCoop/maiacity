//#piece add2076bbbc4720bb7ff7a19f8b7fb298cbd63ac346b4c474e57594a100f428d
//#piece d2892285125da4bb96dcf6ce29665eeec349878d9ddce037077faa8b224b7211
		if (t.lengthSq() < 1e-14) t.copy(prev ?? UP$1);
		t.normalize();
		if (!normal) normal = Math.abs(t.y) < .9 ? new three.Vector3().crossVectors(t, UP$1).normalize() : new three.Vector3().crossVectors(t, v3(1, 0, 0)).normalize();
//#piece adcef8e92318a57fc5f22c2e59e278e7e7ce713119f38acfe1e31460f8f15600
