// ==================================================
// 🟢 SERVER.JS (ENTRY POINT)
// ==================================================

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Custom Modules
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "hexsmith_super_secret_key_change_this";

// Connect to Database
connectDB();

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Body parser
app.use(cookieParser()); // Read cookies
app.use(express.static(path.join(__dirname, './frontend'))); // Serve static files

// Root Route (Server-side Auth Check)
app.get('/', (req, res) => {
    const token = req.cookies.token; // Read token
    try {
        jwt.verify(token, JWT_SECRET);
        res.sendFile(path.join(__dirname, './frontend', 'index.html')); // Dashboard
    } catch (err) {
        res.sendFile(path.join(__dirname, './frontend', 'login.html')); // Login
    }
});

// Public Pages Routes (Direct Access)
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, './frontend', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, './frontend', 'signup.html')));


// API Routes Registration
app.use('/api/auth', authRoutes); // Auth routes
app.use('/api', courseRoutes);    // Courses, Community, Notifications

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});