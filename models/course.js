const mongoose = require('mongoose');

// ==============================
// 2. COURSE SCHEMA
// ==============================
const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    
    // --- NEW FIELD ADDED ---
    imageUrl: { 
        type: String, 
        default: 'https://via.placeholder.com/800x600?text=Course+Image' // Fallback image taaki khali na dikhe
    },
    // -----------------------

    icon: { type: String, default: 'fa-folder' },
    difficulty: { type: String, default: 'Beginner' },
    duration: { type: String, default: 'Flexible' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    chapters: [{
        chapter_title: String,
        isCompleted: { type: Boolean, default: false },
        subtopics: [{
            title: String,
            explanation: String,
            code: String,
            youtube_query: String,
            videos: [{ title: String, thumbnail: String, url: String, duration: String }]
        }]
    }],
    createdAt: { type: Date, default: Date.now }
});

// Model create karo
const Course = mongoose.model('Course', courseSchema);

module.exports = { Course };