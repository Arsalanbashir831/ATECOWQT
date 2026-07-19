const mongoose = require('mongoose');
const userSchema = mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    user_role: { type: String, enum: ['supervisor', 'inspector'], required: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true }
}, { timestamps: true });

const User = mongoose.model("User",userSchema);
module.exports = User
