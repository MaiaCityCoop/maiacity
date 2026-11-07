			what: "Over the V: a pleated paper element in a plastic cover. Every litre of air the engine breathes, about 45 litres a second at full speed, is cleaned here first.",
			specs: [["Element", "Pleated paper, foam pre-cleaner"], ["Air", `~${fmt(ENGINE.Vd * 3600 / 120 * 1e3 * .85)} L/s at 3,600 rpm [computed: 85 % filling]`]]
		}, cleaner, {
			explode: [
				0,
				.28,
				0
			],
			xray: "shell"
		});
