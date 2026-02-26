// ==========================================
// ⚙️ CONFIG/DB.JS (Database Connection)
// ==========================================

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log("MONGO_URI =", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected.`);
    } catch (error) {
        console.error(`❌ DB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;