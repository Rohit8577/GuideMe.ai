const { Course } = require('../models/course');
const { Notification } = require('../models/notification');

const getCommunityInteractions = async (req, res) => {
    try {
        const userId = req.user.id;

        // STEP 1: Courses jo maine request kiye hain (Pending/Accepted)
        const myInteractions = await Notification.find({
            sender: userId,
            type: 'request',
            status: { $in: ['pending', 'accepted'] }
        }).select('course');
        const excludedCourseIds = myInteractions.map(i => i.course);

        // STEP 2: Mere khud ke courses ke Titles nikalo (Copy filtering ke liye)
        const myOwnCourses = await Course.find({ createdBy: userId }).select('title');
        const myCourseTitles = myOwnCourses.map(c => c.title);

        // STEP 3: Community Courses fetch karo
        const courses = await Course.find({
            createdBy: { $ne: userId },
            _id: { $nin: excludedCourseIds },
            title: { $nin: myCourseTitles } // Hide my course copies
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('createdBy', 'name');

        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed" });
    }
};

const requestCourse = async (req, res) => {
    try {
        const { courseId, requesterId } = req.body;

        // Course dhoondo taaki owner ka pata chale
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found" });

        // Check agar owner khud user hi hai
        if (course.createdBy.toString() === requesterId) {
            return res.status(400).json({ error: "You already own this course" });
        }

        // Check agar pehle se request hai
        const existing = await Notification.findOne({
            sender: requesterId,
            recipient: course.createdBy,
            course: courseId,
            status: 'pending'
        });
        if (existing) return res.json({ message: "Request already pending" });

        // Create Notification
        const notif = new Notification({
            sender: requesterId,
            recipient: course.createdBy, // Owner ko jayega
            course: courseId
        });

        await notif.save();
        res.json({ message: "Request sent successfully!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Request failed" });
    }
};

const getNotifications = async (req, res) => {
    try {
        // Hum wo notifications layenge jo:
        // 1. Pending Course Requests hain (Owner ke liye)
        // 2. YA FIR Unread Info Messages hain (Requester ke liye result)
        const notifs = await Notification.find({
            recipient: req.user.id,
            $or: [
                { type: 'request', status: 'pending' },
                { type: 'info', status: 'unread' }
            ]
        })
            .populate('sender', 'name')
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        res.json(notifs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

const handleRequestAction = async (req, res) => {
    try {
        const { action } = req.body; // 'accept', 'reject', or 'dismiss'
        const notif = await Notification.findById(req.params.id).populate('course');

        if (!notif) return res.status(404).json({ error: "Notification not found" });

        // --- CASE 1: Dismiss Info Message (User ne message padh liya) ---
        if (action === 'dismiss') {
            await Notification.findByIdAndDelete(req.params.id);
            return res.json({ message: "Notification cleared" });
        }

        // --- CASE 2: Reject Request ---
        if (action === 'reject') {
            notif.status = 'rejected';
            await notif.save();

            // Notify Requester (REJECTION MSG)
            await Notification.create({
                sender: req.user.id,       // Owner
                recipient: notif.sender,   // Requester
                course: notif.course._id,
                type: 'info',              // Sirf info msg
                status: 'unread',
                message: `❌ Your request for "${notif.course.title}" was declined.`
            });

            return res.json({ message: "Request Rejected" });
        }

        // --- CASE 3: Accept Request ---
        if (action === 'accept') {
            const originalCourse = notif.course;

            // --- RESET PROGRESS LOGIC START ---
            // Hum chapters ko map karenge aur 'isCompleted' ko jabardasti FALSE kar denge
            const freshChapters = originalCourse.chapters.map(ch => ({
                chapter_title: ch.chapter_title,
                subtopics: ch.subtopics, // Content same rahega
                isCompleted: false       // <--- YE HAI MAIN CHEEZ (Reset to 0%)
            }));
            // --- RESET PROGRESS LOGIC END ---

            // Course Copy Logic
            const newCourseForUser = new Course({
                title: originalCourse.title,
                description: originalCourse.description,
                imageUrl: originalCourse.imageUrl,
                icon: originalCourse.icon,
                difficulty: originalCourse.difficulty,
                duration: originalCourse.duration,

                chapters: freshChapters, // <--- Updated "Zero Progress" wale chapters yahan dale

                createdBy: notif.sender // New Owner = Requester
            });

            await newCourseForUser.save();

            // Update Request Status
            notif.status = 'accepted';
            await notif.save();

            // Notify Requester (SUCCESS MSG)
            await Notification.create({
                sender: req.user.id,
                recipient: notif.sender,
                course: notif.course._id,
                type: 'info',
                status: 'unread',
                message: `🎉 Congrats! Your request for "${originalCourse.title}" is ACCEPTED.`
            });

            return res.json({ message: "Request Accepted & User Notified!" });
        }

    } catch (err) {
        console.error("Action Error:", err);
        res.status(500).json({ error: "Action failed" });
    }
};

module.exports = {
    getCommunityInteractions,
    requestCourse,
    getNotifications,
    handleRequestAction
};
