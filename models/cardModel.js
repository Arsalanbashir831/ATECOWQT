const mongoose = require('mongoose');

const cardSchema = mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now
        , get: function (date) {
            return date.toLocaleDateString('en-US');
        }
    },
    count: Number,
    company: String,
    welder_name: String,
    iqama_no: String,
    welder_id: String,
    card_no: String,
    tempCardNo: String,
    process: String,
    test_position: String,
    vertical_progression: String,
    test_dia: String,
    thickness_qualified: String,
    diameter_qualified: String,
    p_no_qualified: String,
    f_no_qualified: String,
    place_of_issue: String,
    date_of_test: String,
    wps_pqr_no: String,
    joint_type: String,
    position_qualified: String,
    test_thickness: String,
    range_qualified: String,
    electrode_class_used: String,
    test_method: String,
    date_of_expiry: String,
    authorized_by: String,
    welding_inspector: String,
    image: String,
    qr: String,
    year: String,
    tableData: mongoose.Schema.Types.Mixed
}, { minimize: false })

const Card = mongoose.model("Card", cardSchema);
module.exports = Card