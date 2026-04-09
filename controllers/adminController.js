const { User } = require('../models/user');
const { Course } = require('../models/course');
const { Feedback } = require('../models/feedback');
const { Resource } = require('../models/resource');

// =======================
// 📊 DASHBOARD ANALYTICS
// =======================
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalCourses = await Course.countDocuments();
        
        // Active users = Logged in within the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeUsersCount = await User.countDocuments({ lastLogin: { $gte: oneDayAgo } });

        res.json({ totalUsers, totalCourses, activeUsersCount });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
};

// =======================
// 👥 USER MANAGEMENT
// =======================
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        
        // Enhance with dynamic activity status: Logged in within 24h = Active, else Inactive
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const enhancedUsers = users.map(user => {
            const temp = user.toObject();
            temp.status = (temp.lastLogin && new Date(temp.lastLogin) > oneDayAgo) ? 'Active' : 'Inactive';
            if (temp.isBlocked) temp.status = 'Blocked';
            return temp;
        });

        res.json(enhancedUsers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

const toggleBlockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Admins cannot block other admins
        if (user.role === 'admin' || user.email.toLowerCase() === 'harsh@admin.com' || user.email.toLowerCase() === 'gaurav@admin.com') {
            return res.status(403).json({ error: "Cannot block an administrator." });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({ message: user.isBlocked ? "User blocked" : "User unblocked", isBlocked: user.isBlocked });
    } catch (error) {
        res.status(500).json({ error: "Failed to toggle block status" });
    }
};

// =======================
// 📚 COURSE MONITORING
// =======================
const getAllCoursesAdmin = async (req, res) => {
    try {
        const courses = await Course.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch courses" });
    }
};

const deleteCourseAdmin = async (req, res) => {
    try {
        await Course.findByIdAndDelete(req.params.id);
        res.json({ message: "Course deleted successfully by Admin" });
    } catch (error) {
        res.status(500).json({ error: "Delete failed" });
    }
};

const getTopicPopularity = async (req, res) => {
    try {
        // Aggregate generated topics (using regex on title or grouping)
        const courses = await Course.find().select('title');
        const topicCounts = {};

        courses.forEach(c => {
            // Very simple categorization extract words or just use title
            // A more robust app would track main Category. Handled by just title for now.
            const w = c.title.split(' ')[0]; // Simplification
            topicCounts[w] = (topicCounts[w] || 0) + 1;
        });

        // Convert to array and sort
        const sortedTopics = Object.entries(topicCounts)
            .map(([topic, count]) => ({ topic, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5

        res.json(sortedTopics);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch top topics" });
    }
};

// =======================
// ⚙️ API RESOURCE CONTROL
// =======================
const getApiHealth = async (req, res) => {
    try {
        // Fetch sum of all AI generations
        const users = await User.find().select('totalAiGenerations');
        const totalUsed = users.reduce((acc, user) => acc + (user.totalAiGenerations || 0), 0);
        
        // Mock Quota
        const monthlyQuota = 10000;
        const quotaLeft = Math.max(0, monthlyQuota - totalUsed);

        // Usage Limits example structure
        const dailyLimitPerUser = 50;

        res.json({
            quotaUsed: totalUsed,
            quotaLeft: quotaLeft,
            quotaTotal: monthlyQuota,
            dailyLimitPerUser: dailyLimitPerUser,
            health: (totalUsed / monthlyQuota) > 0.9 ? 'Warning' : 'Good'
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch API Health" });
    }
};

// =======================
// 📢 HYBRID LEARNING / FEEDBACK
// =======================
const uploadResource = async (req, res) => {
    try {
        const { title, message, pdfUrl } = req.body;
        const newResource = new Resource({
            title,
            message,
            pdfUrl,
            createdBy: req.user.id
        });
        await newResource.save();
        res.json({ message: "Resource uploaded successfully", resource: newResource });
    } catch (error) {
        res.status(500).json({ error: "Failed to upload resource" });
    }
};

const getReportsAndFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback.find().populate('userId', 'name email').populate('courseId', 'title').sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch reports" });
    }
};

// USER FACING ENDPOINT (Placing here for completeness)
const submitUserFeedback = async (req, res) => {
    try {
        const { type, message, courseId } = req.body;
        const userId = req.user.id;

        const newFeedback = new Feedback({
            userId,
            courseId, // Only for "report" wrong course
            type: type || 'feedback',
            message
        });
        
        await newFeedback.save();
        res.json({ message: "Thank you for the feedback." });

    } catch (error) {
        res.status(500).json({ error: "Failed to submit feedback" });
    }
};

module.exports = {
    getDashboardStats,
    getAllUsers,
    toggleBlockUser,
    getAllCoursesAdmin,
    deleteCourseAdmin,
    getTopicPopularity,
    getApiHealth,
    uploadResource,
    getReportsAndFeedback,
    submitUserFeedback
};
