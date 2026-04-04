// ==========================================
// 🛡️ MIDDLEWARE/AUTHMIDDLEWARE.JS
// ==========================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "hexsmith_super_secret_key_change_this";

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token; // Read token from cookie

    if (!token) {
        // Token missing (redirect to login or send 401)
        return res.status(401).json({ error: "Access Denied. Login Required." });
    }

    try {
        // Verify token
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // Store user payload (id) in request
        next(); // Proceed to the route handler
    } catch (err) {
        // Token invalid or expired
        return res.status(403).json({ error: "Invalid Token. Login again." });
    }
};

module.exports = authenticateToken;