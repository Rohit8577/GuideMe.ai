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

// --- PROGRESS TOGGLE ---
router.put('/courses/:id/chapters/:chapterIndex/toggle', authenticateToken, courseController.toggleChapterProgress);

// --- COMMUNITY & NOTIFICATION LOGIC ---
router.get('/community', authenticateToken, communityController.getCommunityInteractions);
router.post('/request-course', communityController.requestCourse);
router.get('/notifications', authenticateToken, communityController.getNotifications);
router.post('/notifications/:id/action', authenticateToken, communityController.handleRequestAction);

// --- AI TUTOR ---
router.post('/chat', authenticateToken, chatController.aiChat);

module.exports = router;