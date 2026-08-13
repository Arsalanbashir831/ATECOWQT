const test = require("node:test");
const assert = require("node:assert/strict");
const { duplicateRecordData, duplicateTableData } = require("../utils/duplicateRecord");

test("duplicateRecordData removes database identity and applies new identifiers", () => {
	const createdAt = new Date("2026-01-01T00:00:00Z");
	const source = {
		_id: "source-id",
		__v: 4,
		createdAt,
		welder_name: "Existing Welder",
		card_no: "c-1000",
	};

	const duplicate = duplicateRecordData(source, { card_no: "c-1001", count: 1001 });

	assert.deepEqual(duplicate, {
		welder_name: "Existing Welder",
		card_no: "c-1001",
		count: 1001,
	});
});

test("duplicateTableData creates an independent table with the new card number", () => {
	const source = { headers: ["Parameter", "Value"], rows: [["Card No", "c-1000"]] };
	const duplicate = duplicateTableData(source, "c-1001");

	assert.equal(duplicate.rows[0][1], "c-1001");
	assert.equal(source.rows[0][1], "c-1000");
});
