function duplicateRecordData(record, overrides = {}) {
	const data = typeof record.toObject === "function" ? record.toObject() : { ...record };

	delete data._id;
	delete data.__v;
	delete data.createdAt;

	return { ...data, ...overrides };
}

function duplicateTableData(tableData, cardNumber) {
	if (!tableData || typeof tableData !== "object") return tableData;

	const copy = JSON.parse(JSON.stringify(tableData));
	if (Array.isArray(copy.rows) && Array.isArray(copy.rows[0])) {
		copy.rows[0][1] = cardNumber;
	}

	return copy;
}

module.exports = { duplicateRecordData, duplicateTableData };
