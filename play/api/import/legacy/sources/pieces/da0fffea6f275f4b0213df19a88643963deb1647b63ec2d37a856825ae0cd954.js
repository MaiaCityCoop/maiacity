				what: "The forged rod from the piston’s pin to the crank’s pin, beside its twin on the same pin.",
				moves: "Swings and slides with the crank.",
				drive: "The piston",
				specs: [["Centres", "116 mm [inferred]"]]
			}, [rod], { explode: d.clone().multiplyScalar(.18).toArray() }, rz);
			root.add(pz, rz);
			moving[`piston-${side}`] = piston;
			moving[`rod-${side}`] = rod;
		}
		const fly = new three.Group();
		fly.position.copy(C);
