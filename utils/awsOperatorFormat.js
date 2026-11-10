// Defaults and fallbacks for the AWS D1.1 Welding Operator Performance
// Qualification certificate format (operator records can be viewed in either
// the ASME Sec IX format or this AWS D1.1 format).

const AWS_DEFAULT_TITLE = 'Testing Variables and Qualification Limits for Robotic Welding Equipment';
const AWS_DEFAULT_LAW = 'AWS D1.1 2025';

const AWS_DEFAULT_LABELS = [
	'Type of Weld Joint',
	'Base Metal',
	'Plate Thickness',
	'Type of Welding (Machine)',
	'Welding Process',
	'Backing',
	'Filler (SFA) Spec.',
	'Filler Class. (AWS)',
	'Direct or Remote Visual Control',
	'Position(s)',
	'Progression',
	'Single or Multiple Electrodes',
	'Gas/Flux Type',
];

function normalize(label) {
	return String(label || '').toLowerCase().replace(/[^a-z]/g, '');
}

// Rows for a record that was saved before the AWS format existed: reuse the
// values already captured for the ASME format wherever the variable matches.
function legacyAwsRows(record) {
	const machine = Array.isArray(record.machineVariables) ? record.machineVariables : [];
	const fromMachine = (...prefixes) => {
		const hit = machine.find((v) => prefixes.some((p) => normalize(v.label).startsWith(p)));
		return hit ? { actual: hit.actualValue || '', range: hit.rangeQualified || '' } : null;
	};
	const pick = (machineHit, actual, range) => ({
		actual: (machineHit && machineHit.actual) || actual || '',
		range: (machineHit && machineHit.range) || range || '',
	});

	const values = {
		'Type of Welding (Machine)': pick(fromMachine('typeofwelding'), record.typeOfWeldingMachineActual, record.typeOfWeldingMachineRange),
		'Welding Process': pick(fromMachine('weldingprocess'), record.weldingProcessMachineActual, record.weldingProcessMachineRange),
		'Backing': pick(fromMachine('backing'), record.backingActual, record.backingRange),
		'Filler (SFA) Spec.': pick(null, record.fillerSfaSpec, record.fillerSfaSpec),
		'Filler Class. (AWS)': pick(null, record.fillerClassAws, ''),
		'Direct or Remote Visual Control': pick(fromMachine('directorremote'), record.directRemoteVisualControlActual, record.directRemoteVisualControlRange),
		'Position(s)': pick(fromMachine('position'), record.positionsMachineActual || record.positions, record.positionsMachineRange),
		'Plate Thickness': pick(fromMachine('basematerialthickness', 'thickness'), record.baseMaterialThicknessActual, record.baseMaterialThicknessRange),
		'Single or Multiple Electrodes': pick(null, '', ''),
	};

	return AWS_DEFAULT_LABELS.map((label) => ({
		label,
		actualValue: (values[label] && values[label].actual) || '',
		rangeQualified: (values[label] && values[label].range) || '',
	}));
}

function awsRowsFor(record) {
	if (record && Array.isArray(record.awsVariables) && record.awsVariables.length > 0) {
		return record.awsVariables.map((v) => ({
			label: v.label || '',
			actualValue: v.actualValue || '',
			rangeQualified: v.rangeQualified || '',
		}));
	}
	return legacyAwsRows(record || {});
}

module.exports = {
	AWS_DEFAULT_TITLE,
	AWS_DEFAULT_LAW,
	AWS_DEFAULT_LABELS,
	awsRowsFor,
};
