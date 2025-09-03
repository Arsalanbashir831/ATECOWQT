const mongoose = require('mongoose');

const aasiaSteelCardSchema = mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now,
        get: function(date) {
            return date.toLocaleDateString('en-US');
        }
    },
    count: Number,
    company: String,
    welder_name: String,
    iqama_no: String,
    welder_id: String,
    card_no: String,
    authorized_by: String,
    welding_inspector: String,
    welding_process_and_type: String,
    direct_or_remote_visual_control: String,
    auto_arc_voltage_control: String,
    automatic_joint_tracking: String,
    positions: String,
    base_material_dia_and_thickness: String,
    consumable_inserts: String,
    backing: String,
    single_or_multiple_passes: String,
    base_metal_spec_or_p_no: String,
    filler_metal_spec_or_class: String,
    joint_or_weld_type: String,
    image: String,
    qr: String
});

const AasiaSteelCard = mongoose.model("AasiaSteelCard", aasiaSteelCardSchema);
module.exports = AasiaSteelCard;
