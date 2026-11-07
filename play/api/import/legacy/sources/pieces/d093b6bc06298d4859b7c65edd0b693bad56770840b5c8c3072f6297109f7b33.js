				what: "The overhead-valve head: its inlet and exhaust valves under the rocker cover, the combustion chamber over the piston, and the spark plug in its front.",
				specs: [["Valves", "OHV, 2 per cylinder"], ["Compression", "8.4 : 1"]]
			}, [head], { explode: d.clone().multiplyScalar(.2).toArray() });
			part({
				id: `plug-${side}`,
				label: `Spark plug and lead, ${side}`,
