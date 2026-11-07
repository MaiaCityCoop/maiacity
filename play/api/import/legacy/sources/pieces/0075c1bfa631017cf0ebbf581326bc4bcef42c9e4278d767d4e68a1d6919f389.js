				pose.jaw = [
					.12 + .5 * (phrase ? Math.max(0, Math.sin(t * Math.PI * 2 * (kind === "blackbird" ? 4 : 7))) : 0) * smooth(u / .05) * (1 - smooth((u - .5) / .05)),
					0,
					0
				];
