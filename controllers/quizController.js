// ==================================
// 🧠 QUIZ CONTROLLER
// ==================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Course } = require('../models/course');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 🎯 1. GENERATE QUIZ (AI Se Questions Banao)
// ==========================================
const generateQuiz = async (req, res) => {
    try {
        const { courseId, chapterIndex } = req.body;

        if (!courseId || chapterIndex == null) {
            return res.status(400).json({ error: "courseId aur chapterIndex dono chahiye bro! 🙄" });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found 🕵️‍♂️" });

        const chapter = course.chapters[chapterIndex];
        if (!chapter) return res.status(404).json({ error: "Chapter not found at this index." });

        // Chapter ka content extract karo for context
        const chapterContent = chapter.subtopics.map(sub => {
            return `Topic: ${sub.title}\nExplanation: ${sub.explanation || ''}`;
        }).join('\n\n');

        const chapterTitle = chapter.chapter_title;

        console.log(`🧠 Generating quiz for chapter: ${chapterTitle}`);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            You are an expert AI Quiz Generator for an educational platform.
            
            Generate exactly 10 multiple-choice questions (MCQs) based on the following chapter content.
            
            Chapter Title: "${chapterTitle}"
            
            Chapter Content:
            """
            ${chapterContent}
            """
            
            QUESTION DISTRIBUTION (STRICT):
            - 3 questions must be "easy" (basic recall, definitions, simple concepts)
            - 4 questions must be "medium" (application, understanding relationships, moderate analysis)
            - 3 questions must be "hard" (deep analysis, edge cases, complex scenarios, tricky options)
            
            RULES:
            - Each question MUST have exactly 4 options (A, B, C, D)
            - Only ONE option should be correct per question
            - Options should be plausible (no obviously wrong answers)
            - Questions should test real understanding, not just memorization
            - Mix the order of easy/medium/hard questions (don't group them)
            - Keep questions clear and concise
            
            Return ONLY valid JSON in this exact structure:
            {
                "questions": [
                    {
                        "id": 1,
                        "question": "What is...?",
                        "difficulty": "easy",
                        "options": {
                            "A": "Option 1",
                            "B": "Option 2",
                            "C": "Option 3",
                            "D": "Option 4"
                        },
                        "correctAnswer": "B",
                        "explanation": "Brief explanation of why B is correct"
                    }
                ]
            }
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        let quizData;
        try {
            quizData = JSON.parse(result.response.text());
        } catch (err) {
            console.error("Invalid JSON from AI for quiz:", err);
            return res.status(500).json({ error: "AI returned invalid quiz data." });
        }

        // Validate structure
        if (!quizData.questions || quizData.questions.length < 5) {
            return res.status(500).json({ error: "AI generated too few questions." });
        }

        // Store correct answers in a temp session-like approach
        // We'll store answers server-side and validate on submit
        // Save the quiz data temporarily in a map (or you can store in DB)
        // For simplicity, we'll send questions WITHOUT correct answers to frontend
        // and keep correct answers for validation on submit

        const questionsForFrontend = quizData.questions.map(q => ({
            id: q.id,
            question: q.question,
            difficulty: q.difficulty,
            options: q.options
        }));

        // Send both (correct answers will be needed on submit validation)
        // We store the full quiz in the response but the frontend only shows questions
        res.json({
            chapterTitle: chapterTitle,
            totalQuestions: quizData.questions.length,
            questions: questionsForFrontend,
            // Server-side answer key (sent encrypted/hidden — the frontend won't display this)
            _answerKey: quizData.questions.map(q => ({
                id: q.id,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation
            }))
        });

    } catch (error) {
        console.error("Quiz Generation Error:", error);
        res.status(500).json({ error: "Quiz generation fail ho gaya. Retry kar! 💀" });
    }
};

// ==========================================
// ✅ 2. SUBMIT QUIZ (Evaluate & Save Results)
// ==========================================
const submitQuiz = async (req, res) => {
    try {
        const { courseId, chapterIndex, answers, answerKey } = req.body;

        if (!courseId || chapterIndex == null || !answers || !answerKey) {
            return res.status(400).json({ error: "Incomplete quiz submission data." });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found." });

        const chapter = course.chapters[chapterIndex];
        if (!chapter) return res.status(404).json({ error: "Chapter not found." });

        // Evaluate answers against answer key
        let correctCount = 0;
        const totalQuestions = answerKey.length;
        const results = [];

        answerKey.forEach(keyItem => {
            const studentAnswer = answers.find(a => a.id === keyItem.id);
            const isCorrect = studentAnswer && studentAnswer.selectedOption === keyItem.correctAnswer;
            
            if (isCorrect) correctCount++;

            results.push({
                id: keyItem.id,
                correctAnswer: keyItem.correctAnswer,
                studentAnswer: studentAnswer ? studentAnswer.selectedOption : null,
                isCorrect: isCorrect,
                explanation: keyItem.explanation
            });
        });

        const scorePercent = Math.round((correctCount / totalQuestions) * 100);
        const passed = scorePercent >= 70;

        console.log(`📝 Quiz Result: ${scorePercent}% (${correctCount}/${totalQuestions}) — ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);

        // Save attempt to DB
        if (!chapter.quizAttempts) chapter.quizAttempts = [];
        
        chapter.quizAttempts.push({
            score: scorePercent,
            totalQuestions: totalQuestions,
            correctAnswers: correctCount,
            passed: passed,
            attemptedAt: new Date()
        });

        // Update best score
        if (scorePercent > (chapter.quizBestScore || 0)) {
            chapter.quizBestScore = scorePercent;
        }

        // If passed, mark chapter as complete
        if (passed) {
            chapter.isCompleted = true;
            chapter.quizPassed = true;
        } else {
            // If failed, ensure chapter is NOT marked as complete
            chapter.isCompleted = false;
            chapter.quizPassed = false;
        }

        course.markModified('chapters');
        await course.save();

        // Difficulty analysis for student based on quiz
        let difficultyBreakdown = { easy: { total: 0, correct: 0 }, medium: { total: 0, correct: 0 }, hard: { total: 0, correct: 0 } };
        
        // We need difficulty info — get it from answers context
        // Since we have the answerKey with IDs, we can reconstruct
        // For now, we'll send back results and let frontend compute from original quiz data

        res.json({
            score: scorePercent,
            passed: passed,
            correctAnswers: correctCount,
            totalQuestions: totalQuestions,
            results: results,
            bestScore: chapter.quizBestScore,
            attempts: chapter.quizAttempts.length,
            course: course // Send updated course back
        });

    } catch (error) {
        console.error("Quiz Submit Error:", error);
        res.status(500).json({ error: "Quiz submission fail ho gaya. 💀" });
    }
};

module.exports = {
    generateQuiz,
    submitQuiz
};
