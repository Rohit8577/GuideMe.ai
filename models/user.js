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
    
    // Admin & Tracking Fields
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBlocked: { type: Boolean, default: false },
    totalAiGenerations: { type: Number, default: 0 },
    dailyGenerationCount: { type: Number, default: 0 },
    lastGenerationDate: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    lastActive: { type: Date, default: Date.now },

    createdAt: { type: Date, default: Date.now }
});

// Model create karo
const User = mongoose.model('User', userSchema);

module.exports = { User }