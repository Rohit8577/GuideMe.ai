// ===================================
// 🟢 MODULE: COMMUNITY & NETWORKING
// ===================================

import { currentUser } from './auth.js';

export async function openCommunityModal() {
    const modal = document.getElementById('communityModal');
    const grid = document.getElementById('communityGrid');
    modal.classList.remove('hidden');
    grid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fa-solid fa-spinner fa-spin text-2xl text-primary"></i></div>';

    try {
        const res = await fetch('/api/community');
        const courses = await res.json();
        grid.innerHTML = courses.map(course => `
            <div class="bg-white p-5 rounded-xl border border-gray-200 hover:border-primary transition-all flex flex-col">
                <div class="flex justify-between items-start mb-3">
                    <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600"><i class="${course.icon}"></i></div>
                    <span class="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase">By ${course.createdBy ? course.createdBy.name : 'Unknown'}</span>
                </div>
                <h4 class="font-bold text-gray-800 mb-1 line-clamp-1">${course.title}</h4>
                <p class="text-xs text-gray-500 mb-4 line-clamp-2">${course.description}</p>
                <button onclick="window.previewCommunityCourse('${course._id}')" class="mt-auto w-full py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-black transition-colors">See Roadmap</button>
            </div>`).join('');
    } catch (err) { grid.innerHTML = '<p class="text-center text-red-500">Failed to load.</p>'; }
}

export function closeCommunityModal() {
    document.getElementById('communityModal').classList.add('hidden');
}

export async function previewCommunityCourse(courseId) {
    const modal = document.getElementById('previewModal');
    const content = document.getElementById('previewContent');
    const title = document.getElementById('previewTitle');
    const reqBtn = document.getElementById('requestBtn');

    modal.classList.remove('hidden');
    content.innerHTML = '<div class="flex flex-col items-center justify-center py-10 text-gray-500"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-primary"></i> Loading roadmap...</div>';

    try {
        const res = await fetch(`/api/courses/${courseId}`);
        const course = await res.json();
        title.innerText = course.title;

        // Content Rendering
        content.innerHTML = `
            <div class="space-y-6">
                <div class="bg-violet-50 p-4 rounded-xl border border-violet-100">
                    <p class="text-sm text-gray-700 italic leading-relaxed">
                        <i class="fa-solid fa-quote-left text-violet-300 mr-2"></i>
                        ${course.description || "No description provided."}
                    </p>
                </div>

                <div class="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    <div class="border-l-2 border-gray-200 ml-3 space-y-8 py-2">
                        ${course.chapters.map((ch, i) => `
                            <div class="relative pl-8 group">
                                <div class="absolute -left-[9px] top-1 w-4 h-4 bg-white rounded-full border-2 border-gray-300 group-hover:border-primary group-hover:bg-primary transition-colors"></div>
                                
                                <h5 class="font-bold text-gray-900 text-lg mb-3 group-hover:text-primary transition-colors">
                                    Chapter ${i + 1}: ${ch.chapter_title}
                                </h5>

                                <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <ul class="space-y-2">
                                        ${ch.subtopics.map(sub => `
                                            <li class="flex items-start gap-3 text-sm text-gray-600">
                                                <i class="fa-solid fa-angle-right mt-1 text-gray-400 text-xs"></i>
                                                <span class="leading-snug">${sub.title}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;

        reqBtn.onclick = () => sendCourseRequest(courseId);

    } catch (err) {
        console.error(err);
        content.innerHTML = '<p class="text-center text-red-500 py-4">Failed to load course details.</p>';
    }
}

export async function sendCourseRequest(courseId) {
    const btn = document.getElementById('requestBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    try {
        await fetch('/api/request-course', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, requesterId: currentUser._id })
        });
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Sent!';
        btn.classList.replace('bg-primary', 'bg-green-600');
        setTimeout(() => {
            document.getElementById('previewModal').classList.add('hidden');
            btn.innerHTML = 'Request Access';
            btn.classList.replace('bg-green-600', 'bg-primary');
        }, 2000);
    } catch (err) { console.log("Failed to send request"); }
}

export async function checkNotifications() {
    try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const notifs = await res.json();
        updateNotificationUI(notifs);
    } catch (err) {
        console.error("Notif check error", err);
    }
}

export function updateNotificationUI(notifs) {
    const dot = document.getElementById('notifDot');
    const count = document.getElementById('notifCount');
    const list = document.getElementById('notifList');

    if (notifs.length > 0) {
        dot.classList.remove('hidden');
        count.innerText = notifs.length;
    } else {
        dot.classList.add('hidden');
        count.innerText = 0;
    }

    if (notifs.length === 0) {
        list.innerHTML = '<div class="p-6 text-center text-gray-400 text-xs">No new notifications 💤</div>';
        return;
    }

    list.innerHTML = notifs.map(n => {
        if (n.type === 'request') {
            return `
            <div class="p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <p class="text-xs text-gray-700 mb-1">
                    <span class="font-bold text-gray-900">${n.sender ? n.sender.name : 'User'}</span> requested access to:
                </p>
                <p class="text-[10px] font-semibold text-primary mb-2 bg-violet-50 inline-block px-2 py-0.5 rounded border border-violet-100">
                    ${n.course ? n.course.title : 'Course'}
                </p>
                <div class="flex gap-2 mt-1">
                    <button onclick="window.handleNotifAction('${n._id}', 'accept')" class="flex-1 bg-green-500 hover:bg-green-600 text-white text-[10px] py-1.5 rounded shadow-sm font-medium">Accept</button>
                    <button onclick="window.handleNotifAction('${n._id}', 'reject')" class="flex-1 bg-white border border-gray-200 hover:bg-red-50 text-red-500 text-[10px] py-1.5 rounded font-medium">Reject</button>
                </div>
            </div>`;
        } else {
            const isSuccess = n.message.includes('Congrats');
            const bgClass = isSuccess ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100';
            const icon = isSuccess ? 'fa-circle-check text-green-500' : 'fa-circle-xmark text-red-500';

            return `
            <div class="p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors relative group">
                <div class="${bgClass} p-2 rounded-lg border flex gap-2 items-start">
                    <i class="fa-solid ${icon} mt-0.5 text-xs"></i>
                    <p class="text-xs text-gray-700 leading-snug font-medium">
                        ${n.message}
                    </p>
                </div>
                <button onclick="window.handleNotifAction('${n._id}', 'dismiss')" class="absolute top-1 right-1 text-gray-300 hover:text-gray-500 px-2" title="Dismiss">
                    <i class="fa-solid fa-xmark text-xs"></i>
                </button>
            </div>`;
        }
    }).join('');
}

export async function handleNotifAction(id, action) {
    const list = document.getElementById('notifList');
    list.innerHTML = `<div class="p-4 text-center text-gray-500 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Processing...</div>`;

    try {
        const res = await fetch(`/api/notifications/${id}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });

        if (res.ok) {
            checkNotifications();
        } else {
            alert("Something went wrong");
            checkNotifications();
        }
    } catch (err) {
        console.error(err);
        checkNotifications();
    }
}
