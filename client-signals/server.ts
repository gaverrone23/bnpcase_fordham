import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
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
        config: systemInstruction ? { systemInstruction } : undefined,
      }),
      10000
    );
    if (res.text) {
      return { text: res.text, modelUsed: 'gemini-3.1-flash-lite' };
    }
  } catch (err: any) {
    console.warn('Primary model (gemini-3.1-flash-lite) failed or timed out:', err.message);
  }

  // Attempt 2: gemini-3.8-flash
  try {
    const res = await callWithTimeout(
      aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
      10000
    );
    if (res.text) {
      return { text: res.text, modelUsed: 'gemini-3.8-flash' };
    }
  } catch (err2: any) {
    console.error('Secondary model (gemini-3.8-flash) failed:', err2.message);
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

    if (!message || typeof message !== 'string') {
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

    // Step 3: Build Authorized Context (Pre-Retrieval Gate)
    const authorizedNotes = (context?.authorizedNotes || []).map((n: any) =>
      `[${n.id} - ${n.date} - ${n.classification}] Client: ${n.clientId} | Title: ${n.title} | Text: ${n.fullText}`
    ).join('\n\n');

    const authorizedOpportunities = (context?.opportunities || []).map((o: any) =>
      `Opportunity ID: ${o.id} | Client: ${o.clientId} | Status: ${o.status} | Rank: #${o.priorityRank} (${o.priorityTier}) | Why Client: ${o.whyThisClient} | Why Now: ${o.whyNow} | Financial Impact: ${o.financialImpact} | Factors: [Urgency: ${o.factors?.timingUrgency}, Exposure: ${o.factors?.clientExposureDepth}, Shock: ${o.factors?.marketShockMagnitude}, Freshness: ${o.factors?.evidenceFreshness}] ${o.suppressionReason ? `| Suppression Reason: ${o.suppressionReason}` : ''}`
    ).join('\n\n');

    const marketEvents = (context?.marketEvents || []).map((e: any) =>
      `[${e.id}] ${e.title} (${e.sourceType}) | Metric: ${e.marketShockMetric || 'N/A'} | Summary: ${e.summary}`
    ).join('\n\n');

    const systemInstruction = `You are Client Signals, an AI corporate banking decision-support assistant at BNP Paribas.
You assist Relationship Managers (RMs) managing a portfolio of mid-sized corporate clients.

Core Directives:
1. Grounding & Provenance: Cite specific Document IDs (e.g., CRM-8812, CRM-7901, CRM-8115, CRM-7702, MKT-2026-904, RES-BNP-402) for factual claims. Never invent synthetic facts.
2. Fact vs Inference: Distinguish Confirmed Facts from Extracted Context or Hypotheses.
3. Prioritization Logic:
   - Atlas Manufacturing is #1 because of a 45-day deadline on €12.325M unhedged machinery delivery and +1.82% EUR/USD spike (~$326k USD cost escalation).
   - Apex BioTech is #2 because their $35M floating-rate loan matures in Q1 2027 and faces rising benchmark yields (+24 bps on 10Y UST).
   - Meridian Freight is #3 because their Rotterdam cash sweep RFP deadline is Nov 30.
4. Handling Hypotheticals (e.g. "What if Atlas hedged 90% instead of 15%?"):
   - Clearly recalculate the hypothetical exposure (e.g. 90% hedged = €13.05M locked, leaving only €1.45M unhedged).
   - Contrast stored CRM facts with the hypothetical premise.
   - Explain that Atlas would lose #1 priority to Apex BioTech because its urgent FX volatility risk has been neutralized.
   - State clearly that the actual CRM record remains unchanged.
5. Suppression & Excluded Opportunities (e.g., Harbor Components):
   - Cite CRM-7702 confirming the board formally canceled Project Nearshore in Nov 2025.
   - Use precise language: "No documented current exposure to Mexican operations" (rather than claiming zero exposure globally).
   - Suggest defensible banker alternatives: review Detroit plant automated stamping capex (CRM-7702), monitor USMCA domestic parts impacts, or consult BNP automotive specialists.
6. Uncertainty & Contradictions (e.g., Northstar Logistics):
   - Highlight the direct conflict between CRM-6502 (former VP Asian freight route proposal) and CRM-7210 (new Finance Director 100% Asian capex freeze).
   - Separate established facts (leadership transition) from uncertainty (whether the freeze is temporary or permanent). Require verification before client outreach.
7. Banker in Control: The banker must review all next steps. No external communications or transactions are ever executed autonomously.
8. Domain Limitation: If asked an unrelated query, decline: "Client Signals is designed for corporate relationship management, market intelligence, and client prioritization. I can't assist with unrelated requests."

AUTHORIZED PORTFOLIO CONTEXT:
${authorizedOpportunities}

AUTHORIZED CRM NOTES:
${authorizedNotes}

AUTHORIZED MARKET DEVELOPMENTS & RESEARCH:
${marketEvents}`;

    const userPrompt = `User Question: ${message}\nCurrent Active Client Focus: ${selectedClientId || 'Portfolio-wide'}`;

    const { text, modelUsed } = await executeGeminiWithFallback(ai, userPrompt, systemInstruction);

    return res.json({
      success: true,
      source: modelUsed,
      response: text,
    });
  } catch (err: any) {
    console.error('Chat error:', err);
    return res.status(503).json({
      success: false,
      error: `Gemini service is currently unavailable (${err.message || 'Error'}). Live AI response cannot be completed. Please inspect authorized evidence directly in the workbench.`,
    });
  }
});

// API endpoint to re-evaluate a signal
app.post('/api/evaluate-signal', async (req, res) => {
  try {
    const { client, event, notes, internalResearch } = req.body;

    if (!ai || !process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        source: 'DETERMINISTIC_RULES_ENGINE',
        note: 'Gemini API key not configured on server; synthesized via deterministic banking rules.',
        synthesis: {
          whyThisClient: `Documented ${client.name} exposure to ${event.affectedAssetClasses?.join(', ')} confirmed by CRM records.`,
          whyNow: `Market shock (${event.title}) triggers immediate repricing and delivery window urgency.`,
          financialImpact: `Estimated sensitivity: Significant variance based on ${client.annualRevenue} turnover.`,
          recommendedQuestions: [
            `Has ${client.treasuryContact?.name || 'treasury'} evaluated this specific market volatility?`,
            `Would ${client.name} benefit from structured hedging or liquidity restructuring?`,
          ],
        },
      });
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
    console.error('Gemini synthesis error:', err);
    return res.json({
      success: true,
      source: 'DETERMINISTIC_FALLBACK',
      note: 'Simulated fallback response triggered due to API timeout or availability.',
      synthesis: {
        whyThisClient: `Documented exposure in authorized CRM records matches asset class movements.`,
        whyNow: `Recent market shock creates high urgency for treasury review.`,
        financialImpact: `Material financial variance anticipated.`,
        recommendedQuestions: [
          `Review unhedged balance sheet exposure with treasury committee.`,
        ],
      },
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    geminiKeyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
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
