const { User } = require('../models/user');
const { sendOTP } = require('../utils/emailService');
const bcrypt = require('bcryptjs');

// --- USER INFO ---
const getUserProfile = async (req, res) => {
    try {
        // Get current user details
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
};

// --- FORGOT PASSWORD ---
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        console.log("Sending OTP to:", email);

        const otp = Math.floor(1000 + Math.random() * 9000);

        try {
            await sendOTP(email, otp);
            console.log("Email sent successfully!");

            // Update user document with OTP
            await User.findOneAndUpdate(
                { email },
                {
                    resetPasswordOtp: otp,
                    resetPasswordExpires: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
                }
            );

            res.json({ message: "OTP sent successfully" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to send OTP via email" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to process forgot password request." });
    }
};

// --- RESET PASSWORD ---
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if OTP matches & is not expired
        if (user.resetPasswordOtp !== parseInt(otp)) {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        if (user.resetPasswordExpires < Date.now()) {
            return res.status(400).json({ error: "OTP expired" });
        }

        // Hash new password & save
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: "Password updated successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Password reset failed" });
    }
};

module.exports = {
    getUserProfile,
    forgotPassword,
    resetPassword
};
