				s.at = {
					vSet: inp.vSet,
					grade: inp.grade,
					load: inp.load
				};
			}
		}
		const w = s.rpm * 2 * Math.PI / 60;
		s.Pw = s.Fd * s.v;
		s.Pe = s.stalled ? 0 : s.Te * w;
		const overrun = s.theta < .01 && s.rpm > E.idle * 1.3;
