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

// export function loadChapter(index) {
//     if (!currentCourseData) return;
//     const chapter = currentCourseData.chapters[index];
//     const lessonTitle = document.getElementById('lesson-title');
//     const lessonBody = document.getElementById('lesson-body');

//     const isDone = chapter.isCompleted;
//     const btnClasses = isDone ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200" : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200";
//     const btnIcon = isDone ? '<i class="fa-solid fa-circle-check mr-2"></i> Completed' : '<i class="fa-regular fa-circle-check mr-2"></i> Mark as Done';

//     lessonTitle.innerHTML = `
//         <div class="flex justify-between items-start w-full pb-4 border-b border-gray-100 mb-6">
//             <h1 class="text-2xl font-bold text-gray-900 flex-1">${chapter.chapter_title}</h1>
//             <button onclick="window.toggleChapterStatus('${index}')" class="flex-shrink-0 ml-4 px-4 py-2 rounded-lg border text-sm font-semibold transition-all flex items-center cursor-pointer ${btnClasses}">${btnIcon}</button>
//         </div>`;

//     lessonBody.innerHTML = '';

//     if (chapter.subtopics && chapter.subtopics.length > 0) {
//         chapter.subtopics.forEach((sub, i) => {
//             // Main flex: Explanation div ko ID di aur niche button add kiya
//            let html = `
//     <div class="mb-12 last:mb-0 border-b border-gray-100 pb-8 last:border-0">
//         <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center flex-wrap gap-3 relative">
//             <span class="w-8 h-8 rounded-full bg-violet-100 text-primary flex items-center justify-center text-sm font-bold">${i + 1}</span>
//             <span class="flex-1">${sub.title}</span>
            
//             <div class="relative">
//     <button onclick="document.getElementById('regen-menu-${index}-${i}').classList.toggle('hidden')" class="text-gray-400 hover:text-violet-600 transition-colors p-1.5 rounded-md hover:bg-violet-50 flex items-center gap-1.5 text-sm font-medium" title="Regenerate Explanation">
//         <i class="fa-solid fa-arrows-rotate"></i>
//     </button>
    
//     <div id="regen-menu-${index}-${i}" class="hidden absolute top-full right-0 mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-100 z-50 p-1 origin-top-right">
//         <button onclick="window.regenerateExplanation(${index}, ${i}, 'easy'); document.getElementById('regen-menu-${index}-${i}').classList.add('hidden')" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 rounded-md transition-colors flex items-center gap-2 cursor-pointer">
//             <i class="fa-solid fa-feather text-emerald-500"></i> Easy Explain
//         </button>
//         <button onclick="window.regenerateExplanation(${index}, ${i}, 'detailed'); document.getElementById('regen-menu-${index}-${i}').classList.add('hidden')" class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 rounded-md transition-colors flex items-center gap-2 cursor-pointer">
//             <i class="fa-solid fa-microscope text-blue-500"></i> Detailed Explain
//         </button>
//     </div>
// </div>
//         </h3>
        
//         <div id="explanation-${index}-${i}" class="prose prose-violet max-w-none text-gray-600 mb-4 leading-relaxed transition-opacity duration-300">
//             ${sub.explanation}
//         </div>
        
//         <div class="mb-4 flex flex-wrap justify-start gap-3">
//             <button onclick="window.generateMoreContent(${index}, ${i})" id="load-more-btn-${index}-${i}" class="text-sm px-4 py-2 bg-violet-50 text-violet-600 font-semibold rounded-lg border border-violet-200 hover:bg-violet-100 hover:text-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm">
//                 <i class="fa-solid fa-wand-magic-sparkles"></i> Load More Content
//             </button>
            
//             <button onclick="document.getElementById('custom-topic-container-${index}-${i}').classList.toggle('hidden')" class="text-sm px-4 py-2 bg-white text-gray-600 font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-800 transition-all flex items-center gap-2 cursor-pointer shadow-sm">
//                 <i class="fa-solid fa-pen"></i> Add Specific Topic
//             </button>
//         </div>

//         <div id="custom-topic-container-${index}-${i}" class="hidden flex gap-2 w-full max-w-md mb-6 transition-all duration-300">
//             <input type="text" id="custom-topic-input-${index}-${i}" placeholder="Enter a specific topic..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent text-sm">
            
//             <button onclick="window.generateSpecificTopic(${index}, ${i})" class="px-4 py-2 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-all text-sm shadow-sm cursor-pointer">
//                 Generate
//             </button>
//         </div>
//     </div>`;
//             if (sub.code && sub.code !== 'null' && sub.code.trim() !== '') {
//                 html += `
//                 <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-lg mb-6 code-block group relative border border-gray-700">
//                     <div class="flex justify-between items-center px-4 py-2 bg-[#2d2d2d] text-xs text-gray-400 border-b border-gray-700">
//                         <span class="font-mono">Code Example</span>
//                         <button onclick="window.copyCode(this)" class="hover:text-white transition-colors flex items-center gap-1 bg-white/10 px-2 py-1 rounded hover:bg-white/20">
//                             <i class="fa-regular fa-copy"></i> Copy
//                         </button>
//                     </div>
//                     <div class="p-4 overflow-x-auto custom-scrollbar">
//                         <pre><code class="text-sm font-mono text-gray-300 leading-relaxed">${sub.code.replace(/</g, "&lt;")}</code></pre>
//                     </div>
//                 </div>`;
//             }

//             if (sub.videos && sub.videos.length > 0) {
//                 html += `
//                     <div class="bg-gray-50 rounded-xl p-5 border border-gray-100">
//                         <h4 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
//                             <i class="fa-brands fa-youtube text-red-500 text-lg"></i> Recommended Tutorials
//                         </h4>
//                         <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;

//                 sub.videos.forEach(v => {
//                     html += `
//                         <div onclick="window.openVideoModal('${v.url}')" class="group cursor-pointer bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-all shadow-sm hover:shadow-md">
//                             <div class="relative aspect-video overflow-hidden">
//                                 <img src="${v.thumbnail}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                                
//                                 <div class="absolute inset-0 bg-black/20 group-hover:bg-black/10 flex items-center justify-center transition-all">
//                                     <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
//                                         <i class="fa-solid fa-play ml-1 text-sm"></i>
//                                     </div>
//                                 </div>

//                                 <div class="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-medium">${v.duration}</div>
//                             </div>
//                             <div class="p-3">
//                                 <p class="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:text-primary transition-colors leading-snug">${v.title}</p>
//                             </div>
//                         </div>`;
//                 });
//                 html += `</div></div>`;
//             }

//             html += `</div>`;
//             lessonBody.innerHTML += html;
//         });
//     } else {
//         lessonBody.innerHTML = `<div class="flex flex-col items-center justify-center h-64 text-gray-400"><i class="fa-regular fa-file text-4xl mb-3"></i><p>No content available.</p></div>`;
//     }

//     window.updateSidebarProgress();
//     document.querySelectorAll('#chapter-list li').forEach(li => {
//         li.classList.remove('bg-violet-50', 'text-primary');
//         li.classList.add('text-gray-600');
//     });
//     const activeBtn = document.getElementById(`chapter-btn-${index}`);
//     if (activeBtn) {
//         activeBtn.classList.remove('text-gray-600');
//         activeBtn.classList.add('bg-violet-50', 'text-primary');
//     }
// }

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
