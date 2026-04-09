const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

// Protected explicitly by adminAuth
router.get('/stats', authenticateToken, adminAuth, adminController.getDashboardStats);
router.get('/users', authenticateToken, adminAuth, adminController.getAllUsers);
router.put('/users/:userId/block', authenticateToken, adminAuth, adminController.toggleBlockUser);

router.get('/courses', authenticateToken, adminAuth, adminController.getAllCoursesAdmin);
router.delete('/courses/:id', authenticateToken, adminAuth, adminController.deleteCourseAdmin);
router.get('/topics/popular', authenticateToken, adminAuth, adminController.getTopicPopularity);

router.get('/api/health', authenticateToken, adminAuth, adminController.getApiHealth);

router.post('/resource', authenticateToken, adminAuth, adminController.uploadResource);
router.get('/reports', authenticateToken, adminAuth, adminController.getReportsAndFeedback);

// Expose submit feedback to standard users, so it's only protected by standard authenticateToken
router.post('/feedback', authenticateToken, adminController.submitUserFeedback);

module.exports = router;
