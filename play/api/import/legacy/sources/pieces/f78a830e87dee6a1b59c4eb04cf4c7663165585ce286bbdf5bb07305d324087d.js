		for (let k = 0; k < n; k++) {
			if (!prof.seg[k]) continue;
			const a = prof.pts[k], b = prof.pts[(k + 1) % n], R0 = prof.r[k];
//#piece f85a323ad7232f5bd281943f3edb360809d59a89cf6a51ed3e0abcdaf6d62086
					[-hw + .045, .05],
					[hw - .045, .05],
					[hw - .045, len - .045],
					[-hw + .045, len - .045]
				], .06));
				screen.push(onEdge(plate(roundPoly([
					[-hw + .04, .045],
					[hw - .04, .045],
					[hw - .04, len - .04],
					[-hw + .04, len - .04]
				], .06), .006, 8), a, b, -.006));
			}
