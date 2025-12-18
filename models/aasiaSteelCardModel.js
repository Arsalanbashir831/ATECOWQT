const mongoose = require("mongoose");

const aasiaSteelCardSchema = mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
    get: function (date) {
      return date.toLocaleDateString("en-US");
    },
  },
  count: Number,
  company: String,
  welder_name: String,
  iqama_no: String,
  welder_id: String,
  card_no: String,
  authorized_by: String,
  welding_inspector: String,
  // Welding Process/Type
  welding_process_type_actual: String,
  welding_process_type_range: String,
  // Backing
  backing_actual: String,
  backing_range: String,
  // Diameter
  diameter_actual: String,
  diameter_range: String,
  // Base Metal P-No.
  base_metal_pno_actual: String,
  base_metal_pno_range: String,
  // Deposited Thickness
  deposited_thickness_actual: String,
  deposited_thickness_range: String,
  // Position & Prog.
  position_prog_actual: String,
  position_prog_range: String,
  // Filler Metal Class
  filler_metal_class_actual: String,
  filler_metal_class_range: String,
  // Filler Metal F-No.
  filler_metal_fno_actual: String,
  filler_metal_fno_range: String,
  // Use of Backing Gas
  backing_gas_actual: String,
  backing_gas_range: String,
  // Transfer Mode
  transfer_mode_actual: String,
  transfer_mode_range: String,
  // Current Type/Polarity
  current_type_polarity_actual: String,
  current_type_polarity_range: String,
  // Join/Weld Type
  join_weld_type_actual: String,
  join_weld_type_range: String,
  image: String,
  qr: String,
  tableData: mongoose.Schema.Types.Mixed, // Stores { headers: [], rows: [] }
});

const AasiaSteelCard = mongoose.model("AasiaSteelCard", aasiaSteelCardSchema);
module.exports = AasiaSteelCard;
