const { User } = require('../models/user');

const adminAuth = async (req, res, next) => {
    try {
        // req.user is populated by authenticateToken middleware
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.role !== 'admin' && user.email.toLowerCase() !== 'harsh@admin.com' && user.email.toLowerCase() !== 'gaurav@admin.com') {
            return res.status(403).json({ error: "Access Denied. Admins only." });
        }

        // Optional: update lastActive for the admin
        user.lastActive = Date.now();
        await user.save();

        req.adminUser = user;
        next();
    } catch (err) {
        console.error("Admin Auth Middleware Error:", err);
        res.status(500).json({ error: "Server Error during admin authentication" });
    }
};

module.exports = adminAuth;
