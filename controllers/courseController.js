const { GoogleGenerativeAI } = require('@google/generative-ai');
const YouTube = require('youtube-sr').default;
const { Course } = require('../models/course');
const { User } = require('../models/user');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getAllCourses = async (req, res) => {
    try {
        // Fetch courses created by the current user
        const courses = await Course.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch courses" });
    }
};

const getCourseById = async (req, res) => {
    try {
        // Fetch single course
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: "Course not found" });
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch course" });
    }
};

const deleteCourse = async (req, res) => {
    try {
        // Delete course
        await Course.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Delete failed" });
    }
};

const generateCourse = async (req, res) => {
    try {
        const { topic, outline } = req.body;

        if (!outline || !outline.chapters) {
            return res.status(400).json({ error: "Outline missing." });
        }

        console.log(`Generating content for: ${topic}`);

        // --- QUOTA CHECK LOGIC ---
        const userObjCheck = await User.findById(req.user.id);
        if (userObjCheck && userObjCheck.role !== 'admin') {
            const today = new Date();
            const lastGen = new Date(userObjCheck.lastGenerationDate);
            
            if (lastGen.toDateString() !== today.toDateString()) {
                userObjCheck.dailyGenerationCount = 0;
            }

            if (userObjCheck.dailyGenerationCount >= 2) {
                return res.status(403).json({ error: "Daily limit reached. You can only generate 2 courses per day." });
            }
        }
        // --- END QUOTA CHECK ---

        // --- CACHE INTERCEPT LOGIC FOR FULL COURSE ---
        const existingCourse = await Course.findOne({ title: outline.courseTitle });

        let isPerfectMatch = false;
        if (existingCourse && existingCourse.originalOutline && existingCourse.originalOutline.chapters.length === outline.chapters.length) {
            // Check if every chapter title matches (meaning user didn't modify the outline)
            isPerfectMatch = existingCourse.originalOutline.chapters.every((ch, idx) => {
                return ch.chapter_title === outline.chapters[idx].chapter_title;
            });
        }

        if (isPerfectMatch) {
            console.log(`⚡ CACHE HIT (FULL COURSE)! Cloning existing course for: ${topic}`);
            
            // Deep clone chapters to reset tracking statistics
            const clonedChapters = existingCourse.chapters.map(ch => ({
                chapter_title: ch.chapter_title,
                timeSpent: 0,
                visitCount: 0,
                isCompleted: false,
                subtopics: ch.subtopics.map(sub => ({
                    title: sub.title,
                    explanation: sub.explanation,
                    code: sub.code,
                    youtube_query: sub.youtube_query,
                    videos: sub.videos // Copy arrays directly since they are static
                }))
            }));

            const newCourse = new Course({
                title: existingCourse.title,
                description: existingCourse.description,
                imageUrl: existingCourse.imageUrl,
                icon: existingCourse.icon,
                chapters: clonedChapters,
                originalOutline: existingCourse.originalOutline,
                createdBy: req.user.id
            });

            await newCourse.save();

            // Track usage even on cache hit so user's activity remains logged
            const userObj = await User.findById(req.user.id);
            if (userObj) {
                const today = new Date();
                const lastGen = new Date(userObj.lastGenerationDate);
                if (lastGen.toDateString() !== today.toDateString()) {
                    userObj.dailyGenerationCount = 0;
                }
                userObj.totalAiGenerations = (userObj.totalAiGenerations || 0) + 1;
                userObj.dailyGenerationCount = (userObj.dailyGenerationCount || 0) + 1;
                userObj.lastGenerationDate = today;
                userObj.lastActive = today;
                await userObj.save();
            }

            return res.json(newCourse);
        }
        // --- END CACHE INTERCEPT LOGIC ---

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });

        // 🔹 STEP 1: Convert Outline to Proper Subtopic Structure
        const structuredOutline = {
            courseTitle: outline.courseTitle,
            description: outline.description,
            chapters: outline.chapters.map(ch => ({
                chapter_title: ch.chapter_title,
                subtopics: ch.topics.map(t => ({
                    title: t
                }))
            }))
        };

        // 🔹 STEP 2: Build Prompt
        const prompt = `
            You are an expert AI Course Creator.
                
            Target Topic: '${topic}'
                
            IMPORTANT:
            You MUST use the exact structure provided below.
            Do NOT change chapter titles.
            Do NOT add or remove chapters.
            Do NOT add or remove subtopics.
            Only generate detailed content for each subtopic.
                
            Outline Structure:
            ${JSON.stringify(structuredOutline, null, 2)}
                
            For EACH subtopic:
            - Keep the same "title"
            - Generate:
                - "explanation" (200 - 250 words, raw HTML using <p> and <strong>)
                - "code":
                    * If topic is technical → Provide clean code without comments.
                    * If non-technical → Return null.
                - "youtube_query"
                
            Return ONLY valid JSON in this structure:
                
            {
              "courseTitle": "${structuredOutline.courseTitle}",
              "description": "${structuredOutline.description}",
              "image_prompt": "short professional image prompt",
              "chapters": [
                  {
                      "chapter_title": "...",
                      "subtopics": [
                          {
                              "title": "...",
                              "explanation": "<p>...</p>",
                              "code": null OR "code",
                              "youtube_query": "..."
                          }
                      ]
                  }
              ]
            }
            `;

        // 🔹 STEP 3: Generate Content (Strict JSON Mode)
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        // 🔹 STEP 4: Safe JSON Parse
        let courseData;
        try {
            courseData = JSON.parse(result.response.text());
        } catch (err) {
            console.error("Invalid JSON from AI");
            return res.status(500).json({ error: "AI returned invalid JSON." });
        }

        // 🔹 STEP 5: Structure Validation (Safety)
        if (
            !courseData.chapters ||
            courseData.chapters.length !== structuredOutline.chapters.length
        ) {
            return res.status(500).json({ error: "AI structure mismatch." });
        }

        // 🔹 STEP 6: Fetch YouTube Videos (Smart — Scored + Multi-Strategy + Quality Filtered)
        const YOUTUBE_FALLBACK_THUMB = 'https://placehold.co/480x360/1e1e1e/666?text=No+Preview';
        const BATCH_SIZE = 3;

        /**
         * Smart video scoring function.
         * Instead of just using raw views, we score videos based on:
         *  1. Duration quality (5–20 min is ideal for educational subtopics)
         *  2. Views score (normalized, with diminishing returns)
         *  3. Keyword relevance (does the title contain topic keywords?)
         */
        const scoreVideo = (video, queryKeywords) => {
            let score = 0;
            const durationSec = video.duration || 0; // duration in seconds

            // --- 1. Duration Score (Most Important for Ed-Tech) ---
            // Ideal educational video: 5 to 20 minutes
            // Penalize short clips (< 2 min — likely Shorts or previews)
            // Penalize very long videos (> 45 min — too broad for one subtopic)
            if (durationSec >= 300 && durationSec <= 1200) {
                score += 50; // Perfect range (5–20 min)
            } else if (durationSec >= 120 && durationSec < 300) {
                score += 25; // Short but ok (2–5 min)
            } else if (durationSec > 1200 && durationSec <= 2700) {
                score += 15; // A bit long but could be detailed (20–45 min)
            } else {
                score += 0;  // Reject: too short (<2 min) or too long (>45 min)
            }

            // --- 2. Views Score (Log scale to prevent viral junk from dominating) ---
            // Math.log prevents a 10M-view Short beating a 300K well-crafted tutorial
            const views = video.views || 0;
            if (views > 0) {
                score += Math.min(Math.log10(views) * 8, 40); // Max 40 points from views
            }

            // --- 3. Keyword Relevance Score ---
            // Check if video title contains important words from the query/topic
            const titleLower = (video.title || '').toLowerCase();
            let keywordHits = 0;
            queryKeywords.forEach(kw => {
                if (titleLower.includes(kw.toLowerCase())) keywordHits++;
            });
            score += Math.min(keywordHits * 5, 10); // Max 10 points from keywords

            return score;
        };

        /**
         * Build multi-strategy search queries.
         * Different strategies for better coverage of topics.
         */
        const buildQueries = (subtopic, mainTopic) => {
            const base = subtopic.youtube_query || subtopic.title;
            return [
                `${base} tutorial`,                          // Strategy 1: Direct tutorial
                `${base} explained`,                         // Strategy 2: Explained style
                `${base} ${mainTopic} course`,               // Strategy 3: Topic + course context
                `learn ${base} for beginners`,               // Strategy 4: Beginner friendly
            ];
        };

        // Collect all subtopics that need video fetching
        const videoTasks = [];
        courseData.chapters.forEach((chapter) => {
            chapter.subtopics.forEach((subtopic) => {
                videoTasks.push(subtopic);
            });
        });

        // Process in batches to avoid YouTube rate-limiting
        for (let i = 0; i < videoTasks.length; i += BATCH_SIZE) {
            const batch = videoTasks.slice(i, i + BATCH_SIZE);

            await Promise.all(
                batch.map(async (subtopic) => {
                    try {
                        const queries = buildQueries(subtopic, topic);
                        let allVideos = [];

                        // Try first 2 strategies, stop early if we get enough results
                        for (const q of queries.slice(0, 2)) {
                            try {
                                const results = await YouTube.search(q, {
                                    limit: 8, type: "video", safeSearch: true
                                });
                                if (results && results.length > 0) {
                                    allVideos.push(...results);
                                    if (allVideos.length >= 8) break; // Enough to work with
                                }
                            } catch (_) { /* Silently skip failed queries */ }
                        }

                        // Fallback: If still nothing, try remaining strategies
                        if (allVideos.length === 0) {
                            for (const q of queries.slice(2)) {
                                try {
                                    const results = await YouTube.search(q, {
                                        limit: 8, type: "video", safeSearch: true
                                    });
                                    if (results && results.length > 0) {
                                        allVideos.push(...results);
                                        break;
                                    }
                                } catch (_) { /* Silently skip */ }
                            }
                        }

                        if (allVideos.length > 0) {
                            // Extract keywords from subtopic title for relevance scoring
                            const stopWords = new Set(['the','a','an','and','or','of','in','to','for','on','with','is','are','how']);
                            const queryKeywords = subtopic.title
                                .split(/\s+/)
                                .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));

                            // De-duplicate by video URL
                            const uniqueMap = new Map();
                            allVideos.forEach(v => {
                                if (v && v.url && !uniqueMap.has(v.url)) uniqueMap.set(v.url, v);
                            });
                            const unique = Array.from(uniqueMap.values());

                            // Filter out Shorts and broken entries,
                            // then score and pick top 2
                            const top2 = unique
                                .filter(v => v.url && (v.duration || 0) >= 90) // Min 90 sec = no Shorts
                                .map(v => ({ video: v, score: scoreVideo(v, queryKeywords) }))
                                .sort((a, b) => b.score - a.score)
                                .slice(0, 2)
                                .map(({ video: v }) => ({
                                    title: v.title || "Untitled Video",
                                    thumbnail: (v.thumbnail && v.thumbnail.url)
                                        ? v.thumbnail.url
                                        : YOUTUBE_FALLBACK_THUMB,
                                    url: v.url,
                                    duration: v.durationFormatted || "—",
                                    channel: (v.channel && v.channel.name) ? v.channel.name : "Unknown",
                                    views: v.views || 0
                                }));

                            subtopic.videos = top2;
                        } else {
                            subtopic.videos = [];
                        }
                    } catch (err) {
                        console.warn(`⚠️ YouTube fetch failed for: ${subtopic.title}`, err.message);
                        subtopic.videos = [];
                    }
                })
            );
        }

        // 🔹 STEP 7: AI Image Generation
        const imagePrompt = (courseData.image_prompt || topic).slice(0, 100);
        const randomSeed = Math.floor(Math.random() * 10000);

        const generatedImageUrl =
            `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?nologin=true&seed=${randomSeed}`;

        // 🔹 STEP 8: Smart Icon Logic
        let iconClass = "fa-solid fa-folder";
        const lowerTopic = topic.toLowerCase();

        if (lowerTopic.includes('js') || lowerTopic.includes('react') || lowerTopic.includes('node'))
            iconClass = "fa-brands fa-js";
        else if (lowerTopic.includes('python'))
            iconClass = "fa-brands fa-python";
        else if (lowerTopic.includes('java'))
            iconClass = "fa-brands fa-java";
        else if (lowerTopic.includes('html'))
            iconClass = "fa-brands fa-html5";
        else if (lowerTopic.includes('css'))
            iconClass = "fa-brands fa-css3-alt";
        else if (lowerTopic.includes('law') || lowerTopic.includes('legal'))
            iconClass = "fa-solid fa-scale-balanced";
        else if (lowerTopic.includes('finance') || lowerTopic.includes('money'))
            iconClass = "fa-solid fa-chart-line";

        // 🔹 STEP 9: Save to Database
        const newCourse = new Course({
            title: courseData.courseTitle,
            description: courseData.description,
            imageUrl: generatedImageUrl,
            icon: iconClass,
            chapters: courseData.chapters,
            originalOutline: structuredOutline, // 🔥 Pro move for version tracking
            createdBy: req.user.id
        });

        await newCourse.save();

        const userObj = await User.findById(req.user.id);
        if (userObj) {
            const today = new Date();
            const lastGen = new Date(userObj.lastGenerationDate);
            if (lastGen.toDateString() !== today.toDateString()) {
                userObj.dailyGenerationCount = 0;
            }
            userObj.totalAiGenerations = (userObj.totalAiGenerations || 0) + 1;
            userObj.dailyGenerationCount = (userObj.dailyGenerationCount || 0) + 1;
            userObj.lastGenerationDate = today;
            userObj.lastActive = today;
            await userObj.save();
        }

        res.json(newCourse);

    } catch (error) {
        console.error("Generation Error:", error);
        res.status(500).json({ error: "Generation failed." });
    }
};

