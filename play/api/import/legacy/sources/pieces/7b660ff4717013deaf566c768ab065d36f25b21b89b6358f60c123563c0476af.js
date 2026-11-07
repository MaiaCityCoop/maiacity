				k: VEHICLE.axles.k[0]
			},
			M: R,
			assembly: "chassis",
			source: SRC.susp,
			tag: id === "fl" ? {
				text: "Front spring",
				at: [
					0,
					.3,
					0
				],
				side: "left",
				value: () => `sunk ${fmt(sim.s.sagF * 1e3)} mm${sim.s.sagF > VEHICLE.axles.travel[0] ? " · on its bump stop" : ""}`
			} : void 0
		});
	});
	steeringRack(kit, {
		parent: body,
