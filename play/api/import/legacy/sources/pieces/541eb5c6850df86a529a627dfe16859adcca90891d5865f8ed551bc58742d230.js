/** straight between the rows of a table */
function linear(x, rows) {
	if (x <= rows[0][0]) return rows[0][1];
	for (let i = 1; i < rows.length; i++) if (x <= rows[i][0]) return rows[i - 1][1] + (rows[i][1] - rows[i - 1][1]) * ((x - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]));
	return rows[rows.length - 1][1];
}