const toggleChapterProgress = async (req, res) => {
    try {
        // Toggle chapter completion status
        const { id, chapterIndex } = req.params;
        const course = await Course.findById(id);

        if (!course) return res.status(404).json({ error: "Course not found" });

        const currentStatus = course.chapters[chapterIndex].isCompleted;
        course.chapters[chapterIndex].isCompleted = !currentStatus;

        await course.save();
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: "Toggle failed" });
    }
};

const getSuggestions = async (req, res) => {
    try {
        const { topic } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Generate 6-8 unique and catchy course titles and short descriptions based on the topic: '${topic}'.
        
        CRITICAL INSTRUCTION: 
        - The 'chapters' count for each suggestion MUST be either 6 to 7 .
        
        Return ONLY valid JSON array.
        Structure:
        [
            { "title": "Course Title", "description": "Short desc", "chapters": 7, "difficulty": "Intermediate" }
        ]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(text));
    } catch (err) {
        res.status(500).json({ error: "Suggestion failed" });
    }
};

const createOutline = async (req, res) => {
    try {
        const { topic, chapters, topicsArray } = req.body;
        
        console.log(`Generating Outline for: ${topic}`);
        console.log(`Chapters requested: ${chapters}`);
        console.log(`Custom Topics: ${topicsArray || 'None'}`);

        // --- QUOTA CHECK LOGIC ---
        const userObj = await User.findById(req.user.id);
        if (userObj && userObj.role !== 'admin') {
            const today = new Date();
            const lastGen = new Date(userObj.lastGenerationDate);
            
            // Check if last generation was on a previous day
            if (lastGen.toDateString() !== today.toDateString()) {
                userObj.dailyGenerationCount = 0;
            }

            // Enforce limit
            if (userObj.dailyGenerationCount >= 2) {
                return res.status(403).json({ error: "Daily limit reached. You can only generate 2 courses per day." });
            }
        }
        // --- END QUOTA CHECK ---

        // --- CACHE INTERCEPT LOGIC ---
        const targetChaptersCount = chapters ? parseInt(chapters) : 5;
        // Search for existing course with exact case-insensitive match on topic/title
        const existingCourse = await Course.findOne({ 
            title: { $regex: new RegExp(`^${topic}$`, 'i') } 
        });

        // Ensure course exists, length matches, and we have an outline payload stored
        if (existingCourse && existingCourse.chapters.length === targetChaptersCount && existingCourse.originalOutline) {
            // Optional: If topicsArray was specifically requested, check if at least one matches
            let passesTopicCheck = true;
            if (topicsArray) {
                const requestedKeywords = topicsArray.toLowerCase();
                const existingDescription = (existingCourse.description || "").toLowerCase();
                // Simple loose proxy check
                if (!existingDescription.includes(requestedKeywords.split(',')[0].trim())) {
                     passesTopicCheck = false;
                }
            }

            if (passesTopicCheck) {
                console.log(`⚡ CACHE HIT! Returning cached outline for: ${topic}`);
                const cachedOutline = {
                    courseTitle: existingCourse.originalOutline.courseTitle || existingCourse.title,
                    description: existingCourse.originalOutline.description || existingCourse.description,
                    difficulty: "Beginner", // Generic fallback
                    duration: "2 Hours", // Generic fallback
                    chapters: existingCourse.originalOutline.chapters.map(ch => ({
                        chapter_title: ch.chapter_title,
                        topics: ch.subtopics.map(sub => sub.title)
                    }))
                };
                return res.json(cachedOutline);
            }
        }
        // --- END CACHE INTERCEPT ---

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 2. Agar user ne custom topics dale hain, toh prompt me condition daal do
        let customTopicsInstruction = "";
        if (topicsArray) {
            customTopicsInstruction = `\nCRITICAL INSTRUCTION: The user wants to specifically include these topics: "${topicsArray}". Please integrate them logically into the chapters.`;
        }

        const prompt = `
            Create a structured course outline for '${topic}' with exactly ${chapters || 5} chapters. ${customTopicsInstruction}

            IMPORTANT RULES:
            - Do NOT include any numbering in chapter titles.
            - Do NOT include numbers, prefixes like "1.", "Chapter 1", "#1", etc.
            - Do NOT number the topics.
            - Titles and topics must be clean text only.
            - Return ONLY valid JSON.

            Structure:
            {
                "courseTitle": "Catchy Course Title",
                "description": "Short description (max 20 words)",
                "difficulty": "Beginner/Intermediate/Advanced",
                "duration": "e.g. 2 Hours",
                "chapters": [
                    {
                        "chapter_title": "Chapter Title (no numbering)",
                        "topics": ["Topic 1 (no numbering)", "Topic 2", "Topic 3", "Topic 4", "Topic 5"] 
                    }
                ]
            }`;

        // 3. W move: Force API to return strict JSON 
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        // Ab koi regex replace ki zaroorat nahi, seedha parse karo
        const text = result.response.text().trim();
        res.json(JSON.parse(text));

    } catch (error) {
        console.error("Outline Generation Error:", error);
        res.status(500).json({ error: "Failed to create outline." });
    }
};

