const { GoogleGenerativeAI } = require('@google/generative-ai');
const YouTube = require('youtube-sr').default;
const { Course } = require('../models/course');
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
                - "explanation" (250 -300 words, raw HTML using <p> and <strong>)
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

        // 🔹 STEP 6: Fetch YouTube Videos
        await Promise.all(
            courseData.chapters.map(async (chapter) => {
                await Promise.all(
                    chapter.subtopics.map(async (subtopic) => {
                        try {
                            const videos = await YouTube.search(
                                subtopic.youtube_query + " tutorial",
                                { limit: 2 }
                            );

                            subtopic.videos = videos.map(v => ({
                                title: v.title,
                                thumbnail: v.thumbnail.url,
                                url: v.url,
                                duration: v.durationFormatted
                            }));
                        } catch (err) {
                            subtopic.videos = [];
                        }
                    })
                );
            })
        );

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
        // 1. Destructure me customTopics add kar liya
        const { topic, chapters, topicsArray } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log(`Generating Outline for: ${topic}`);
        console.log(`Chapters requested: ${chapters}`);
        console.log(`Custom Topics: ${topicsArray || 'None'}`);

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
