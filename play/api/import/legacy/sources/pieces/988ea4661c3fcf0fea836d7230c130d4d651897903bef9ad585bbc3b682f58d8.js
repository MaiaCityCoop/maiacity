				what: "One bank of the 90° V: a cast-iron liner the piston runs in, cast into square aluminium fins that the flywheel’s fan blows air over.",
				specs: [
					["Bore", "83.8 mm (3.30\")"],
					["Swept", "405 cm³"],
					["Cooling", "Air, by the flywheel fan"]
				]
			}, [barrel], {
				explode: d.clone().multiplyScalar(.1).toArray(),
				xray: "shell"
			});
			const head = new three.Group();