const generateMoreContent = async (req, res) => {
    try {
        const { title, current_explanation } = req.body;

        console.log(title)
        console.log(current_explanation)

        if (!title || !current_explanation) {
            return res.status(400).json({ error: "Give Title And Explaination" });
        }

        console.log(`Deep diving into topic: ${title}`);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Prompt ekdam crisp rakha hai taaki AI purana repeat na kare
        const prompt = `
            You are an expert AI Course Instructor. 
            The user wants a deeper dive into the subtopic: "${title}".
            
            They have already read this explanation:
            """${current_explanation}"""
            
            Your task is to CONTINUE the explanation. 
            - DO NOT repeat what is already written.
            - Provide advanced insights, practical real-world examples, or edge cases.
            - Use clear formatting with HTML tags (<p>, <strong>, <ul>, <li>).
            - Keep the tone engaging and educational (around 150-200 words).
            
            Return ONLY a valid JSON object in this exact structure:
            {
                "new_content": "<p>Your generated continuation here...</p>"
            }
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json" // Strict JSON mode on
            }
        });

        const data = JSON.parse(result.response.text());
        res.json(data);

    } catch (error) {
        console.error("Load More Generation Error:", error);
        res.status(500).json({ error: "AI thak gaya bro, thodi der baad try kar." });
    }
};


const generateSpecificTopic = async (req, res) => {
    try {
        const { courseId, chapterIndex, subtopicIndex, main_topic_title, current_explanation, custom_topic } = req.body;

        if (!courseId || !main_topic_title || !current_explanation || !custom_topic) {
            return res.status(400).json({ error: "Bhai data missing hai, frontend se sahi payload bhej! 🙄" });
        }

        console.log(`Cooking specific content for: ${custom_topic}`);

        // Model set karo
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Prompt OP rakha hai taaki AI context na kho de
        const prompt = `
            You are an expert AI Course Instructor. 
            The user is studying the main topic: "${main_topic_title}".
            They have already read this explanation:
            """${current_explanation}"""
            
            Now, the user has asked for a specific explanation or deep dive into this exact custom query/topic: 
            "${custom_topic}"
            
            Your task is to explain this specific custom topic in the context of the main topic.
            - Address the user's specific query directly and accurately.
            - Provide advanced insights, real-world examples, or code snippets if relevant to the query.
            - DO NOT just repeat the old explanation.
            - Use clear formatting with HTML tags (<p>, <strong>, <ul>, <li>).
            - Keep the tone engaging, friendly, and educational (around 150-250 words).
            
            Return ONLY a valid JSON object in this exact structure:
            {
                "new_content": "<p>Your generated specific explanation here...</p>"
            }
        `;

        // API Call
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json" 
            }
        });

        // Parse karke naya content nikalo
        const data = JSON.parse(result.response.text());
        const newAIContent = data.new_content;

        // ==========================================
        // 🔥 NAYA LOGIC: ARRAY MEIN PUSH KARNA 🔥
        // ==========================================
        
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course nahi mila database mein bro." });
        }

        const targetSubtopic = course.chapters[chapterIndex].subtopics[subtopicIndex];

        // Agar specific_topics array purane DB record me nahi hai, toh bana do
        if (!targetSubtopic.specific_topics) {
            targetSubtopic.specific_topics = [];
        }

        // Object banakar array mein push kar do (schema ke hisaab se)
        targetSubtopic.specific_topics.push({
            topic_name: custom_topic,
            content: newAIContent
        });

        // Database me save maar do
        await course.save();
        console.log("Specific topic array mein OP tarike se save ho gaya! ✅");

        // Frontend ko response bhej do
        res.json(data);

    } catch (error) {
        console.error("Specific Topic Generation Error:", error);
        res.status(500).json({ error: "AI ka server thoda heavy ho gaya hai, ek aur try maar le bro. 💀" });
    }
};

const regenerateExplanation = async (req, res) => {
    try {
        const { courseId, chapterIndex, subtopicIndex, title, current_explanation, type } = req.body;

        if (!courseId || !title || !type) {
            return res.status(400).json({ error: "Data missing hai bro!" });
        }

        console.log(`Regenerating ${type} explanation for: ${title}`);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Prompt logic: Easy vs Detailed
        let toneInstructions = "";
        if (type === "easy") {
            toneInstructions = `
                - Explain this like I am a 10-year-old beginner.
                - Use extremely simple language, everyday analogies, and avoid heavy jargon.
                - Keep it concise, clear, and easy to digest.
            `;
        } else if (type === "detailed") {
            toneInstructions = `
                - Explain this like an advanced university lecture.
                - Provide a deep dive into the mechanics, use technical terminology where appropriate.
                - Include comprehensive details, nuances, and real-world implications.
            `;
        }

        const prompt = `
            You are an expert AI Course Instructor. 
            The user wants to completely rewrite the explanation for the topic: "${title}".
            
            They want a "${type}" explanation.
            ${toneInstructions}
            
            Here is the current text for context (Rewrite this entirely based on the new instructions):
            """${current_explanation}"""
            
            Your task is to provide the NEW completely rewritten explanation.
            - Use clear formatting with HTML tags (<p>, <strong>, <ul>, <li>).
            - Do not include the title in the output, just the explanation text.
            
            Return ONLY a valid JSON object in this exact structure:
            {
                "new_content": "<p>Your generated explanation here...</p>"
            }
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const data = JSON.parse(result.response.text());
        const newAIContent = data.new_content;

        // ==========================================
        // 🔥 NAYA LOGIC: TAG/BADGE ADD KARNA 🔥
        // ==========================================
        
        let badgeHTML = "";
        if (type === "easy") {
            // Mast Green Badge Easy ke liye
            badgeHTML = `
                <div class="mb-4">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-sm">
                        <i class="fa-solid fa-feather"></i> Easy Version
                    </span>
                </div>
            `;
        } else if (type === "detailed") {
            // Mast Blue Badge Detailed ke liye
            badgeHTML = `
                <div class="mb-4">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 shadow-sm">
                        <i class="fa-solid fa-microscope"></i> Detailed Version
                    </span>
                </div>
            `;
        }

        // AI ke content ke upar badge chipka diya
        const finalContentWithTag = badgeHTML + newAIContent;

        // ==========================================
        // 🔥 DB UPDATE LOGIC 🔥
        // ==========================================
        
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found." });

        const targetSubtopic = course.chapters[chapterIndex].subtopics[subtopicIndex];

        // DB me final tagged content save kar rahe hain
        targetSubtopic.explanation = finalContentWithTag;

        await course.save();
        console.log(`Explanation regenerated (${type}) aur DB me tag ke sath save ho gaya! ✅`);

        // Frontend ko tagged content bhej do
        res.json({ new_content: finalContentWithTag });

    } catch (error) {
        console.error("Regeneration Error:", error);
        res.status(500).json({ error: "AI thak gaya bro." });
    }
};

