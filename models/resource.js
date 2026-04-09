const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String }, // Alert message
    pdfUrl: { type: String },  // Optional URL to PDF if uploaded
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = { Resource };
