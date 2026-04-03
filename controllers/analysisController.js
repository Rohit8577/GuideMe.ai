const { Course } = require('../models/course');

// ==========================================
// ⏱️ 1. TRACK ANALYTICS (Data Collector)
// ==========================================
const analysis = async (req, res) => {
    try {
        const { courseId, chapterIndex, timeSpent } = req.body;
        
        if (!courseId || timeSpent == null || chapterIndex == null) {
            return res.status(400).json({ error: "Missing data bro! 💀" });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found 🕵️‍♂️" });

        // Total time toh har baar add hoga (chahe 5 sec hi kyu na ruka ho)
        course.chapters[chapterIndex].timeSpent = 
            (course.chapters[chapterIndex].timeSpent || 0) + timeSpent;
        
        // Visit count tabhi badhega agar frontend se signal aaye ki session valid tha
        // Note: Make sure frontend se 'timeSpent' SECONDS mein aa raha ho!
        if (timeSpent >= 30) {
            course.chapters[chapterIndex].visitCount = 
                (course.chapters[chapterIndex].visitCount || 0) + 1;
        }
        
        // Mongoose ko batana zaroori hai ki array modify hua hai 
        course.markModified('chapters'); 

        await course.save();
        res.status(200).json({ message: "Analytics tracked like a pro ⏱️🔥" });

    } catch (err) {
        console.error("Time tracking error:", err);
        res.status(500).json({ error: "Server fat gaya 💥" });
    }
};

// ==========================================
// 🧠 2. COURSE ANALYSIS (The Smart Dashboard Data)
// ==========================================
const courseAnalysis = async(req, res) => {
    try {
        const courseId = req.params.courseId;
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        let totalSeconds = 0;
        let completedCount = 0;

        const labels = [];
        const timeData = [];
        const chapterStats = [];

        // 🔹 STEP 1: Basic Math & Table Data Collect Karo
        course.chapters.forEach((ch) => {
            const timeInSec = ch.timeSpent || 0;
            const timeInMins = Math.round(timeInSec / 60);
            
            totalSeconds += timeInSec;
            if (ch.isCompleted) completedCount++;

            // Graph Arrays
            labels.push(ch.chapter_title);
            timeData.push(timeInMins); 

            // Table Status Logic
            let status = "Pending";
            if (ch.isCompleted) status = "Completed";
            else if (timeInSec > 0) status = "In Progress";

            // Table Array (Added visits for the new UI column)
            chapterStats.push({
                name: ch.chapter_title,
                timeSpent: timeInMins,
                visits: ch.visitCount || 0, // Sending visit count to frontend
                status: status
            });
        });

        // 🔹 STEP 2: The "Smart" Hardest Chapter Logic 🔥
        const activeChapters = course.chapters.filter(ch => !ch.isCompleted && ch.timeSpent > 0);
        
        // Average speed calculation (To compare relative difficulty)
        const avgSeconds = activeChapters.length > 0 ? (totalSeconds / activeChapters.length) : 1; 
        
        const VISIT_WEIGHT = 0.5;
        const DANGER_THRESHOLD = 3.0; // The threshold we discussed
        
        let strugglingChapters = [];
        let maxScore = -1;
        let hardestModule = "None"; // Default if all clean

        activeChapters.forEach(ch => {
            const timeInSec = ch.timeSpent || 0;
            const visits = ch.visitCount || 1; // Default to 1 if time spent but no visit logged

            // THE OP FORMULA
            const score = (timeInSec / avgSeconds) + (visits * VISIT_WEIGHT);

            // Track Absolute Hardest (For the main KPI card)
            if (score > maxScore) {
                maxScore = score;
                hardestModule = ch.chapter_title;
            }

            // Track ones that cross the Danger Threshold (For alerts)
            if (score >= DANGER_THRESHOLD) {
                strugglingChapters.push({
                    title: ch.chapter_title,
                    score: parseFloat(score.toFixed(2)),
                    time: timeInSec,
                    visits: visits
                });
            }
        });

        // Sort from highest struggle to lowest
        strugglingChapters.sort((a, b) => b.score - a.score);

        // 🔹 STEP 3: Time Formatting & KPI Calculation
        const totalChapters = course.chapters.length;
        const completionPercent = totalChapters === 0 ? 0 : Math.round((completedCount / totalChapters) * 100);

        // Seconds ko "Xh Ym" format me convert karna
        const totalHours = Math.floor(totalSeconds / 3600);
        const remainingMins = Math.floor((totalSeconds % 3600) / 60);
        const totalTimeStr = totalHours > 0 ? `${totalHours}h ${remainingMins}m` : `${remainingMins}m`;

        const avgMins = Math.round(avgSeconds / 60);
        const avgTimeStr = `${avgMins}m`;

        // 🔹 STEP 4: Payload bhejo frontend ko
        res.json({
            totalTime: totalTimeStr,
            avgTime: avgTimeStr,
            completionPercent: completionPercent,
            hardestModule: hardestModule, // Smartly calculated hardest module
            strugglingChapters: strugglingChapters, // 🔥 Naya Array for UI Alerts
            labels: labels,
            timeData: timeData,
            chapterStats: chapterStats
        });

    } catch (error) {
        console.error("Analytics fetch error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    analysis,
    courseAnalysis
};