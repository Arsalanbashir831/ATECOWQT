const mongoose = require('mongoose');

const operatorModel = mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now,
        get: function(date) {
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
    
    // Testing Variables - Automatic Welding Equipment
    typeOfWeldingAutomatic: String,
    weldingProcessAutomatic: String,
    fillerMetalUsedAutomatic: String,
    typeOfLaserLbw: String,
    continuousDriveInertia: String,
    vacuumOutOfVacuum: String,
    
    // Testing Variables - Machine Welding Equipment
    typeOfWeldingMachine: String,
    weldingProcessMachine: String,
    directRemoteVisualControl: String,
    automaticArcVoltageControl: String,
    automaticJointTracking: String,
    positionsMachine: String,
    baseMaterialThickness: String,
    consumableInsert: String,
    backing: String,
    singleMultiplePasses: String,
    
    // Type of Qualification Test
    visualExamination: {
        performed: Boolean,
        results: String,
        reportNumber: String
    },
    liquidPenetrantExamination: {
        performed: Boolean,
        results: String,
        reportNumber: String
    },
    ultrasonicTesting: {
        performed: Boolean,
        results: String,
        reportNumber: String
    },
    bendTest: {
        performed: Boolean,
        results: String,
        reportNumber: String
    },
    
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
