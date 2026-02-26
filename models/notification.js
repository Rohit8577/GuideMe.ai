const mongoose = require('mongoose');

// ==============================
// 3. NOTIFICATION SCHEMA (UPDATED)
// ==============================
const notificationSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    
    // 'request' = Owner ko dikhega (Accept/Reject buttons ke saath)
    // 'info' = Requester ko dikhega (Sirf result message)
    type: { type: String, enum: ['request', 'info'], default: 'request' }, 

    // 'unread' status use karenge info messages ke liye
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'unread', 'read'], default: 'pending' },
    
    message: { type: String }, // Custom message store karne ke liye
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification };