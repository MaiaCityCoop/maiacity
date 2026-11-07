			const pts = (leg[0] === "F" ? j.fore : j.hind).map((p) => leg[1] === "L" ? p : mirror(p));
			return [
				{
					name: `upper${leg}`,
					parent: leg[0] === "F" ? "chest" : "pelvis",
					at: pts[0]
				},
				{
					name: `lower${leg}`,
					parent: `upper${leg}`,
					at: pts[1]
				},
				{
					name: `cannon${leg}`,
					parent: `lower${leg}`,
					at: pts[2]
				},
				{
					name: `foot${leg}`,
					parent: `cannon${leg}`,
					at: pts[3]
				}
			];
		})
	];
