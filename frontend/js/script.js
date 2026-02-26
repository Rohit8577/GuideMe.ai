// ==============================
// 🟢 SCRIPT.JS - ENTRY POINT
// ==============================

// 1. IMPORT MODULES
import { fetchUserInfo, handleLogout, closeLogoutModal, confirmLogout, loadUserName } from './modules/auth.js';
import { toggleSidebar, showSection, copyCode, toggleNotifications } from './modules/ui.js';
import { fetchAndDisplayCourses, loadExploreSuggestions, loadProfile, deleteCourse, renderDashboard, startFromSuggestion } from './modules/dashboard.js';
import { generateOutline, confirmAndGenerate, addCustomTopic, removeCustomTopic, renderTopics, updateCounter } from './modules/courseGenerator.js';
import { startCourse, openVideoModal, closeVideoModal, loadChapter, toggleChapterStatus, updateSidebarProgress } from './modules/coursePlayer.js';
import { openCommunityModal, closeCommunityModal, previewCommunityCourse, sendCourseRequest, checkNotifications, handleNotifAction } from './modules/community.js';
import { toggleTutorChat, handleEnter, sendMessage } from './modules/chat.js';


// 2. BIND TO WINDOW OBJECT (For HTML inline onclick events)
window.handleLogout = handleLogout;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
window.toggleSidebar = toggleSidebar;
window.showSection = showSection;
window.copyCode = copyCode;
window.toggleNotifications = toggleNotifications;
window.deleteCourse = deleteCourse;
window.generateOutline = generateOutline;
window.confirmAndGenerate = confirmAndGenerate;
window.startCourse = startCourse;
window.openVideoModal = openVideoModal;
window.closeVideoModal = closeVideoModal;
window.loadChapter = loadChapter;
window.toggleChapterStatus = toggleChapterStatus;
window.updateSidebarProgress = updateSidebarProgress;
window.startFromSuggestion = startFromSuggestion;
window.openCommunityModal = openCommunityModal;
window.closeCommunityModal = closeCommunityModal;
window.previewCommunityCourse = previewCommunityCourse;
window.sendCourseRequest = sendCourseRequest;
window.handleNotifAction = handleNotifAction;
window.addCustomTopic = addCustomTopic
window.removeCustomTopic = removeCustomTopic
window.toggleTutorChat = toggleTutorChat;
window.handleEnter = handleEnter
window.sendMessage = sendMessage



// 3. INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    await fetchUserInfo();
    fetchAndDisplayCourses();
    checkNotifications();
    showSection('dashboard');
    loadUserName();
});

// Escape key for Video Modal
document.addEventListener('keydown', function (event) {
    if (event.key === "Escape" && !document.getElementById('videoModal').classList.contains('hidden')) {
        closeVideoModal();
    }
});

document.getElementById('topicInput').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault(); 
    addCustomTopic();
  }
});

// Jab user numChapters change kare, toh counter update karo
document.getElementById('numChapters').addEventListener('input', function(e) {
  let maxChapters = parseInt(e.target.value) || parseInt(e.target.min);
  if (topicsArray.length > maxChapters) {
    topicsArray = topicsArray.slice(0, maxChapters);
    renderTopics();
  }
  updateCounter();
});