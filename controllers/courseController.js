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

module.exports = {
    getAllCourses,
    getCourseById,
    deleteCourse,
    generateCourse,
    toggleChapterProgress,
    getSuggestions,
    createOutline
};
