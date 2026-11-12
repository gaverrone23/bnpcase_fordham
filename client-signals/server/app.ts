import express from "express";
import { buildCopilotContext } from "../src/domain/copilot";
import { AccessControl, DailyBudget } from "./access";
import {
  callOpenAI,
  CopilotError,
  MODEL,
  type ResponsesTransport,
} from "./research";
import type { Session } from "./access";
export function createApiApp(options: {
  key?: string;
  accessCode?: string;
  port: number;
  allowedOrigins?: string[];
  budgetFile: string;
  transport?: ResponsesTransport;
}) {
  const app = express();
  const port = options.port;
  const key = options.key;
  const allowedOrigins = new Set([
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    ...(options.allowedOrigins || []).filter((s) => /^https:\/\//.test(s)),
  ]);
  const access = new AccessControl(options.accessCode, allowedOrigins);
  const budget = new DailyBudget(options.budgetFile);
  let concurrent = 0;
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  app.use(express.json({ limit: "24kb" }));
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  const availability = () => ({
    provider: "openai",
    configured: Boolean(key),
    accessConfigured: access.configured,
    model: MODEL,
    reason: !key
      ? "OpenAI API key is not configured."
      : !access.configured
        ? "Server access code is not configured (minimum 16 characters)."
        : null,
  });
  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      copilot: availability(),
      time: new Date().toISOString(),
    }),
  );
  app.get("/api/copilot/session", (req, res) =>
    res.json({ ...availability(), authenticated: Boolean(access.get(req)) }),
  );
  app.post("/api/copilot/session", (req, res, next) => {
    try {
      if (!key)
        throw new CopilotError(503, "OpenAI API key is not configured.");
      access.login(req, res, req.body?.code);
      res.json({ success: true, ...availability(), authenticated: true });
    } catch (e) {
      next(e);
    }
  });
  app.delete("/api/copilot/session", (req, res, next) => {
    try {
      access.logout(req, res);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/copilot/conversation", access.authorize, (_req, res) => {
    const session = res.locals.copilotSession as Session;
    if (session.busy) {
      res
        .status(409)
        .json({
          success: false,
          error:
            "Wait for the current answer before starting a new conversation.",
        });
      return;
    }
    session.history = [];
    session.sources = [];
    res.json({ success: true });
  });
  app.post("/api/chat", async (req, res, next) => {
    let session: Session | undefined;
    try {
      if (!key || !access.configured)
        throw new CopilotError(
          503,
          `${availability().reason} Evidence and banker decisions remain available.`,
        );
      access.checkOrigin(req);
      session = access.get(req);
      if (!session)
        throw new CopilotError(
          401,
          "Unlock the copilot with the demo access code.",
        );
      const message = req.body?.message;
      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 4000 ||
        (req.body.research !== undefined &&
          typeof req.body.research !== "boolean")
      )
        throw new CopilotError(400, "Enter a question of 1–4000 characters.");
      if (session.busy)
        throw new CopilotError(
          409,
          "Wait for the current answer before sending another question.",
        );
      if (session.turns >= 20)
        throw new CopilotError(
          429,
          "This session reached its 20-request budget. Starting a new conversation does not reset that budget.",
        );
      if (concurrent >= 2)
        throw new CopilotError(
          429,
          "Copilot is handling other requests. Try again shortly.",
        );
      if (
        !access.chatLimit.allow(session.id) ||
        !access.chatLimit.allow(`ip:${req.ip}`)
      )
        throw new CopilotError(
          429,
          "Copilot rate limit: at most 6 questions per minute.",
        );
      const context = buildCopilotContext(req.body.context);
      const selected = context.clients.some(
        (c) => c.id === req.body.selectedClientId,
      )
        ? req.body.selectedClientId
        : undefined;
      budget.reserve(); // Count failures too; no automatic paid retries.
      session.busy = true;
      session.turns++;
      concurrent++;
      try {
        const { reply, history } = await callOpenAI({
          key,
          message: message.trim(),
          history: session.history,
          context,
          selectedClientId: selected,
          research: req.body.research === true,
          priorSources: session.sources,
          transport: options.transport,
        });
        session.history = history;
        const sources = new Map(session.sources.map((s) => [s.url, s]));
        for (const source of reply.sources) sources.set(source.url, source);
        session.sources = [...sources.values()].slice(-50);
        res.json({ success: true, provider: "openai", reply });
      } finally {
        session.busy = false;
        concurrent--;
      }
    } catch (e) {
      next(e);
    }
  });
  // Legacy refresh never invents an AI response or mutates seeded evidence.
  app.post("/api/evaluate-signal", (_req, res) =>
    res
      .status(503)
      .json({
        success: false,
        error:
          "Use Ask AI for read-only analysis. Automatic signal rewriting is disabled.",
      }),
  );
  app.use("/api", (_req, res) =>
    res.status(404).json({ success: false, error: "API route not found." }),
  );
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status =
        err instanceof CopilotError
          ? err.status
          : err.type === "entity.too.large"
            ? 413
            : err instanceof SyntaxError
              ? 400
              : 503;
      if (status === 429) res.setHeader("Retry-After", "60");
      res
        .status(status)
        .json({
          success: false,
          error:
            err instanceof CopilotError
              ? err.message
              : status === 413
                ? "Question payload is too large."
                : status === 400
                  ? "Invalid JSON request."
                  : "Copilot request unavailable. No model answer was generated; portfolio data is unchanged.",
        });
    },
  );

  return app;
}
