// ==================================
// 🟢 MODULE: COURSE VIEWER & PLAYER
// ==================================

import { showSection } from './ui.js';
import { openQuizModal } from './quiz.js';

export let currentCourseData = null;
export let activeChapterIndex = null;
export let chapterStartTime = 0;

// 🔥 SMART TRACKER VARIABLES 🔥
export let activeTimeSeconds = 0; 
let lastActivityTime = Date.now();
let timeTrackerInterval = null;

// 1. User ki harkaton (activity) ko track karne ka function
function resetIdleTimer() {
    lastActivityTime = Date.now();
}

// Browser pe nazar rakho: Agar user hila, toh timer reset kar do
window.addEventListener('mousemove', resetIdleTimer);
window.addEventListener('scroll', resetIdleTimer);
window.addEventListener('keydown', resetIdleTimer);
window.addEventListener('click', resetIdleTimer);

// ==================================
// 🔥 SMART AI DIFFICULTY CALCULATOR 🔥
// ==================================
export function checkChapterDifficulty(chapterIndex) {
    if (!currentCourseData || !currentCourseData.chapters) return null;

    const chapters = currentCourseData.chapters;
    // Sirf incomplete chapters ko filter karo jisme time spend hua hai
    const activeChapters = chapters.filter(ch => !ch.isCompleted && (ch.timeSpent || 0) > 0);
    
    if (activeChapters.length === 0) return null;

    // Average User Speed nikalo
    const totalTime = activeChapters.reduce((sum, ch) => sum + (ch.timeSpent || 0), 0);
    const avgTime = totalTime / activeChapters.length;

    const currentChapter = chapters[chapterIndex];
    if (currentChapter.isCompleted || (currentChapter.timeSpent || 0) === 0) return null;

    const VISIT_WEIGHT = 0.5;
    const DANGER_THRESHOLD = 3.0; // Apna magic number

    const timeInSec = currentChapter.timeSpent || 0;
    const visits = currentChapter.visitCount || 1;

    // 🔥 THE OP SCORE FORMULA 🔥
    const score = (timeInSec / avgTime) + (visits * VISIT_WEIGHT);

    // Agar chapter hard hai, toh score return karo, warna null
    if (score >= DANGER_THRESHOLD) {
        return score.toFixed(2);
    }
    return null;
}


// 🔥 FIX 1: isTabSwitch parameter add kiya
export function flushTimeTracker(isTabSwitch = false) {
    if (activeChapterIndex === null || !currentCourseData) return;

    const courseId = currentCourseData._id;
    const trackedChapterIndex = activeChapterIndex; 
    const timeToSave = activeTimeSeconds;

    // Reset for next count
    activeTimeSeconds = 0; 
    
    // Agar permanent chapter change ho raha hai toh interval aur index uda do
    // Par agar sirf tab change hua hai, toh isko chalne do taaki aake wapas count ho sake
    if (!isTabSwitch) {
        if (timeTrackerInterval) clearInterval(timeTrackerInterval);
        activeChapterIndex = null;
    }

    if (timeToSave < 5) return;

    console.log(`Sending Real Data: Chap ${trackedChapterIndex}, Time: ${timeToSave}s`);

    fetch('/api/analytics/track-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            courseId: courseId, 
            chapterIndex: trackedChapterIndex, 
            timeSpent: timeToSave
        }),
        keepalive: true 
    }).catch(err => console.log("Time tracking API fail:", err));
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // 🔥 FIX 1 pt B: True pass kiya taaki session kill na ho
        flushTimeTracker(true); 
    } else if (document.visibilityState === 'visible' && !document.getElementById('section-learning').classList.contains('hidden')) {
        chapterStartTime = Date.now();
        lastActivityTime = Date.now(); // User wapas aaya toh usko active maan lo
    }
});

