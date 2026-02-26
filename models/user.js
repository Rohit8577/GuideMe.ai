const mongoose = require('mongoose');

// ==============================
// 1. USER SCHEMA
// ==============================
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
        type: String,
        required: false
    },
    googleId: {
        type: String
    },
    schoolCollege: { type: String, default: '' },
    interestedTopic: { type: String, default: '' },
    resetPasswordOtp: { type: Number },
    resetPasswordExpires: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

// Model create karo
const User = mongoose.model('User', userSchema);

module.exports = { User }