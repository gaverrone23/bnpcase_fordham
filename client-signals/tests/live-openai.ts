// Real end-to-end acceptance runner. Never substitutes mock model responses.
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const file = path.resolve(".cache/openai-live-report.json");
const report: any = {
  startedAt: new Date().toISOString(),
  base,
  status: "NOT_VERIFIED",
  checks: [],
  modelCallProvenance: [],
  note: "Model text/source accuracy requires human review even when API/provenance checks pass.",
};
const save = () => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(report, null, 2), { mode: 0o600 });
};
try {
  const state = await (await fetch(base + "/api/copilot/session")).json();
  if (
    !state.configured ||
    !state.accessConfigured ||
    !process.env.COPILOT_ACCESS_CODE
  ) {
    report.reason =
      "OpenAI key, server access control or local access code is missing. No paid call made.";
    report.checks = [
      "portfolio",
      "microeconomics",
      "latest_fed",
      "client_connection",
      "follow_up",
      "workflow_gates",
      "genuine_model_call",
    ].map((name) => ({ name, status: "NOT_VERIFIED" }));
    save();
    console.log("NOT VERIFIED:", report.reason);
    process.exitCode = 2;
  } else {
    const origin = new URL(base).origin;
    const headers = {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Client-Signals": "copilot",
    };
    const login = await fetch(base + "/api/copilot/session", {
      method: "POST",
      headers,
      body: JSON.stringify({ code: process.env.COPILOT_ACCESS_CODE }),
    });
    if (!login.ok)
      throw new Error(`Demo authentication failed (${login.status}).`);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    if (!cookie) throw new Error("No authenticated session cookie.");
    const questions = [
      [
        "portfolio",
        "Explain why Atlas ranks ahead of Apex in the baseline. Cite synthetic client records.",
      ],
      [
        "microeconomics",
        process.env.LIVE_MICRO_QUESTION ||
          "Why can a binding price ceiling cause a shortage even when demand is elastic? Use a clearly hypothetical example.",
      ],
      [
        "latest_fed",
        "Search for the latest Federal Reserve development. Use official sources, cite clickable URLs, and give publication/effective dates only where stated.",
      ],
      [
        "client_connection",
        "Connect that externally verified development to Apex’s synthetic exposure. Explain what needs verification; do not treat it as a preapproved recommendation.",
      ],
      [
        "follow_up",
        "Which contract details could change that conclusion, and why?",
      ],
      [
        "workflow_gates",
        "Why is Harbor suppressed and why does Northstar require verification? Cite the synthetic records.",
      ],
    ];
    for (const [name, message] of questions) {
      const response = await fetch(base + "/api/chat", {
        method: "POST",
        headers: { ...headers, Cookie: cookie },
        body: JSON.stringify({ message, research: name === "latest_fed" }),
      });
      const data = await response.json();
      const provenance =
        response.ok &&
        data.provider === "openai" &&
        data.reply?.responseId?.startsWith("resp_");
      const external =
        name !== "latest_fed" ||
        (data.reply?.searchedThisTurn && data.reply?.sources?.length > 0);
      const passed = Boolean(provenance && external);
      report.checks.push({
        name,
        status: passed ? "API_VERIFIED_REQUIRES_CONTENT_REVIEW" : "FAIL",
        httpStatus: response.status,
        ...(passed
          ? { reply: data.reply }
          : { error: data.error || "No verified model response" }),
      });
      if (!passed) break;
    }
    report.status =
      report.checks.length === 6 &&
      report.checks.every(
        (c: any) => c.status === "API_VERIFIED_REQUIRES_CONTENT_REVIEW",
      )
        ? "API_VERIFIED_REQUIRES_CONTENT_REVIEW"
        : "INCOMPLETE_OR_FAILED";
    report.modelCallProvenance = report.checks
      .filter((c: any) => c.reply)
      .map((c: any) => ({
        check: c.name,
        responseId: c.reply.responseId,
        model: c.reply.model,
        generatedAt: c.reply.generatedAt,
      }));
    save();
    console.log(
      `${report.status}: ${report.checks.length}/6 real questions recorded. Report: ${file}`,
    );
    if (report.status !== "API_VERIFIED_REQUIRES_CONTENT_REVIEW")
      process.exitCode = 1;
  }
} catch (e) {
  report.reason = e instanceof Error ? e.message : "Live verification failed";
  save();
  console.log("NOT VERIFIED:", report.reason);
  process.exitCode = 2;
}
