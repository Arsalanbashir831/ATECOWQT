const mongoose = require('mongoose');
const certificateModel = mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now,
        get: function(date) {
            return date.toLocaleDateString('en-US');
        }
    },
    count: Number,
    certificateNo: String,
    iqamaPic: String,
    profilePic: String,
    qrLink: String,
    clientName: String,
    supervisorName: String,
    welderName: String,
    welderInspector:String,
    identification_wps: String,
    iqamaNo: String,
    qualifcationStandard: String,
    welderId: String,
    baseMetalSpecs: String,
    wtaRef: String,
    jointType: String,
    date_of_test: String,
    testCouponSize: String,
    fillerMetalElectrodeClass: String,
    weldType: String,
    weldDate: String,
    year:String,

    welderProcessActual: String,
    welderProcessRange: String,

    typesOfWeldersActual: String,
    typesOfWeldersRange: String,

    brackingActual: String,
    brackingRange: String,

    typesOfWieldActual: String,
    typesOfWieldRange: String,

    productTypeActual: String,
    productTypeRange: String,

    diameterOfPipeActual: String,
    diameterOfPipeRange: String,

    baseMetalp_pActual: String,
    baseMetalp_pRange: String,

    fillerMetalActual: String,
    fillerMetalRange: String,

    fillerMetalFNoActual: String,
    fillerMetalFNoRange: String,

    fillerMetalAdditionActual: String,
    fillerMetalAdditionRange: String,

    consumableInsertActual: String,
    consumableInsertRange: String,

    depositeThicknessActual: String,
    depositeThicknessRange: String,

    welderPositionActual: String,
    welderPositionRange: String,

    verticalProgressionActual: String,
    verticalProgressionRange: String,
    typesOfFuelGasActual: String,
    typesOfFuelGasRange: String,

    insertGasBackingActual: String,
    insertGasBackingRange: String,

    transferModelActual: String,
    transferModelRange: String,

    currentTypePolarityActual: String,
    currentTypePolarityRange: String,

    virtualInspectorChecked: String,
    virtualInspectorReportNo: String,
    virtualInspectorResults: String,

    radiographyChecked: String,
    radiographyReportNo: String,
    radiographyResults: String,

    mechTestChecked: String,
    mechTestReportNo: String,
    mechTestResults: String,

    attr1key: String,
    attr1value: String,
    attr1range: String,

    attr2key: String,
    attr2value: String,
    attr2range: String

    
})

const Certificate = mongoose.model("Certificate", certificateModel);
module.exports = Certificate