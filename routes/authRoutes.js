// ==========================================
// 🔐 ROUTES/AUTHROUTES.JS
// ==========================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// --- SIGNUP ---
router.post('/signup', authController.signup);

// --- LOGIN ---
router.post('/login', authController.login);

// --- LOGOUT ---
router.get('/logout', authController.logout);

router.post("/google", authController.googleLogin)

module.exports = router;