export async function startCourse(id) {
    try {
        // Show skeleton in sidebar immediately
        showSection('learning');
        document.getElementById('learning-course-title').innerHTML = '<div class="skeleton h-5 w-48"></div>';
        const list = document.getElementById('chapter-list');
        list.innerHTML = Array(6).fill('').map((_, i) => `
            <li class="skeleton-card flex items-center gap-3 p-3 rounded-lg" style="animation-delay: ${i * 0.08}s">
                <div class="skeleton w-4 h-4 skeleton-circle flex-shrink-0"></div>
                <div class="skeleton h-3 flex-1"></div>
            </li>
        `).join('');
        
        // Show skeleton in lesson area
        document.getElementById('lesson-title').innerHTML = '<div class="skeleton h-7 w-2/3 mb-4"></div>';
        document.getElementById('lesson-body').innerHTML = `
            <div class="space-y-8">
                ${Array(3).fill('').map((_, i) => `
                    <div class="skeleton-card" style="animation-delay: ${i * 0.15}s">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="skeleton w-8 h-8 skeleton-circle"></div>
                            <div class="skeleton h-5 w-1/2"></div>
                        </div>
                        <div class="space-y-2 mb-4">
                            <div class="skeleton h-3 w-full"></div>
                            <div class="skeleton h-3 w-full"></div>
                            <div class="skeleton h-3 w-5/6"></div>
                            <div class="skeleton h-3 w-4/5"></div>
                            <div class="skeleton h-3 w-3/4"></div>
                        </div>
                        <div class="skeleton h-32 w-full skeleton-rounded"></div>
                    </div>
                `).join('')}
            </div>
        `;

        const res = await fetch(`/api/courses/${id}`);
        if (!res.ok) throw new Error("Load failed");
        const course = await res.json();
        currentCourseData = course;

        document.getElementById('learning-course-title').innerText = course.title;
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
    
    // Sirf tabhi flush karo agar NAYA chapter khol raha hai
    if (activeChapterIndex !== null && activeChapterIndex !== index) {
        flushTimeTracker();
    }
    
    const chapter = currentCourseData.chapters[index];
    const lessonTitle = document.getElementById('lesson-title');
    const lessonBody = document.getElementById('lesson-body');

    const isDone = chapter.isCompleted;
    const quizPassed = chapter.quizPassed || false;
    const quizBestScore = chapter.quizBestScore || 0;
    const quizAttempts = (chapter.quizAttempts || []).length;

    // Smart button state based on quiz progress
    let btnClasses, btnIcon;
    if (isDone && quizPassed) {
        btnClasses = "bg-green-100 text-green-700 border-green-200 hover:bg-green-200";
        btnIcon = `<i class="fa-solid fa-circle-check mr-2"></i> Completed (${quizBestScore}%)`;
    } else if (!isDone && quizAttempts > 0) {
        btnClasses = "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200";
        btnIcon = `<i class="fa-solid fa-rotate-right mr-2"></i> Retry Quiz (Best: ${quizBestScore}%)`;
    } else if (isDone && !quizPassed) {
        // Legacy completed without quiz — show as completed with option to unmark
        btnClasses = "bg-green-100 text-green-700 border-green-200 hover:bg-green-200";
        btnIcon = '<i class="fa-solid fa-circle-check mr-2"></i> Completed';
    } else {
        btnClasses = "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200";
        btnIcon = '<i class="fa-solid fa-brain mr-2"></i> Take Quiz to Complete';
    }

    lessonTitle.innerHTML = `
        <div class="flex justify-between items-start w-full pb-4 border-b border-gray-100 mb-6">
            <h1 class="text-2xl font-bold text-gray-900 flex-1">${chapter.chapter_title}</h1>
            <button onclick="window.toggleChapterStatus('${index}')" class="flex-shrink-0 ml-4 px-4 py-2 rounded-lg border text-sm font-semibold transition-all flex items-center cursor-pointer ${btnClasses}">${btnIcon}</button>
        </div>`;

    lessonBody.innerHTML = '';

    const difficultyScore = checkChapterDifficulty(index);
    if (difficultyScore) {
        lessonBody.innerHTML += `
            <div class="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-xl flex gap-4 items-start shadow-sm animate-pulse-once">
                <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <i class="fa-solid fa-robot text-orange-500 text-lg"></i>
                </div>
                <div>
                    <h4 class="text-orange-800 font-bold text-sm mb-1 uppercase tracking-wider">Vibe Check 🚨 (Score: ${difficultyScore})</h4>
                    <p class="text-orange-700 text-sm leading-relaxed">
                        Looks like you're spending a lot of time and visits on this chapter! This is a tricky topic. 
                        Don't stress, take it slow. You can use the <strong><i class="fa-solid fa-arrows-rotate mx-1"></i>Regenerate</strong> button next to any subtopic to get an <strong>Easy Explanation</strong>!
                    </p>
                </div>
            </div>
        `;
    }

    if (chapter.subtopics && chapter.subtopics.length > 0) {
        chapter.subtopics.forEach((sub, i) => {
            
            // 🔥 NAYA LOGIC: Database se aaye purane specific topics ka HTML banao
            let savedTopicsHtml = '';
            if (sub.specific_topics && sub.specific_topics.length > 0) {
                savedTopicsHtml = sub.specific_topics.map(st => `
                    <div class="mt-6 p-5 bg-violet-50 rounded-xl border border-violet-100 shadow-sm">
                        <h4 class="font-bold text-violet-800 mb-3 flex items-center gap-2">
                            <i class="fa-solid fa-bolt text-amber-400"></i> ${st.topic_name}
                        </h4>
                        <div class="text-gray-700 leading-relaxed">
                            ${st.content}
                        </div>
                    </div>
                `).join('');
            }

            let html = `
    <div class="mb-12 last:mb-0 border-b border-gray-100 pb-8 last:border-0">
        <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center flex-wrap gap-3 relative">
            <span class="w-8 h-8 rounded-full bg-violet-100 text-primary flex items-center justify-center text-sm font-bold">${i + 1}</span>
            <span class="flex-1">${sub.title}</span>
            
            <div class="relative">
                <button onclick="document.getElementById('regen-menu-${index}-${i}').classList.toggle('hidden')" class="text-gray-400 hover:text-violet-600 transition-colors p-1.5 rounded-md hover:bg-violet-50 flex items-center gap-1.5 text-sm font-medium" title="Regenerate Explanation">
                    <i class="fa-solid fa-arrows-rotate"></i>
                </button>
                
                <div id="regen-menu-${index}-${i}" class="hidden absolute top-full right-0 mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-100 z-50 p-1 origin-top-right">
                    <button onclick="window.regenerateExplanation(${index}, ${i}, 'easy'); document.getElementById('regen-menu-${index}-${i}').classList.add('hidden')" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 rounded-md transition-colors flex items-center gap-2 cursor-pointer">
                        <i class="fa-solid fa-feather text-emerald-500"></i> Easy Explain
                    </button>
                    <button onclick="window.regenerateExplanation(${index}, ${i}, 'detailed'); document.getElementById('regen-menu-${index}-${i}').classList.add('hidden')" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 rounded-md transition-colors flex items-center gap-2 cursor-pointer">
                        <i class="fa-solid fa-microscope text-blue-500"></i> Detailed Explain
                    </button>
                </div>
            </div>
        </h3>
        
        <div id="core-explanation-${index}-${i}" class="prose prose-violet max-w-none text-gray-600 mb-4 leading-relaxed transition-opacity duration-300">
            ${sub.explanation}
        </div>
        
        <div id="extra-content-${index}-${i}" class="flex flex-col gap-4 mb-4">
            ${savedTopicsHtml}
        </div>
        <div class="mb-4 flex flex-wrap justify-start gap-3">
            <button onclick="window.generateMoreContent(${index}, ${i})" id="load-more-btn-${index}-${i}" class="text-sm px-4 py-2 bg-violet-50 text-violet-600 font-semibold rounded-lg border border-violet-200 hover:bg-violet-100 hover:text-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Load More Content
            </button>
            
            <button onclick="document.getElementById('custom-topic-container-${index}-${i}').classList.toggle('hidden')" class="text-sm px-4 py-2 bg-white text-gray-600 font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-800 transition-all flex items-center gap-2 cursor-pointer shadow-sm">
                <i class="fa-solid fa-pen"></i> Add Specific Topic
            </button>
        </div>

        <div id="custom-topic-container-${index}-${i}" class="hidden flex gap-2 w-full max-w-md mb-6 transition-all duration-300">
            <input type="text" id="custom-topic-input-${index}-${i}" placeholder="Enter a specific topic..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm">
            
            <button onclick="window.generateSpecificTopic(${index}, ${i})" class="px-4 py-2 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-all text-sm shadow-sm cursor-pointer">
                Generate
            </button>
        </div>`; // Notice: main div abhi close nahi kiya kyunki neeche code/videos append honge

            if (sub.code && sub.code !== 'null' && sub.code.trim() !== '') {
                html += `
                <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-lg mb-6 code-block group relative border border-gray-700 mt-4">
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
                    <div class="bg-gray-50 rounded-xl p-5 border border-gray-100 mt-4">
                        <h4 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <i class="fa-brands fa-youtube text-red-500 text-lg"></i> Recommended Tutorials
                        </h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;

                sub.videos.forEach(v => {
                    // Format view count nicely
                    const viewCount = v.views || 0;
                    let viewsFormatted;
                    if (viewCount >= 1000000) viewsFormatted = (viewCount / 1000000).toFixed(1) + 'M';
                    else if (viewCount >= 1000) viewsFormatted = (viewCount / 1000).toFixed(1) + 'K';
                    else viewsFormatted = viewCount.toString();

                    const channelName = v.channel || 'Unknown';
                    const fallbackThumb = 'https://placehold.co/480x360/1e1e1e/666?text=No+Preview';

                    html += `
                        <div class="group bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-primary transition-all shadow-sm hover:shadow-md">
                            <div onclick="window.openVideoModal('${v.url}')" class="cursor-pointer relative aspect-video overflow-hidden">
                                <img src="${v.thumbnail || fallbackThumb}" 
                                     onerror="this.src='${fallbackThumb}'" 
                                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                     loading="lazy" alt="${v.title}">
                                
                                <div class="absolute inset-0 bg-black/20 group-hover:bg-black/10 flex items-center justify-center transition-all">
                                    <div class="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                        <i class="fa-solid fa-play ml-1 text-sm"></i>
                                    </div>
                                </div>

                                <div class="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded font-medium backdrop-blur-sm">${v.duration}</div>
                            </div>
                            <div class="p-3">
                                <p onclick="window.openVideoModal('${v.url}')" class="cursor-pointer text-sm font-semibold text-gray-800 line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">${v.title}</p>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2 text-xs text-gray-400 min-w-0">
                                        <span class="truncate max-w-[120px]" title="${channelName}">${channelName}</span>
                                        <span class="text-gray-300">•</span>
                                        <span class="whitespace-nowrap">${viewsFormatted} views</span>
                                    </div>
                                    <a href="${v.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()" 
                                       class="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2" 
                                       title="Open on YouTube">
                                        <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                                    </a>
                                </div>
                            </div>
                        </div>`;
                });
                html += `</div></div>`;
            }

            html += `</div>`; // 🔥 Ab main subtopic div close ho raha hai
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

    activeChapterIndex = index;
    activeTimeSeconds = 0;
    lastActivityTime = Date.now();
    if (timeTrackerInterval) {
        clearInterval(timeTrackerInterval);
    }

    // Har 1 second me check karo
    timeTrackerInterval = setInterval(() => {
        const now = Date.now();
        // Agar user pichle 2 minutes (120,000 ms) se active hai AUR tab open hai
        if (now - lastActivityTime < 120000 && document.visibilityState === 'visible') {
            activeTimeSeconds++; 
        }
    }, 1000);
}

window.generateMoreContent = async function (chapterIndex, subtopicIndex) {
    const chapter = currentCourseData.chapters[chapterIndex];
    const subtopic = chapter.subtopics[subtopicIndex];

    const explanationDiv = document.getElementById(`explanation-${chapterIndex}-${subtopicIndex}`);
    const btn = document.getElementById(`load-more-btn-${chapterIndex}-${subtopicIndex}`);

    // UI loading state taaki user ko lage kuch badhiya ho raha hai
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...`;
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-wait');

    try {
        // FETCH CALL TO YOUR BACKEND API (Endpoint apne hisaab se daal liyo)
        const response = await fetch('/api/generate-more-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Pura current subtopic bhej de context ke liye
            body: JSON.stringify({
                title: subtopic.title,
                current_explanation: subtopic.explanation
            })
        });

        if (!response.ok) throw new Error('Backend ne ghost kar diya 💀');

        const data = await response.json();
        const newAIContent = data.new_content; // Jo naya text API return karegi

        // Purane state mein naya content chipka do
        subtopic.explanation += `<hr><br><br>${newAIContent}`;

        // DOM me smooth append
        const newDiv = document.createElement('div');
        newDiv.className = 'mt-4 pt-4 border-t border-dashed border-gray-200 opacity-0 transition-opacity duration-700';
        newDiv.innerHTML = newAIContent;
        explanationDiv.appendChild(newDiv);

        // Smooth fade-in vibe ke liye
        setTimeout(() => newDiv.classList.remove('opacity-0'), 100);

    } catch (error) {
        console.error("L lag gaye bro:", error);
        alert("Oops! Generation fail ho gaya. Ek baar aur dabao!");
    } finally {
        // Button wapas normal kar de
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-wait');
    }
};

window.generateSpecificTopic = async function (chapterIndex, subtopicIndex) {
    const chapter = currentCourseData.chapters[chapterIndex];
    const subtopic = chapter.subtopics[subtopicIndex];

    // Input field aur NAYA extra-content div grab karo
    const inputElement = document.getElementById(`custom-topic-input-${chapterIndex}-${subtopicIndex}`);
    // 🔥 CHANGE: Ab extra-content ko target kar rahe hain
    const extraContentDiv = document.getElementById(`extra-content-${chapterIndex}-${subtopicIndex}`);
    
    // User ne jo text dala hai usko nikal lo
    const customTopic = inputElement.value.trim();

    // Vibe check: Agar input khali hai toh
    if (!customTopic) {
        alert("Bhai pehle koi topic toh daal! 🙄");
        inputElement.focus();
        return;
    }

    const btn = inputElement.nextElementSibling;

    // UI loading state (Cookin' mode 👨‍🍳)
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Cookin...`;
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-wait');

    try {
        const response = await fetch('/api/generate-specific-topic', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // 🔥 CHANGE: Ab DB save karne ke liye extra IDs bhej rahe hain
            body: JSON.stringify({
                courseId: currentCourseData._id, // Tumhare main course ka object ID
                chapterIndex: chapterIndex,      // Array ka index
                subtopicIndex: subtopicIndex,    // Subtopic array ka index
                main_topic_title: subtopic.title,
                current_explanation: subtopic.explanation,
                custom_topic: customTopic 
            })
        });

        if (!response.ok) throw new Error('Backend ne ghost kar diya 💀');

        const data = await response.json();
        const newAIContent = data.new_content; 

        // DOM me smooth append
        const newDiv = document.createElement('div');
        newDiv.className = 'mt-6 p-5 bg-violet-50 rounded-xl border border-violet-100 shadow-sm opacity-0 transition-opacity duration-700';
        
        newDiv.innerHTML = `
            <h4 class="font-bold text-violet-800 mb-3 flex items-center gap-2">
                <i class="fa-solid fa-bolt text-amber-400"></i> ${customTopic}
            </h4>
            <div class="text-gray-700 leading-relaxed">
                ${newAIContent}
            </div>
        `;
        
        // 🔥 CHANGE: Ab extraContentDiv me append ho raha hai
        extraContentDiv.appendChild(newDiv);

        // Smooth fade-in vibe
        setTimeout(() => newDiv.classList.remove('opacity-0'), 100);

        // Naya content aane ke baad input box clean kar do
        inputElement.value = '';

        // Optional: Local state me bhi push kar do taaki bina refresh kiye wapas toggle karne pe dikhe
        if (!subtopic.specific_topics) subtopic.specific_topics = [];
        subtopic.specific_topics.push({
            topic_name: customTopic,
            content: newAIContent
        });

    } catch (error) {
        console.error("L lag gaye bro:", error);
        alert("Oops! Generation fail ho gaya. Ek baar aur try maar!");
    } finally {
        // Button wapas normal kar de
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-wait');
    }
};

window.regenerateExplanation = async function (chapterIndex, subtopicIndex, type) {
    const chapter = currentCourseData.chapters[chapterIndex];
    const subtopic = chapter.subtopics[subtopicIndex];

    // Sirf core explanation wala div pakdo, specific topics wale div ko touch nahi karna
    const coreExplanationDiv = document.getElementById(`core-explanation-${chapterIndex}-${subtopicIndex}`);
    
    // UI Loading state (Skeletal fade vibe)
    const originalContent = coreExplanationDiv.innerHTML;
    coreExplanationDiv.innerHTML = `
        <div class="flex flex-col items-center justify-center py-6 text-violet-500 animate-pulse">
            <i class="fa-solid fa-wand-magic-sparkles text-2xl mb-2"></i>
            <p class="font-medium text-sm">Regenerating ${type} explanation...</p>
        </div>
    `;
    coreExplanationDiv.classList.add('opacity-70');

    try {
        const response = await fetch('/api/regenerate-explanation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                courseId: currentCourseData._id,
                chapterIndex: chapterIndex,
                subtopicIndex: subtopicIndex,
                title: subtopic.title,
                current_explanation: subtopic.explanation,
                type: type // 'easy' ya 'detailed'
            })
        });

        if (!response.ok) throw new Error('Backend ne ghost kar diya 💀');

        const data = await response.json();
        const newAIContent = data.new_content;

        // Smooth fade-in naya content
        coreExplanationDiv.classList.remove('opacity-70');
        coreExplanationDiv.innerHTML = newAIContent;

        // Local state update kar do taaki aage load more ya kuch aur kare toh naya context jaye
        subtopic.explanation = newAIContent;

    } catch (error) {
        console.error("Regeneration Error:", error);
        alert("Oops! Regenerate fail ho gaya. Wapas try maar.");
        // Agar fail hua toh purana content wapas la do
        coreExplanationDiv.classList.remove('opacity-70');
        coreExplanationDiv.innerHTML = originalContent;
    }
};

export async function toggleChapterStatus(index) {
    if (!currentCourseData) return;
    
    const chapter = currentCourseData.chapters[index];
    const isCurrentlyCompleted = chapter.isCompleted;

    if (!isCurrentlyCompleted) {
        // 🧠 QUIZ GATE: If chapter is NOT complete, open quiz modal instead of direct toggle
        openQuizModal(parseInt(index));
        return;
    }

    // If already completed, allow direct unmark (toggle to incomplete)
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


window.loadChapter = loadChapter;
window.toggleChapterStatus = toggleChapterStatus;
window.startCourse = startCourse;
window.openVideoModal = openVideoModal;
window.closeVideoModal = closeVideoModal;

// ==================================
// 📄 PDF DOWNLOAD FUNCTIONS
// ==================================

export function togglePdfMenu() {
    const menu = document.getElementById('pdfMenu');
    menu.classList.toggle('hidden');
}

// Close PDF menu when clicking outside
document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('pdfDownloadWrapper');
    const menu = document.getElementById('pdfMenu');
    if (wrapper && menu && !wrapper.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

export async function downloadChapterPdf() {
    if (!currentCourseData || activeChapterIndex === null) {
        alert('Pehle koi chapter open kar bhai! 📖');
        return;
    }

    const courseId = currentCourseData._id;
    const chapterIdx = activeChapterIndex;
    const chapterTitle = currentCourseData.chapters[chapterIdx].chapter_title;

    // Close menu
    document.getElementById('pdfMenu').classList.add('hidden');

    // Show loading state on button
    const btn = document.getElementById('pdfDownloadBtn');
    const originalBtnHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span class="hidden sm:inline">Generating...</span>`;
    btn.disabled = true;
    btn.classList.add('opacity-70');

    try {
        const response = await fetch(`/api/courses/${courseId}/download/chapter/${chapterIdx}`);
        
        if (!response.ok) throw new Error('PDF generation failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentCourseData.title} - ${chapterTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Chapter PDF Download Error:', error);
        alert('PDF download fail ho gaya! Ek baar aur try kar. 💀');
    } finally {
        btn.innerHTML = originalBtnHtml;
        btn.disabled = false;
        btn.classList.remove('opacity-70');
    }
}

export async function downloadFullCoursePdf() {
    if (!currentCourseData) {
        alert('Pehle course load kar bhai! 📚');
        return;
    }

    const courseId = currentCourseData._id;

    // Close menu
    document.getElementById('pdfMenu').classList.add('hidden');

    // Show loading state
    const btn = document.getElementById('pdfDownloadBtn');
    const originalBtnHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span class="hidden sm:inline">Generating Full PDF...</span>`;
    btn.disabled = true;
    btn.classList.add('opacity-70');

    try {
        const response = await fetch(`/api/courses/${courseId}/download/full`);
        
        if (!response.ok) throw new Error('PDF generation failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentCourseData.title} - Complete Course.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Full Course PDF Download Error:', error);
        alert('PDF download fail ho gaya! Ek baar aur try kar. 💀');
    } finally {
        btn.innerHTML = originalBtnHtml;
        btn.disabled = false;
        btn.classList.remove('opacity-70');
    }
}

window.togglePdfMenu = togglePdfMenu;
window.downloadChapterPdf = downloadChapterPdf;
window.downloadFullCoursePdf = downloadFullCoursePdf;