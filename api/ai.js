import { callGroqWithRetry } from "../src/server/groq-service.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { prompt, context, history } = req.body;
    
    console.log(`[AI] Received prompt: "${prompt}"`);
    
    if (!process.env.GROQ_API_KEY) {
      console.error("[AI] GROQ_API_KEY is missing in environment");
      return res.status(500).json({ success: false, error: "AI service not configured on server" });
    }

    const response = await callGroqWithRetry(prompt, history || [], context);
    if (!response) {
      return res.status(500).json({ success: false, error: "AI service returned no response" });
    }

    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("API ERROR (/api/ai):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Unknown server error"
    });
  }
}
