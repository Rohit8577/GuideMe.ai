// ==============================
// 🟢 MODULE: DASHBOARD & PROFILE
// ==============================

import { showSection } from './ui.js';
import { generateOutline } from './courseGenerator.js';
import { startCourse } from './coursePlayer.js';
import { currentUser } from './auth.js';

export async function fetchAndDisplayCourses() {
    const grid = document.getElementById('courseGrid');
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i><p>Loading your courses...</p></div>`;

    try {
        const res = await fetch('/api/courses');
        if (!res.ok) throw new Error("Failed to fetch");
        const courses = await res.json();
        renderDashboard(courses);
    } catch (err) {
        grid.innerHTML = '<p class="text-red-500 col-span-full text-center">Failed to load courses.</p>';
    }
}

export function renderDashboard(courses) {
    const grid = document.getElementById('courseGrid');

    if (courses.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <i class="fa-solid fa-folder-open text-4xl mb-4 text-gray-300"></i>
                <p class="text-lg font-medium">No courses found.</p>
                <button onclick="window.showSection('create')" class="mt-4 text-primary font-semibold hover:underline">Create your first course</button>
            </div>`;
        return;
    }

    grid.innerHTML = courses.map(course => {
        const totalChapters = course.chapters ? course.chapters.length : 0;
        const completedChapters = course.chapters ? course.chapters.filter(ch => ch.isCompleted).length : 0;
        const progressPercent = totalChapters === 0 ? 0 : Math.round((completedChapters / totalChapters) * 100);

        const imageSrc = course.imageUrl || 'https://via.placeholder.com/800x600?text=No+Image';

        return `
        <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group">
            
            <div class="relative h-48 overflow-hidden bg-gray-100">
                <img src="${imageSrc}" alt="${course.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy">
                
                <div class="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-gray-700 uppercase shadow-sm">
                    ${course.difficulty || 'Beginner'}
                </div>
                
                <div class="absolute bottom-3 left-3 w-10 h-10 rounded-lg bg-white/90 backdrop-blur text-primary flex items-center justify-center shadow-md">
                     <i class="${course.icon || 'fa-solid fa-layer-group'}"></i>
                </div>
            </div>

            <div class="p-5 flex flex-col flex-1">
                <h3 class="text-lg font-bold text-gray-800 mb-2 line-clamp-2 leading-tight">${course.title}</h3>
                <p class="text-gray-500 text-sm line-clamp-2 mb-6 flex-1">${course.description || 'No description available.'}</p>
                
                <div class="mt-auto">
                    <div class="flex justify-between items-center text-xs text-gray-400 mb-2">
                        <span>Progress</span>
                        <span class="font-medium text-gray-700">${progressPercent}%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
                        <div class="bg-primary h-2 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
                    </div>
                    
                    <div class="flex gap-2">
                        <button onclick="window.startCourse('${course._id}')" class="flex-1 py-2.5 bg-primary hover:bg-primaryDark text-white rounded-lg font-medium transition-colors text-sm shadow-md shadow-violet-200">
                            ${progressPercent > 0 ? 'Continue Learning' : 'Start Learning'}
                        </button>
                        <button onclick="window.deleteCourse('${course._id}')" title="Delete Course" class="px-3 py-2.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group/trash">
                            <i class="fa-solid fa-trash group-hover/trash:scale-110 transition-transform"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

export async function deleteCourse(id) {
    if (!confirm("Are you sure?")) return;
    try {
        await fetch(`/api/courses/${id}`, { method: 'DELETE' });
        fetchAndDisplayCourses();
    } catch (e) { console.log("Delete failed"); }
}

export async function loadExploreSuggestions() {
    const grid = document.getElementById('exploreGrid');
    const label = document.getElementById('userInterestLabel');

    if (!currentUser) { setTimeout(loadExploreSuggestions, 500); return; }
    const topic = currentUser.interestedTopic || "Technology";
    label.innerText = topic;

    try {
        const res = await fetch('/api/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic })
        });
        const suggestions = await res.json();

        grid.innerHTML = suggestions.map(item => `
            <div class="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all flex flex-col h-full group">
                <div class="w-12 h-12 bg-violet-50 text-primary rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-primary group-hover:text-white transition-colors"><i class="fa-solid fa-lightbulb"></i></div>
                <h3 class="text-lg font-bold text-gray-800 mb-2">${item.title}</h3>
                <p class="text-gray-500 text-sm mb-4 flex-1 line-clamp-3">${item.description}</p>
                <div class="flex items-center gap-3 text-xs text-gray-400 mb-6">
                    <span class="bg-gray-50 px-2 py-1 rounded border border-gray-100">${item.chapters || 5} Chapters</span>
                    <span class="bg-gray-50 px-2 py-1 rounded border border-gray-100 capitalize">${item.difficulty || 'All Levels'}</span>
                </div>
                <button onclick="window.startFromSuggestion('${item.title.replace(/'/g, "\\'")}', ${item.chapters || 5})" class="w-full py-3 border border-primary text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-all">See Roadmap</button>
            </div>`).join('');
    } catch (err) { grid.innerHTML = '<p class="text-red-500 col-span-full text-center">Failed to load suggestions.</p>'; }
}

export async function loadProfile() {
    const list = document.getElementById('profileCoursesList');

    // 1. Loader Start ⏳
    list.innerHTML = `<div class="col-span-full py-12 text-center text-gray-400">
                        <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                        <p>Loading your profile...</p>
                      </div>`;

    try {
        // 2. Fetch Data from Backend (Parallel Call) 🚀
        const [userRes, coursesRes] = await Promise.all([
            fetch('/api/user'),
            fetch('/api/courses')
        ]);

        if (!userRes.ok || !coursesRes.ok) throw new Error("Data fetch failed");

        const user = await userRes.json();
        const courses = await coursesRes.json();

        // 3. UI Update: User Info 
        document.getElementById('profileName').innerText = user.name || "User";
        document.getElementById('profileEmail').innerText = user.email || "No Email";

        if (user.name) {
            document.getElementById('profileAvatar').innerText = user.name.charAt(0).toUpperCase();
        }

        document.getElementById('profileInterest').innerText = user.interestedTopic || "Technology";

        // 4. UI Update: Stats 
        document.getElementById('profileCourseCount').innerText = courses.length;

        const completedCoursesCount = courses.filter(c => {
            if (!c.chapters || c.chapters.length === 0) return false;
            return c.chapters.every(ch => ch.isCompleted === true);
        }).length;

        document.getElementById('profileCompletedCount').innerText = completedCoursesCount;

        // 5. UI Update: Courses Grid
        if (courses.length === 0) {
            list.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <i class="fa-solid fa-folder-open text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500 mb-4">No courses generated yet.</p>
                    <button onclick="window.showSection('create')" class="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-primaryDark transition-all shadow-lg shadow-violet-200">
                        Create New Course
                    </button>
                </div>`;
            return;
        }

        list.innerHTML = courses.map(course => {
            const totalChapters = course.chapters ? course.chapters.length : 0;
            const doneChapters = course.chapters ? course.chapters.filter(ch => ch.isCompleted).length : 0;
            const progress = totalChapters === 0 ? 0 : Math.round((doneChapters / totalChapters) * 100);

            const displayImage = course.imageUrl || 'https://via.placeholder.com/800x600?text=Course+Image';

            return `
            <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4 group">
                <div class="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 relative">
                     <img src="${displayImage}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" alt="${course.title}">
                     <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
                
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-gray-800 truncate mb-1" title="${course.title}">${course.title}</h4>
                    
                    <p class="text-xs text-gray-500 mb-3 flex items-center gap-2">
                        <span class="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-medium">${course.difficulty || 'Beginner'}</span>
                        <span>•</span>
                        <span>${totalChapters} Chapters</span>
                    </p>
                    
                    <div class="flex items-center gap-2">
                        <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div class="h-full bg-primary rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                        </div>
                        <span class="text-[10px] font-bold text-gray-400 w-6 text-right">${progress}%</span>
                    </div>
                </div>

                <button onclick="window.startCourse('${course._id}')" class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary hover:border-primary transition-all self-center shadow-sm">
                    <i class="fa-solid fa-play text-xs pl-0.5"></i>
                </button>
            </div>`;
        }).join('');

    } catch (err) {
        console.error("Profile Load Error:", err);
        list.innerHTML = `<p class="text-red-500 col-span-full text-center">Failed to load profile. Please refresh.</p>`;
    }
}

export function startFromSuggestion(title, chapters) {
    document.getElementById('courseTopic').value = title;
    document.getElementById('numChapters').value = chapters;
    showSection('create');
    generateOutline();
}
