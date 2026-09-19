import OpenAI from "openai";

let groq: OpenAI | null = null;

function getGroqClient() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("GROQ_API_KEY is not set. Aurex AI will not function.");
      return null;
    }
    groq = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return groq;
}

function buildSystemPrompt(ledgerData: any) {
  return `You are Aurex AI, an intelligent financial assistant embedded inside a personal/business ledger dashboard called Smart Ledger X.

PERSONALITY & TONE:
- Speak naturally and conversationally, like a sharp, helpful financial analyst — not robotic or templated
- Be concise but warm. Get to the point, but sound human
- If the user greets you casually ("hi", "hey"), respond casually and briefly — don't dump financial data unprompted
- If asked a specific question, answer it DIRECTLY using the real data below — never give a generic "I can help you with X, Y, Z" response unless the user explicitly asks what you can do
- Use ₹ formatting for all currency figures, matching Indian numbering format (e.g., ₹14,369 not ₹14369)
- When relevant, offer a helpful follow-up suggestion, but don't be pushy

CURRENT LIVE LEDGER DATA (use this to answer accurately):
- Total Available Balance: ₹${ledgerData.totalBalance || 0}
- Starting Vault: ₹${ledgerData.startingVault || 0}
- Total Received (Inflow): ₹${ledgerData.totalReceived || 0} (${ledgerData.receivedClients || 0} clients, ${ledgerData.inflowVelocity || 0}% settled)
- Total Pending/Outstanding Receivables: ₹${ledgerData.totalPending || 0} across ${ledgerData.pendingParties || 0} parties
- Due Money Items:
${ledgerData.dueItems?.map((item: any) => `  - ${item.name}: ₹${item.amount}, ${item.status === 'overdue' ? 'OVERDUE' : `due ${item.dueDate}`}`).join('\n') || 'None'}

CAPABILITIES YOU CAN HELP WITH:
1. Answering questions about balance, dues, receivables, and financial trends using the real data above
2. Drafting payment reminder messages for specific overdue contacts (write actual ready-to-send message text, personalized with their name and amount)
3. Explaining financial terms/metrics shown on the dashboard in simple language
4. Summarizing overall financial health in a natural paragraph
5. Basic financial suggestions (e.g., prioritizing which overdue payment to chase first)

RULES:
- NEVER repeat the same canned response for different questions
- NEVER say "I can help you summarize/draft/explain" unless the user asks "what can you do" or similar
- If you don't have enough data to answer something, say so honestly rather than deflecting with a generic menu
- Keep responses under 4 sentences unless the user asks for a detailed breakdown or a drafted message
`;
}

export async function callGroq(prompt: string, history: any[], context?: any[]) {
  const transactions = context || [];
  
  const ledgerData = {
    totalBalance: transactions.filter((t: any) => t.type === 'balance').reduce((sum: number, t: any) => sum + t.amount, 0),
    startingVault: 0,
    totalReceived: transactions.filter((t: any) => t.type === 'received').reduce((sum: number, t: any) => sum + t.amount, 0),
    receivedClients: new Set(transactions.filter((t: any) => t.type === 'received').map((t: any) => t.name)).size,
    inflowVelocity: 100,
    totalPending: transactions.filter((t: any) => t.type === 'pending').reduce((sum: number, t: any) => sum + t.amount, 0),
    pendingParties: new Set(transactions.filter((t: any) => t.type === 'pending').map((t: any) => t.name)).size,
    dueItems: transactions.filter((t: any) => t.type === 'pending').map((t: any) => ({
        name: t.name,
        amount: t.amount,
        status: t.status,
        dueDate: t.dueDate
    }))
  };

  const groqClient = getGroqClient();
  if (!groqClient) {
    throw new Error("GROQ_API_KEY is not set.");
  }

  const client = getGroqClient();
  if (!client) throw new Error("Groq client not initialized");
  
  const modelsData = await client.models.list();
  const availableModelIds = modelsData.data.map(m => m.id);

  let lastError;
  for (const modelId of availableModelIds) {
    try {
      const response = await groqClient.chat.completions.create({
        model: modelId,
        messages: [
            { role: 'system', content: buildSystemPrompt(ledgerData) },
            ...history.map(h => ({
              role: h.role === 'assistant' ? 'assistant' : 'user',
              content: h.content
            })),
            { role: 'user', content: prompt }
        ]
      });
      return response.choices[0].message.content;
    } catch (err: any) {
      console.warn(`Model ${modelId} failed: ${err.message}. Trying next...`);
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("All available models failed.");
}

export async function callGroqWithRetry(prompt: string, history: any[], context?: any[], maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callGroq(prompt, history, context);
    } catch (error: any) {
      // Groq uses standard HTTP codes. 503 is for rate limits/overload.
      const is503 = error.status === 503 || error.message.includes('503') || error.message.includes('UNAVAILABLE') || error.message.includes('rate limit');
      if (is503 && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Model overloaded, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

export async function listAvailableModels() {
  const models = await groq.models.list();
  return models;
}
