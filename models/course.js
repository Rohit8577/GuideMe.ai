const mongoose = require('mongoose');

// ==============================
// 2. COURSE SCHEMA
// ==============================
const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    
    imageUrl: { 
        type: String, 
        default: 'https://via.placeholder.com/800x600?text=Course+Image' 
    },
    
    icon: { type: String, default: 'fa-folder' },
    difficulty: { type: String, default: 'Beginner' },
    duration: { type: String, default: 'Flexible' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    chapters: [{
        chapter_title: String,
        isCompleted: { type: Boolean, default: false },
        timeSpent: { type: Number, default: 0 },
        visitCount: { type: Number, default: 0 },
        
        // 🧠 Quiz Data
        quizAttempts: [{
            score: Number,              // percentage e.g. 80
            totalQuestions: Number,      // e.g. 10
            correctAnswers: Number,     // e.g. 8
            passed: Boolean,            // score >= 70
            attemptedAt: { type: Date, default: Date.now }
        }],
        quizBestScore: { type: Number, default: 0 },
        quizPassed: { type: Boolean, default: false },
        
        subtopics: [{
            title: String,
            explanation: String,
            code: String,
            youtube_query: String,
            videos: [{ 
                title: String, 
                thumbnail: String, 
                url: String, 
                duration: String,
                channel: String,
                views: Number
            }],
            
            // 🔥 YAHAN NAYA FIELD ADD KIYA HAI 🔥
            specific_topics: [{
                topic_name: String,      // User ne jo input dala (e.g., "Easy explanation")
                content: String,         // AI ne jo HTML generate karke diya
                createdAt: { type: Date, default: Date.now } // Timestamp taaki track rahe
            }]
            // -----------------------------------
        }]
    }],
    createdAt: { type: Date, default: Date.now }
});

// Model create karo
const Course = mongoose.model('Course', courseSchema);

module.exports = { Course };