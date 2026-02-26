const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const admin = require("firebase-admin");
const serviceAccount = require("./firebase.json"); // path check kar lena

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "hexsmith_super_secret_key_change_this";

const signup = async (req, res) => {
    try {
        const { name, email, password, schoolCollege, interestedTopic } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already exists!" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ name, email, password: hashedPassword, schoolCollege, interestedTopic });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

        // Set HTTP Only Cookie
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
        });

        res.json({ message: "Signup Successful", user: { name: newUser.name, email: newUser.email } });
    } catch (err) {
        res.status(500).json({ error: "Signup Failed" });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid Password" });

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

        // Set HTTP Only Cookie
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ message: "Login Successful", user: { name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: "Login Failed" });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: "No Google token provided" });
        }

        // 🔥 Verify Firebase Token
        const decoded = await admin.auth().verifyIdToken(token);

        const { email, name, uid } = decoded;

        let user = await User.findOne({ email });

        // Agar user nahi hai to create karo
        if (!user) {
            user = new User({
                name,
                email,
                googleId: uid
            });
            await user.save();
        } else if (!user.googleId) {
            user.googleId = uid;
            await user.save();
        }

        // Apna JWT generate karo
        const jwtToken = jwt.sign(
            { id: user._id },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Cookie set karo
        res.cookie("token", jwtToken, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: "Google Login Successful",
            user: { name: user.name, email: user.email }
        });

    } catch (err) {
        console.error(err);
        res.status(401).json({ error: "Google Authentication Failed" });
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: "Logged out" });
};

module.exports = {
    signup,
    login,
    logout,
    googleLogin
};
