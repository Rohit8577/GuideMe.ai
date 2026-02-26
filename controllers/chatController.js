const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash",
});


const aiChat = async (req, res) => {
  try {
    const msg = req.body.message;
    console.log("Received message:", msg);

    if (!msg) {
      return res.status(400).json({ error: "Message is required" });
    }

    const result = await model.generateContent(msg);
    const response = await result.response;
    const text = response.text();

    // console.log(text)

    res.json({ reply: text });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = {
  aiChat,
};
