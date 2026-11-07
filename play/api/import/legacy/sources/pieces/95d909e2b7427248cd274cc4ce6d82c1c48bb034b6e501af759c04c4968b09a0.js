			explode: (t) => {
				const u = loop(t, 8);
				const k = ease$1(Math.min(1, Math.max(0, (u - .05) / .3))) - ease$1(Math.min(1, Math.max(0, (u - .65) / .3)));
