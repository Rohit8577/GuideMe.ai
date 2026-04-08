// ==========================================
// 🚀 ROUTES/COURSEROUTES.JS
// ==========================================

const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');

// Controllers
const userController = require('../controllers/userController');
const courseController = require('../controllers/courseController');
const communityController = require('../controllers/communityController');
const chatController = require('../controllers/chatController');
const analysisController = require('../controllers/analysisController');
const pdfController = require('../controllers/pdfController');



// --- USER INFO ---
router.get('/user', authenticateToken, userController.getUserProfile);

// --- FORGOT & RESET PASSWORD ---
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// --- COURSE GENERATION & CRUD ---
router.get('/courses', authenticateToken, courseController.getAllCourses);
router.get('/courses/:id', authenticateToken, courseController.getCourseById);
router.delete('/courses/:id', authenticateToken, courseController.deleteCourse);
router.post('/generate-course', authenticateToken, courseController.generateCourse);
router.post('/suggest', courseController.getSuggestions);
router.post('/create-outline', authenticateToken, courseController.createOutline);
router.post('/generate-more-content', authenticateToken, courseController.generateMoreContent)
router.post('/generate-specific-topic', authenticateToken, courseController.generateSpecificTopic)
router.post('/regenerate-explanation', authenticateToken, courseController.regenerateExplanation)



router.post('/analytics/track-time', authenticateToken, analysisController.analysis)
router.get('/analytics/:courseId', authenticateToken, analysisController.courseAnalysis)

// --- PROGRESS TOGGLE ---
router.put('/courses/:id/chapters/:chapterIndex/toggle', authenticateToken, courseController.toggleChapterProgress);

// --- COMMUNITY & NOTIFICATION LOGIC ---
router.get('/community', authenticateToken, communityController.getCommunityInteractions);
router.post('/request-course', communityController.requestCourse);
router.get('/notifications', authenticateToken, communityController.getNotifications);
router.post('/notifications/:id/action', authenticateToken, communityController.handleRequestAction);

// --- AI TUTOR ---
router.post('/chat', authenticateToken, chatController.aiChat);

// --- PDF DOWNLOAD ---
router.get('/courses/:courseId/download/chapter/:chapterIndex', authenticateToken, pdfController.downloadChapterPdf);
router.get('/courses/:courseId/download/full', authenticateToken, pdfController.downloadFullCoursePdf);

module.exports = router;