const analysis = async (req, res) => {
    try {
        const { courseId, chapterIndex, timeSpent } = req.body;
        
        if (!courseId || timeSpent == null || chapterIndex == null) {
            return res.status(400).json({ error: "Missing data bro! 💀" });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found 🕵️‍♂️" });

        // 🔥 Total time toh har baar add hoga (chahe 5 sec hi kyu na ruka ho)
        course.chapters[chapterIndex].timeSpent = 
            (course.chapters[chapterIndex].timeSpent || 0) + timeSpent;
        
        // 🔥 Asli magic yahan hai: Visit count tabhi badhega agar user 30+ sec ruka
        // Note: Make sure frontend se 'timeSpent' SECONDS mein aa raha ho!
        if (timeSpent >= 30) {
            course.chapters[chapterIndex].visitCount = 
                (course.chapters[chapterIndex].visitCount || 0) + 1;
        }
        
        // Mongoose ko batana zaroori hai ki array modify hua hai (agar nested array hai)
        course.markModified('chapters'); 

        await course.save();
        res.status(200).json({ message: "Analytics tracked like a pro ⏱️🔥" });

    } catch (err) {
        console.error("Time tracking error:", err);
        res.status(500).json({ error: "Server fat gaya 💥" });
    }
}

const courseAnalysis = async(req,res)=>{
    try {
        const courseId = req.params.courseId;
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        let totalSeconds = 0;
        let maxTime = -1;
        let hardestModule = "None";
        let completedCount = 0;

        const labels = [];
        const timeData = [];
        const chapterStats = [];

        // Har chapter pe loop maar ke data extract kar rahe hain
        course.chapters.forEach((ch) => {
            const timeInSec = ch.timeSpent || 0;
            const timeInMins = Math.round(timeInSec / 60); // Graph/Table ke liye Mins me convert kiya

            // Total time calculation
            totalSeconds += timeInSec;

            // Hardest module check (Jisme sabse zyada time laga)
            if (timeInSec > maxTime && timeInSec > 0) {
                maxTime = timeInSec;
                hardestModule = ch.chapter_title;
            }

            // Completion check
            if (ch.isCompleted) completedCount++;

            // Graph Arrays
            labels.push(ch.chapter_title);
            timeData.push(timeInMins); 

            // Table Status Logic
            let status = "Pending";
            if (ch.isCompleted) status = "Completed";
            else if (timeInSec > 0) status = "In Progress";

            // Table Array
            chapterStats.push({
                name: ch.chapter_title,
                timeSpent: timeInMins,
                status: status
            });
        });

        // KPI Math Calculations
        const totalChapters = course.chapters.length;
        const completionPercent = totalChapters === 0 ? 0 : Math.round((completedCount / totalChapters) * 100);

        // Seconds ko "Xh Ym" format me convert karna (Taaki UI pro lage)
        const totalHours = Math.floor(totalSeconds / 3600);
        const remainingMins = Math.floor((totalSeconds % 3600) / 60);
        const totalTimeStr = totalHours > 0 ? `${totalHours}h ${remainingMins}m` : `${remainingMins}m`;

        const avgSeconds = totalChapters === 0 ? 0 : totalSeconds / totalChapters;
        const avgMins = Math.round(avgSeconds / 60);
        const avgTimeStr = `${avgMins}m`;

        // Frontend ko saara cooked data serve kar do
        res.json({
            totalTime: totalTimeStr,
            avgTime: avgTimeStr,
            completionPercent: completionPercent,
            hardestModule: hardestModule,
            labels: labels,
            timeData: timeData,
            chapterStats: chapterStats
        });

    } catch (error) {
        console.error("Analytics fetch error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}


module.exports = {
    getAllCourses,
    getCourseById,
    deleteCourse,
    generateCourse,
    toggleChapterProgress,
    getSuggestions,
    createOutline,
    generateMoreContent,
    generateSpecificTopic,
    regenerateExplanation,
    analysis,
    courseAnalysis
};
