// ==================================
// 🧠 MODULE: QUIZ SYSTEM
// ==================================

import { currentCourseData, loadChapter } from './coursePlayer.js';

// Quiz State
let quizQuestions = [];
let quizAnswerKey = [];
let quizUserAnswers = {};  // { questionId: selectedOption }
let currentQuestionIndex = 0;
let quizChapterIndex = null;
let quizCourseId = null;

// ==========================================
// 🎯 OPEN QUIZ MODAL
// ==========================================
export async function openQuizModal(chapterIndex) {
    if (!currentCourseData) return;

    quizChapterIndex = chapterIndex;
    quizCourseId = currentCourseData._id;
    quizQuestions = [];
    quizAnswerKey = [];
    quizUserAnswers = {};
    currentQuestionIndex = 0;

    const chapter = currentCourseData.chapters[chapterIndex];

    // Show modal
    const modal = document.getElementById('quizModal');
    modal.classList.remove('hidden');

    // Reset UI state
    document.getElementById('quizTitle').innerText = `Quiz: ${chapter.chapter_title}`;
    document.getElementById('quizLoading').classList.remove('hidden');
    document.getElementById('quizQuestionContainer').classList.add('hidden');
    document.getElementById('quizResultContainer').classList.add('hidden');
    
    // Footer: show nav buttons, hide result buttons
    document.getElementById('quizPrevBtn').classList.remove('hidden');
    document.getElementById('quizNextBtn').classList.remove('hidden');
    document.getElementById('quizSubmitBtn').classList.add('hidden');
    document.getElementById('quizCloseResultBtn').classList.add('hidden');
    document.getElementById('quizRetryBtn').classList.add('hidden');
    document.getElementById('quizFooter').classList.remove('hidden');

    document.getElementById('quizProgressBar').style.width = '0%';
    document.getElementById('quizProgressText').innerText = '0/0';

    try {
        // Fetch quiz questions from AI
        const response = await fetch('/api/quiz/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                courseId: quizCourseId,
                chapterIndex: chapterIndex
            })
        });

        if (!response.ok) throw new Error('Quiz generation failed');

        const data = await response.json();
        quizQuestions = data.questions;
        quizAnswerKey = data._answerKey;

        // Hide loading, show first question
        document.getElementById('quizLoading').classList.add('hidden');
        document.getElementById('quizQuestionContainer').classList.remove('hidden');

        document.getElementById('quizProgressText').innerText = `1/${quizQuestions.length}`;
        renderQuestion(0);

    } catch (error) {
        console.error('Quiz Generation Error:', error);
        document.getElementById('quizLoading').innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 text-2xl">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <p class="font-bold text-gray-700 text-lg">Quiz Generation Failed</p>
                <p class="text-gray-400 text-sm mt-1">Please try again in a moment</p>
                <button onclick="window.closeQuizModal()" class="mt-4 px-6 py-2 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-900 transition-colors">Close</button>
            </div>
        `;
    }
}

// ==========================================
// 📖 RENDER QUESTION
// ==========================================
function renderQuestion(index) {
    const q = quizQuestions[index];
    if (!q) return;

    currentQuestionIndex = index;

    // Update progress
    const progress = ((index + 1) / quizQuestions.length) * 100;
    document.getElementById('quizProgressBar').style.width = `${progress}%`;
    document.getElementById('quizProgressText').innerText = `${index + 1}/${quizQuestions.length}`;

    // Difficulty badge
    const badge = document.getElementById('quizDifficultyBadge');
    if (q.difficulty === 'easy') {
        badge.className = 'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200';
        badge.innerHTML = '<i class="fa-solid fa-leaf mr-1"></i> Easy';
    } else if (q.difficulty === 'medium') {
        badge.className = 'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200';
        badge.innerHTML = '<i class="fa-solid fa-bolt mr-1"></i> Medium';
    } else {
        badge.className = 'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200';
        badge.innerHTML = '<i class="fa-solid fa-fire mr-1"></i> Hard';
    }

    // Question number
    document.getElementById('quizQuestionNumber').innerText = `Question ${index + 1} of ${quizQuestions.length}`;

    // Question text
    document.getElementById('quizQuestionText').innerText = q.question;

    // Options
    const optionsDiv = document.getElementById('quizOptions');
    optionsDiv.innerHTML = '';

    const optionKeys = ['A', 'B', 'C', 'D'];
    optionKeys.forEach(key => {
        if (!q.options[key]) return;
        
        const isSelected = quizUserAnswers[q.id] === key;
        const div = document.createElement('div');
        div.className = `quiz-option ${isSelected ? 'selected' : ''}`;
        div.onclick = () => selectOption(q.id, key);
        div.innerHTML = `
            <div class="option-letter">${key}</div>
            <div class="option-text">${q.options[key]}</div>
        `;
        optionsDiv.appendChild(div);
    });

    // Button visibility
    const prevBtn = document.getElementById('quizPrevBtn');
    const nextBtn = document.getElementById('quizNextBtn');
    const submitBtn = document.getElementById('quizSubmitBtn');

    prevBtn.disabled = index === 0;
    
    if (index === quizQuestions.length - 1) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
        submitBtn.style.display = 'flex';
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

// ==========================================
// 🖱️ SELECT OPTION
// ==========================================
function selectOption(questionId, optionKey) {
    quizUserAnswers[questionId] = optionKey;
    
    // Re-render to update visual
    document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Find clicked option and mark selected
    const options = document.querySelectorAll('.quiz-option');
    const optionKeys = ['A', 'B', 'C', 'D'];
    options.forEach((opt, idx) => {
        if (optionKeys[idx] === optionKey) {
            opt.classList.add('selected');
        }
    });
}

// ==========================================
// ⬅️ PREVIOUS QUESTION
// ==========================================
export function quizPrevQuestion() {
    if (currentQuestionIndex > 0) {
        renderQuestion(currentQuestionIndex - 1);
    }
}

// ==========================================
// ➡️ NEXT QUESTION
// ==========================================
export function quizNextQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        renderQuestion(currentQuestionIndex + 1);
    }
}

// ==========================================
// 📤 SUBMIT QUIZ
// ==========================================
export async function submitQuiz() {
    // Check if all questions answered
    const answeredCount = Object.keys(quizUserAnswers).length;
    if (answeredCount < quizQuestions.length) {
        const unanswered = quizQuestions.length - answeredCount;
        if (!confirm(`You have ${unanswered} unanswered question(s). Submit anyway? (Unanswered = wrong)`)) {
            return;
        }
    }

    // Disable submit button
    const submitBtn = document.getElementById('quizSubmitBtn');
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Evaluating...';
    submitBtn.disabled = true;

    try {
        // Prepare answers array
        const answers = quizQuestions.map(q => ({
            id: q.id,
            selectedOption: quizUserAnswers[q.id] || null
        }));

        const response = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                courseId: quizCourseId,
                chapterIndex: quizChapterIndex,
                answers: answers,
                answerKey: quizAnswerKey
            })
        });

        if (!response.ok) throw new Error('Quiz submission failed');

        const result = await response.json();

        // Update local course data
        if (result.course) {
            // Update the in-memory course data
            Object.assign(currentCourseData, result.course);
        }

        // Show result
        showQuizResult(result);

    } catch (error) {
        console.error('Quiz Submit Error:', error);
        alert('Quiz submission failed! Try again.');
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Quiz';
        submitBtn.disabled = false;
    }
}

// ==========================================
// 🏆 SHOW QUIZ RESULT
// ==========================================
function showQuizResult(result) {
    // Hide question UI, show result UI
    document.getElementById('quizQuestionContainer').classList.add('hidden');
    document.getElementById('quizResultContainer').classList.remove('hidden');

    // Hide nav buttons, show result buttons
    document.getElementById('quizPrevBtn').classList.add('hidden');
    document.getElementById('quizNextBtn').classList.add('hidden');
    document.getElementById('quizSubmitBtn').classList.add('hidden');
    document.getElementById('quizCloseResultBtn').classList.remove('hidden');
    document.getElementById('quizCloseResultBtn').style.display = 'flex';
    
    if (!result.passed) {
        document.getElementById('quizRetryBtn').classList.remove('hidden');
        document.getElementById('quizRetryBtn').style.display = 'flex';
    } else {
        document.getElementById('quizRetryBtn').classList.add('hidden');
    }

    // Update progress bar to 100%
    document.getElementById('quizProgressBar').style.width = '100%';
    document.getElementById('quizProgressText').innerText = 'Complete!';

    // Update subtitle
    document.getElementById('quizSubtitle').innerText = result.passed 
        ? '🎉 Chapter marked as complete!' 
        : '📚 Score 70% or above to complete this chapter';

    // Score color
    const scoreColor = result.passed ? 'text-emerald-600' : 'text-red-500';
    const scoreBg = result.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';
    const scoreIcon = result.passed ? 'fa-solid fa-trophy text-amber-400' : 'fa-solid fa-xmark text-red-400';
    const passText = result.passed 
        ? '<span class="text-emerald-600 font-bold">PASSED!</span> Chapter has been marked as complete.' 
        : '<span class="text-red-500 font-bold">NOT PASSED</span> — You need 70% to complete this chapter. Study the material and try again!';

    // Build difficulty breakdown from quiz data
    let easyCorrect = 0, easyTotal = 0, mediumCorrect = 0, mediumTotal = 0, hardCorrect = 0, hardTotal = 0;
    result.results.forEach((r, idx) => {
        const q = quizQuestions[idx];
        if (q) {
            if (q.difficulty === 'easy') { easyTotal++; if (r.isCorrect) easyCorrect++; }
            else if (q.difficulty === 'medium') { mediumTotal++; if (r.isCorrect) mediumCorrect++; }
            else { hardTotal++; if (r.isCorrect) hardCorrect++; }
        }
    });

    const resultContainer = document.getElementById('quizResultContainer');
    resultContainer.innerHTML = `
        <div class="text-center mb-8 score-reveal">
            <!-- Score Circle -->
            <div class="relative inline-flex items-center justify-center w-36 h-36 mb-4">
                <svg class="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" stroke="#e5e7eb" stroke-width="8" fill="none"/>
                    <circle cx="60" cy="60" r="50" stroke="${result.passed ? '#22c55e' : '#ef4444'}" stroke-width="8" fill="none"
                        stroke-dasharray="${Math.PI * 100}" 
                        stroke-dashoffset="${Math.PI * 100 * (1 - result.score / 100)}"
                        stroke-linecap="round"
                        class="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div class="absolute flex flex-col items-center">
                    <i class="${scoreIcon} text-2xl mb-1"></i>
                    <span class="${scoreColor} text-3xl font-black">${result.score}%</span>
                </div>
            </div>
            
            <p class="text-gray-600 text-sm">${passText}</p>
            <p class="text-gray-400 text-xs mt-2">
                ${result.correctAnswers}/${result.totalQuestions} correct • Best Score: ${result.bestScore}% • Attempt #${result.attempts}
            </p>
        </div>

        <!-- Difficulty Breakdown -->
        <div class="grid grid-cols-3 gap-3 mb-8">
            <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                <p class="text-xs font-bold text-emerald-600 uppercase mb-1">Easy</p>
                <p class="text-2xl font-black text-emerald-700">${easyCorrect}/${easyTotal}</p>
            </div>
            <div class="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p class="text-xs font-bold text-amber-600 uppercase mb-1">Medium</p>
                <p class="text-2xl font-black text-amber-700">${mediumCorrect}/${mediumTotal}</p>
            </div>
            <div class="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                <p class="text-xs font-bold text-red-600 uppercase mb-1">Hard</p>
                <p class="text-2xl font-black text-red-700">${hardCorrect}/${hardTotal}</p>
            </div>
        </div>

        <!-- Answer Review -->
        <h4 class="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-list-check"></i> Answer Review
        </h4>
        <div class="space-y-4 max-h-60 overflow-y-auto pr-2">
            ${result.results.map((r, idx) => {
                const q = quizQuestions[idx];
                const diffBadge = q ? 
                    (q.difficulty === 'easy' ? '<span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">EASY</span>' :
                     q.difficulty === 'medium' ? '<span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">MED</span>' :
                     '<span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">HARD</span>') : '';
                
                return `
                    <div class="p-4 rounded-xl border-2 ${r.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
                        <div class="flex items-start gap-3">
                            <div class="w-7 h-7 rounded-full ${r.isCorrect ? 'bg-green-500' : 'bg-red-500'} text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                                ${r.isCorrect ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>'}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2 flex-wrap">
                                    Q${idx + 1} ${diffBadge}
                                </p>
                                <p class="text-sm text-gray-600 mb-2">${q ? q.question : ''}</p>
                                ${!r.isCorrect ? `
                                    <p class="text-xs text-gray-500">
                                        Your answer: <span class="font-bold text-red-600">${r.studentAnswer || 'Skipped'}</span> 
                                        — Correct: <span class="font-bold text-green-600">${r.correctAnswer}</span>
                                    </p>
                                ` : ''}
                                <p class="text-xs text-gray-400 mt-1 italic">${r.explanation}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // If passed, trigger confetti effect
    if (result.passed) {
        triggerConfetti();
    }

    // Reload chapter to update button state
    if (window.loadChapter && quizChapterIndex !== null) {
        // Small delay to let user see the result first
        setTimeout(() => {
            window.loadChapter(quizChapterIndex);
            window.updateSidebarProgress();
        }, 500);
    }
}

// ==========================================
// 🎊 CONFETTI EFFECT
// ==========================================
function triggerConfetti() {
    const colors = ['#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];
    const modal = document.getElementById('quizModal');
    
    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: -20px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            z-index: 99999;
            pointer-events: none;
            animation: confettiFall ${Math.random() * 2 + 2}s linear forwards;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        modal.appendChild(confetti);
        
        // Cleanup after animation
        setTimeout(() => confetti.remove(), 4000);
    }
}

// ==========================================
// ❌ CLOSE QUIZ MODAL
// ==========================================
export function closeQuizModal() {
    const modal = document.getElementById('quizModal');
    modal.classList.add('hidden');

    // Reset state
    quizQuestions = [];
    quizAnswerKey = [];
    quizUserAnswers = {};
    currentQuestionIndex = 0;
}

// ==========================================
// 🔄 RETRY QUIZ
// ==========================================
export function retryQuiz() {
    if (quizChapterIndex !== null) {
        closeQuizModal();
        // Small delay then reopen
        setTimeout(() => {
            openQuizModal(quizChapterIndex);
        }, 300);
    }
}

// ==========================================
// 🌐 WINDOW BINDINGS
// ==========================================
window.openQuizModal = openQuizModal;
window.closeQuizModal = closeQuizModal;
window.quizPrevQuestion = quizPrevQuestion;
window.quizNextQuestion = quizNextQuestion;
window.submitQuiz = submitQuiz;
window.retryQuiz = retryQuiz;
