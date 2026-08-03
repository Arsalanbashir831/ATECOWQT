const mongoose = require('mongoose');

const operatorModel = mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now,
        get: function (date) {
            return date.toLocaleDateString('en-US');
        }
    },
    count: Number,
    operatorNo: String,
    profilePic: String,
    qrLink: String,

    // Operator Data & Test Description
    operatorName: String,
    operatorId: String,
    wpsFollowed: String,
    jointWeldType: String,
    baseMetalSpec: String,
    testCouponSize: String,
    certificateNo: String,
    iqamaPassport: String,
    dateOfIssue: String,
    dateOfWelding: String,
    baseMetalPNo: String,
    fillerSfaSpec: String,
    fillerClassAws: String,
    positions: String,

    // Automatic Welding (Actual/Range for form parity)
    typeOfWeldingAutomaticActual: String,
    typeOfWeldingAutomaticRange: String,
    weldingProcessAutomaticActual: String,
    weldingProcessAutomaticRange: String,
    fillerMetalUsedActual: String,
    fillerMetalUsedRange: String,
    typeOfLaserActual: String,
    typeOfLaserRange: String,
    countinousDriveActual: String,
    countinousDriveRange: String,
    vacuumOutOfVacuumActual: String,
    vacuumOutOfVacuumRange: String,

    // Machine Welding (Actual/Range for form parity)
    typeOfWeldingMachineActual: String,
    typeOfWeldingMachineRange: String,
    weldingProcessMachineActual: String,
    weldingProcessMachineRange: String,
    directRemoteVisualControlActual: String,
    directRemoteVisualControlRange: String,
    automaticArcVoltageControlActual: String,
    automaticArcVoltageControlRange: String,
    automaticJointTrackingActual: String,
    automaticJointTrackingRange: String,
    positionsMachineActual: String,
    positionsMachineRange: String,
    baseMaterialThicknessActual: String,
    baseMaterialThicknessRange: String,
    consumableInsertActual: String,
    consumableInsertRange: String,
    backingActual: String,
    backingRange: String,
    singleMultiplePassesActual: String,
    singleMultiplePassesRange: String,

    // Dynamic Machine Variables
    machineVariables: [{
        label: String,
        actualValue: String,
        rangeQualified: String
    }],

    // Type of Qualification Test
    visualExamination: {
        label: { type: String, default: 'Visual Examination' },
        performed: Boolean,
        results: String,
        reportNumber: String
    },
    liquidPenetrantExamination: {
        label: { type: String, default: 'Liquid Penetrant Examination (PT)' },
        performed: Boolean,
        results: String,
        reportNumber: String
    },
    ultrasonicTesting: {
        label: { type: String, default: 'Ultrasonic Testing (UT)' },
        performed: Boolean,
        results: String,
        reportNumber: String
    },
    bendTest: {
        label: { type: String, default: 'Bend Test' },
        performed: Boolean,
        results: String,
        reportNumber: String
    },
    radiographicExamination: {
        label: { type: String, default: 'Radiographic Examination (RT)' },
        performed: Boolean,
        results: String,
        reportNumber: String
    },
    clientName: String,
    witnessedBy: String,
    supervisorName: String,
    lawName: String,


    // Additional fields for CRUD operations
    status: {
        type: String,
        default: 'active'
    },
    createdBy: String,
    updatedBy: String
});

const Operator = mongoose.model("Operator", operatorModel);
module.exports = Operator;
