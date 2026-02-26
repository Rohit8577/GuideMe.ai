// ==============================
// 🟢 MODULE: COURSE GENERATOR
// ==============================

import { showSection } from './ui.js';
import { fetchAndDisplayCourses } from './dashboard.js';

export let tempTopic = "";
export let tempChapters = 5;
export let tempCustomTopics = "";
let topicsArray = [];
let currentOutlineData = null;
let editModeChapters = {};
export async function generateOutline() {
    const topic = document.getElementById('courseTopic').value.trim();
    const chapters = document.getElementById('numChapters').value;
    // const customTopics = document.getElementById('customTopics').value.trim();

    const btn = document.querySelector('.create-submit-btn');

    if (!topic) {
        alert("Bro, please enter a topic first!");
        return console.log("Please enter a topic!");
    }

    // Global variables update kar lo (agar aage use ho rahe hain)
    tempTopic = topic;
    tempChapters = chapters;
    // tempCustomTopics = customTopics;

    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generating Roadmap...';
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-wait');

    console.log(topicsArray)

    try {
        const res = await fetch('/api/create-outline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, chapters, topicsArray })
        });

        if (!res.ok) throw new Error("Failed");

        const data = await res.json();
        renderOutlineUI(data);
        showSection('outline'); // Section switch

    } catch (err) {
        console.error("Failed to create outline:", err);
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-wait');
    }
}

export function renderOutlineUI(data) {
    currentOutlineData = data;
    document.getElementById('outline-title').innerText = data.courseTitle;
    document.getElementById('outline-desc').innerText = data.description;
    document.getElementById('outline-duration').innerText = data.duration || 'Flexible';
    document.getElementById('outline-chapters').innerText = `${data.chapters.length} Chapters`;
    document.getElementById('outline-level').innerText = data.difficulty || 'Beginner';

    const container = document.getElementById('roadmap-container');
    container.innerHTML = '';

    data.chapters.forEach((chapter, index) => {
        const isEditMode = editModeChapters[index];

        const topicsHtml = chapter.topics.map((t, topicIndex) => `
                <div class="relative">
                    <span class="bg-gray-50 border border-gray-200 px-3 py-1 rounded-full text-xs font-medium text-gray-600 pr-6">
                        ${t}
                    </span>
                    ${isEditMode
                ? `
                <button 
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                    onclick="removeOutlineTopic(${index}, ${topicIndex})"
                >×</button>
                `
                : ''
            }
                </div>
            `).join('');

        container.innerHTML += `
            <div class="relative pl-8 md:pl-0 group">
                <div class="md:flex items-center justify-between gap-8">
                    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all w-full relative z-10">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="text-lg font-bold text-gray-800"><span class="text-primary mr-2">#${index + 1}</span> ${chapter.chapter_title}</h4>
                            <span class="text-xs font-bold text-primary bg-violet-50 px-2 py-1 rounded-md">${chapter.topics.length} Topics</span>

                            <div class="flex gap-2">
                                <button 
                                    class="text-xs font-semibold ${editModeChapters[index] ? 'text-green-600' : 'text-blue-600'}"
                                    onclick="toggleEdit(${index})"
                                    >   
                                    ${editModeChapters[index] ? 'Save' : 'Edit'}
                                </button>

                                <button 
                                    class="text-xs text-green-600 font-semibold"
                                    onclick="showAddInput(${index})"
                                >+ Add</button>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">${topicsHtml}</div>
                    </div>
                </div>
            </div>`;
    });
}

export async function confirmAndGenerate() {
    const btn = document.querySelector('.confirm-generate-btn');
    const oldHtml = btn.innerHTML;

    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> AI Writing...';
    btn.disabled = true;
    btn.classList.add('bg-gray-400', 'cursor-not-allowed');
    btn.classList.remove('bg-primary');

    try {
        const res = await fetch('/api/generate-course', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: tempTopic,
                outline: currentOutlineData
            })
        });
        if (!res.ok) throw new Error("Failed");

        btn.innerHTML = '<i class="fa-solid fa-check"></i> Done!';
        btn.classList.remove('bg-gray-400');
        btn.classList.add('bg-green-500');

        setTimeout(() => {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
            btn.classList.remove('bg-green-500', 'cursor-not-allowed');
            btn.classList.add('bg-primary');
            showSection('dashboard');
            fetchAndDisplayCourses();
        }, 1500);
    } catch (err) {
        console.log("Error generating course.");
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        btn.classList.remove('bg-gray-400', 'cursor-not-allowed');
        btn.classList.add('bg-primary');
    }
}

export function addCustomTopic() {
    const inputEl = document.getElementById('topicInput');
    const maxChapters = parseInt(document.getElementById('numChapters').value) || 5;
    const topicValue = inputEl.value.trim();

    // Agar khali enter kiya toh return
    if (!topicValue) return;

    // Edge Case: Limit check
    if (topicsArray.length >= maxChapters) {
        alert(`Maximum limit reached`);
        return;
    }

    // Array me daalo aur input clear karo
    topicsArray.push(topicValue);
    inputEl.value = '';

    // UI update karo
    renderTopics();
}

// Topic Remove karne ka function (Cross pe click karne par)
export function removeCustomTopic(index) {
    topicsArray.splice(index, 1);
    renderTopics();
}

// UI me Badges dikhane ka function
export function renderTopics() {
    const container = document.getElementById('topicsContainer');
    container.innerHTML = ''; // Pehle saaf karo

    topicsArray.forEach((topic, index) => {
        // Ek naya pill/badge create karo
        const badge = document.createElement('div');
        badge.className = "whitespace-nowrap bg-violet-100 text-violet-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border border-violet-200 shadow-sm transition-all animate-fade-in";

        badge.innerHTML = `
      ${topic}
      <button type="button" onclick="removeCustomTopic(${index})" class="text-violet-400 hover:text-red-500 transition-colors focus:outline-none">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

        container.appendChild(badge);
    });

    updateCounter();
}

// Counter UI Update karne ka function
export function updateCounter() {
    const maxChapters = parseInt(document.getElementById('numChapters').value) || 5;
    const counterEl = document.getElementById('topicCounter');
    counterEl.innerText = `${topicsArray.length}/${maxChapters} Added`;

    // Agar full ho gaya toh color red kar do alert ke liye
    if (topicsArray.length >= maxChapters) {
        counterEl.classList.remove('text-primary', 'bg-violet-50');
        counterEl.classList.add('text-red-600', 'bg-red-50');
    } else {
        counterEl.classList.remove('text-red-600', 'bg-red-50');
        counterEl.classList.add('text-primary', 'bg-violet-50');
    }
}
updateCounter();

window.removeOutlineTopic = function (chapterIndex, topicIndex) {
    currentOutlineData.chapters[chapterIndex].topics.splice(topicIndex, 1);
    renderOutlineUI(currentOutlineData);
}

window.showAddInput = function (chapterIndex) {
    const topicName = prompt("Enter new topic name:");
    if (!topicName) return;

    const position = parseInt(prompt("Enter position (starting from 1):"));
    const topics = currentOutlineData.chapters[chapterIndex].topics;

    if (!position || position < 1 || position > topics.length + 1) {
        topics.push(topicName);
    } else {
        topics.splice(position - 1, 0, topicName);
    }

    renderOutlineUI(currentOutlineData);
}

window.toggleEdit = function (chapterIndex) {
    editModeChapters[chapterIndex] = !editModeChapters[chapterIndex];
    renderOutlineUI(currentOutlineData);
}
