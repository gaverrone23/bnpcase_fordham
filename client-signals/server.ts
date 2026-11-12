import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { buildCopilotContext, copilotSystemInstruction, renderCopilotReply } from './src/domain/copilot';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Server-side Gemini initialization
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Timeout helper to ensure network requests never hang
async function callWithTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`API_TIMEOUT: Gemini response exceeded ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Resilient execution with model fallback cascade:
// Primary: gemini-3.1-flash-lite (fast ~800ms-1.2s, avoids 503 preview capacity spikes)
// Secondary: gemini-3.8-flash (if primary fails)
async function executeGeminiWithFallback(
  aiClient: GoogleGenAI,
  prompt: string,
  systemInstruction?: string
): Promise<{ text: string; modelUsed: string }> {
  // Attempt 1: gemini-3.1-flash-lite
  try {
    const res = await callWithTimeout(
      aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: { systemInstruction, responseMimeType: 'application/json' },
      }),
      10000
    );
    if (res.text) {
      return { text: res.text, modelUsed: 'gemini-3.1-flash-lite' };
    }
  } catch (err: any) {
    console.warn('Primary Gemini model failed or timed out.');
  }

  // Attempt 2: gemini-3.8-flash
  try {
    const res = await callWithTimeout(
      aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
      10000
    );
    if (res.text) {
      return { text: res.text, modelUsed: 'gemini-3.8-flash' };
    }
  } catch (err2: any) {
    console.error('Secondary Gemini model failed.');
    throw err2;
  }

  throw new Error('All model endpoints failed to return a text response.');
}

// Server-side domain scope validation
function validateRequestScope(query: string): { allowed: boolean; customResponse?: string } {
  const lower = query.toLowerCase().trim();

  // 1. Explicit out-of-scope topics (e.g. recipes, baking, entertainment, gaming, programming assignments)
  const outOfScopePatterns = [
    /\b(cake|recipe|baking|bake|cookie|bread|pasta|pizza|chocolate|dessert|cooking|dinner|soup|salad|ingredient|cocktail|smoothie)\b/i,
    /\b(weather in|forecast|movie|film|song|lyrics|poem|haiku|joke|riddle|game|fortnite|minecraft|pokemon|dating|horoscope|zodiac)\b/i,
    /\b(python script|write code for|fix my bug|javascript function|react component|html snippet)\b/i,
    /\b(who won the|super bowl|world cup|olympics|sports score)\b/i,
  ];

  for (const pattern of outOfScopePatterns) {
    if (pattern.test(lower)) {
      return {
        allowed: false,
        customResponse:
          "Client Signals is designed for corporate relationship management, market intelligence, and client prioritization. I can't assist with unrelated requests.",
      };
    }
  }

  // 2. Information Barrier / System Prompt / Unauthorized document probing
  const securityProbePatterns = [
    /\b(restricted|confidential advisory|m&a watchlist|internal memo|bypass|ignore all previous|system prompt|jailbreak|override policy)\b/i,
  ];

  for (const pattern of securityProbePatterns) {
    if (pattern.test(lower)) {
      return {
        allowed: false,
        customResponse:
          'Access Denied: In accordance with Bank Information Barrier Rule PR-AUTH-01, restricted advisory documents, confidential M&A records, and system instructions cannot be retrieved or disclosed.',
      };
    }
  }

  return { allowed: true };
}

// API endpoint for Chat: Ask Client Signals
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, context, selectedClientId } = req.body;

    if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
      return res.status(400).json({ success: false, error: 'Query message is required.' });
    }

    // Step 1: Server-side Domain Scope & Security Check
    const scopeCheck = validateRequestScope(message);
    if (!scopeCheck.allowed) {
      return res.json({
        success: true,
        source: 'SCOPE_GATE_ENFORCED',
        response: scopeCheck.customResponse,
      });
    }

    // Step 2: Check Gemini availability
    if (!ai || !process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        error:
          'AI Assistant is currently offline. Gemini API key is not configured in Settings > Secrets. You can inspect all authorized evidence and causal rationales directly in the main workbench.',
      });
    }

    // The client supplies only session decisions and a scenario selector. Source text,
    // ranks, calculations and seeded hard gates are reconstructed from server fixtures.
    const trustedContext = buildCopilotContext(context);
    const systemInstruction = copilotSystemInstruction(trustedContext);
    const selected = trustedContext.clients.some(c => c.id === selectedClientId) ? selectedClientId : 'Portfolio-wide';
    const recentHistory = Array.isArray(history) ? history.slice(-6).filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').map(m => ({role:m.role, content:m.content.slice(0,4000)})) : [];
    const userPrompt = JSON.stringify({question:message, selectedClient:selected, history:recentHistory});
    const { text, modelUsed } = await executeGeminiWithFallback(ai, userPrompt, systemInstruction);
    let response: string;
    try { response = renderCopilotReply(text, trustedContext); }
    catch { return res.status(422).json({success:false, error:'AI response withheld: source or workflow validation failed. Review the documented evidence; records are unchanged.'}); }

    return res.json({
      success: true,
      source: modelUsed,
      response,
    });
  } catch (err: any) {
    console.error('Chat request failed; no response or credential data logged.');
    return res.status(503).json({
      success: false,
      error: 'Gemini is unavailable. No AI response was generated. Continue with the client evidence and action plan.',
    });
  }
});

// API endpoint to re-evaluate a signal
app.post('/api/evaluate-signal', async (req, res) => {
  try {
    const { client, event, notes, internalResearch } = req.body;

    if (!ai || !process.env.GEMINI_API_KEY) {
      return res.status(503).json({success:false, error:'AI refresh unavailable: Gemini API key is not configured. Existing evidence is unchanged.'});
    }

    const prompt = `You are a senior Corporate Banking Relationship Manager intelligence assistant at BNP Paribas.
Analyze this corporate client exposure and new market shock.
CLIENT: ${client.name} (${client.sector}, Rev: ${client.annualRevenue})
MARKET EVENT: ${event.title} - ${event.summary}
AUTHORIZED CRM NOTES:
${notes.map((n: any) => `- [${n.date} - ${n.classification}] ${n.title}: ${n.excerpt}`).join('\n')}
${internalResearch ? `AUTHORIZED INTERNAL RESEARCH: ${internalResearch.title} - ${internalResearch.summary}` : ''}

Respond in concise JSON with:
{
  "whyThisClient": "1-2 sentences strictly based on the authorized CRM notes",
  "whyNow": "1-2 sentences on timing urgency driven by the market shock",
  "financialImpact": "Estimated exposure calculation and hypothesis",
  "recommendedQuestions": ["Question 1", "Question 2"]
}`;

    const { text, modelUsed } = await executeGeminiWithFallback(ai, prompt);
    const parsed = JSON.parse(text || '{}');

    return res.json({
      success: true,
      source: modelUsed,
      synthesis: parsed,
    });
  } catch (err: any) {
    console.error('AI refresh failed; no response or credential data logged.');
    return res.status(503).json({success:false, error:'AI refresh unavailable. No replacement analysis was generated.'});
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString() 
  });
});

// Mount Vite in development or serve static in production
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
