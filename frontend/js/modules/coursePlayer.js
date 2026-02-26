// ==================================
// 🟢 MODULE: COURSE VIEWER & PLAYER
// ==================================

import { showSection } from './ui.js';

export let currentCourseData = null;

export async function startCourse(id) {
    try {
        const res = await fetch(`/api/courses/${id}`);
        if (!res.ok) throw new Error("Load failed");
        const course = await res.json();
        currentCourseData = course;

        document.getElementById('learning-course-title').innerText = course.title;
        const list = document.getElementById('chapter-list');
        list.innerHTML = '';

        course.chapters.forEach((ch, idx) => {
            const li = document.createElement('li');
            li.className = 'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-violet-50 text-gray-600 hover:text-primary';
            li.id = `chapter-btn-${idx}`;
            li.onclick = () => window.loadChapter(idx);

            const iconClass = ch.isCompleted ? "fa-solid fa-circle-check text-green-500" : "fa-regular fa-circle-play group-hover:scale-110 transition-transform";
            li.innerHTML = `<i class="${iconClass} text-sm"></i><span class="text-sm font-medium line-clamp-1">${ch.chapter_title}</span>`;
            list.appendChild(li);
        });

        showSection('learning');
        if (course.chapters.length > 0) window.loadChapter(0);
    } catch (e) { console.log("Could not load course."); }
}

export function getYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

export function openVideoModal(videoUrl) {
    const videoId = getYouTubeID(videoUrl);
    if (!videoId) return alert("Invalid Video URL");

    const modal = document.getElementById('videoModal');
    const modalContainer = document.getElementById('videoModalContainer');
    const iframe = document.getElementById('youtubeIframe');

    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3`;

    modal.classList.remove('hidden');

    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modalContainer.classList.remove('scale-[0.95]');
        modalContainer.classList.add('scale-100');
    });
}

export function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const modalContainer = document.getElementById('videoModalContainer');
    const iframe = document.getElementById('youtubeIframe');

    modal.classList.add('opacity-0', 'pointer-events-none');
    modalContainer.classList.remove('scale-100');
    modalContainer.classList.add('scale-[0.95]');

    setTimeout(() => {
        modal.classList.add('hidden');
        iframe.src = '';
    }, 300);
}

export function loadChapter(index) {
    if (!currentCourseData) return;
    const chapter = currentCourseData.chapters[index];
    const lessonTitle = document.getElementById('lesson-title');
    const lessonBody = document.getElementById('lesson-body');

    const isDone = chapter.isCompleted;
    const btnClasses = isDone ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200" : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200";
    const btnIcon = isDone ? '<i class="fa-solid fa-circle-check mr-2"></i> Completed' : '<i class="fa-regular fa-circle-check mr-2"></i> Mark as Done';

    lessonTitle.innerHTML = `
        <div class="flex justify-between items-start w-full pb-4 border-b border-gray-100 mb-6">
            <h1 class="text-2xl font-bold text-gray-900 flex-1">${chapter.chapter_title}</h1>
            <button onclick="window.toggleChapterStatus('${index}')" class="flex-shrink-0 ml-4 px-4 py-2 rounded-lg border text-sm font-semibold transition-all flex items-center cursor-pointer ${btnClasses}">${btnIcon}</button>
        </div>`;

    lessonBody.innerHTML = '';

    if (chapter.subtopics && chapter.subtopics.length > 0) {
        chapter.subtopics.forEach((sub, i) => {
            let html = `
                <div class="mb-12 last:mb-0 border-b border-gray-100 pb-8 last:border-0">
                    <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                        <span class="w-8 h-8 rounded-full bg-violet-100 text-primary flex items-center justify-center text-sm font-bold">${i + 1}</span>
                        ${sub.title}
                    </h3>
                    <div class="prose prose-violet max-w-none text-gray-600 mb-6 leading-relaxed">${sub.explanation}</div>`;

            if (sub.code && sub.code !== 'null' && sub.code.trim() !== '') {
                html += `
                <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-lg mb-6 code-block group relative border border-gray-700">
                    <div class="flex justify-between items-center px-4 py-2 bg-[#2d2d2d] text-xs text-gray-400 border-b border-gray-700">
                        <span class="font-mono">Code Example</span>
                        <button onclick="window.copyCode(this)" class="hover:text-white transition-colors flex items-center gap-1 bg-white/10 px-2 py-1 rounded hover:bg-white/20">
                            <i class="fa-regular fa-copy"></i> Copy
                        </button>
                    </div>
                    <div class="p-4 overflow-x-auto custom-scrollbar">
                        <pre><code class="text-sm font-mono text-gray-300 leading-relaxed">${sub.code.replace(/</g, "&lt;")}</code></pre>
                    </div>
                </div>`;
            }

            if (sub.videos && sub.videos.length > 0) {
                html += `
                    <div class="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <h4 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <i class="fa-brands fa-youtube text-red-500 text-lg"></i> Recommended Tutorials
                        </h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;

                sub.videos.forEach(v => {
                    html += `
                        <div onclick="window.openVideoModal('${v.url}')" class="group cursor-pointer bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-all shadow-sm hover:shadow-md">
                            <div class="relative aspect-video overflow-hidden">
                                <img src="${v.thumbnail}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                                
                                <div class="absolute inset-0 bg-black/20 group-hover:bg-black/10 flex items-center justify-center transition-all">
                                    <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                        <i class="fa-solid fa-play ml-1 text-sm"></i>
                                    </div>
                                </div>

                                <div class="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-medium">${v.duration}</div>
                            </div>
                            <div class="p-3">
                                <p class="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:text-primary transition-colors leading-snug">${v.title}</p>
                            </div>
                        </div>`;
                });
                html += `</div></div>`;
            }

            html += `</div>`;
            lessonBody.innerHTML += html;
        });
    } else {
        lessonBody.innerHTML = `<div class="flex flex-col items-center justify-center h-64 text-gray-400"><i class="fa-regular fa-file text-4xl mb-3"></i><p>No content available.</p></div>`;
    }

    window.updateSidebarProgress();
    document.querySelectorAll('#chapter-list li').forEach(li => {
        li.classList.remove('bg-violet-50', 'text-primary');
        li.classList.add('text-gray-600');
    });
    const activeBtn = document.getElementById(`chapter-btn-${index}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600');
        activeBtn.classList.add('bg-violet-50', 'text-primary');
    }
}

export async function toggleChapterStatus(index) {
    if (!currentCourseData) return;
    const courseId = currentCourseData._id;
    const btn = document.querySelector(`#lesson-title button`);
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...';

    try {
        const res = await fetch(`/api/courses/${courseId}/chapters/${index}/toggle`, { method: 'PUT' });
        if (res.ok) {
            const updatedCourse = await res.json();
            currentCourseData = updatedCourse;
            window.loadChapter(index);
            window.updateSidebarProgress();
        }
    } catch (err) { console.log("Failed to update status"); }
}

export function updateSidebarProgress() {
    if (!currentCourseData) return;
    currentCourseData.chapters.forEach((ch, idx) => {
        const li = document.getElementById(`chapter-btn-${idx}`);
        if (li) {
            const iconContainer = li.querySelector('i');
            if (ch.isCompleted) {
                iconContainer.className = "fa-solid fa-circle-check text-green-500 text-sm";
            } else {
                iconContainer.className = "fa-regular fa-circle-play text-sm group-hover:scale-110 transition-transform";
            }
        }
    });
}
