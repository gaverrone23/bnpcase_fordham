import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createApiApp } from "./server/app";

dotenv.config();
const directory = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const app = createApiApp({
  port,
  key: process.env.CLIENT_SIGNALS_OPENAI_KEY || process.env.OPENAI_API_KEY,
  accessCode: process.env.COPILOT_ACCESS_CODE,
  allowedOrigins: [
    "https://bnpcase-fordham.onrender.com",
    ...(process.env.COPILOT_ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim()),
  ],
  budgetFile: path.join(directory, ".cache", "copilot-daily-budget.json"),
  // Temporary competition guest access expires at Friday midnight New York.
  // The optional false value remains an emergency off switch.
  judgeDemoUntil: process.env.JUDGE_DEMO_ENABLED === "false"
    ? undefined
    : Date.parse("2026-11-14T05:00:00Z"),
});
if (process.env.NODE_ENV !== "production") {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(directory, "dist")));
  app.get("*", (_req, res) =>
    res.sendFile(path.join(directory, "dist", "index.html")),
  );
}
// Local by default. Public binding alone does not unlock paid endpoints.
app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `Client Signals listening on port ${port}. Copilot configuration is available through /api/health; no credentials are logged.`,
  ),
);
