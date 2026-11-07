/** a value through a table of [g, value] rows, straight between them */
function tableAt(g, rows) {
	if (g <= rows[0][0]) return rows[0][1];
	for (let i = 1; i < rows.length; i++) if (g <= rows[i][0]) return rows[i - 1][1] + (rows[i][1] - rows[i - 1][1]) * ((g - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]));
	return rows[rows.length - 1][1];
}

//#endregion
