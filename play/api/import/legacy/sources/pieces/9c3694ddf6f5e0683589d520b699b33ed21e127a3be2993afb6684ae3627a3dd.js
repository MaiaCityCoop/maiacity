			s.rpm = s.launch ? E.launch : rpmOf(s.v, s.gear);
			const lugged = !s.launch && s.gear === 1 && s.rpm < E.stall && th > .9;
			const noPull = s.launch && s.v <= 0 && net <= 0 && th > .99;
			if (lugged || noPull) {
				s.stalled = true;
