	});
	part("bms", {
		label: "Battery management system",
		what: "The board behind the cells: a lead to each of the 14 rows, it balances them, keeps them within their voltage and temperature, and opens the pack if anything goes wrong.",
		specs: [
			["Rows", "14S, balanced"],
			["Current", "100 A continuous [inferred]"],
			["Talks", "CAN to the inverter"]
		]
	}, (put) => {
