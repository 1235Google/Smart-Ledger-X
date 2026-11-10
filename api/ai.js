import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, context, history } = req.body || {};
    
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "AI service not configured on server (missing GROQ_API_KEY)" });
    }

    const groq = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const messages = [
      {
        role: "system",
        content: `You are Aurex AI, the intelligent financial assistant for SmartLedgerX. Assist the user with financial calculations, expense analytics, budgets, and security insights. ${context ? `Context: ${JSON.stringify(context)}` : ''}`
      },
      ...(Array.isArray(history) ? history.map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.text || h.content || ''
      })) : []),
      { role: "user", content: prompt || "Hello" }
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.3,
      max_tokens: 1024
    });

    const response = completion.choices[0]?.message?.content || "";
    return res.status(200).json({ success: true, response });
  } catch (err) {
    console.error("API ERROR (/api/ai):", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || "Unknown server error"
    });
  }
}
