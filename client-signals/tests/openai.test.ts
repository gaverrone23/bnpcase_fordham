import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { once } from "node:events";
import { buildCopilotContext } from "../src/domain/copilot";
import {
  callOpenAI,
  extractWebSources,
  validateResearchAnswer,
  requiresResearch,
  MODEL,
  MAX_OUTPUT_TOKENS,
  MAX_WEB_CALLS,
  type ResponsesTransport,
  CopilotError,
} from "../server/research";
import { DailyBudget, AttemptLimiter } from "../server/access";
import { createApiApp } from "../server/app";

const ctx = buildCopilotContext({});
const url =
  "https://www.federalreserve.gov/newsevents/pressreleases/test-fixture.htm";
const block = (
  kind = "general_explanation",
  text = "A binding price ceiling below equilibrium can create excess demand.",
  extra = {},
) => ({
  kind,
  text,
  clientIds: [],
  syntheticSourceIds: [],
  webSourceUrls: [],
  ...extra,
});
const answer = (blocks = [block()], workflow: any[] = []) => ({
  blocks,
  workflow,
});
const response = (data = answer(), web = false) => ({
  id: "resp_test_fixture_not_live",
  status: "completed",
  output: [
    ...(web
      ? [
          {
            type: "web_search_call",
            status: "completed",
            action: {
              type: "search",
              sources: [{ type: "url", url, published_at: "2026-11-01" }],
            },
          },
        ]
      : []),
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: JSON.stringify(data),
          annotations: web
            ? [
                {
                  type: "url_citation",
                  url,
                  title: "Federal Reserve — TEST FIXTURE",
                },
              ]
            : [],
        },
      ],
    },
  ],
});

test("general economic explanations do not need client records or fabricated citations", () => {
  const result = validateResearchAnswer(answer(), ctx, [], false, false);
  assert.equal(result.blocks[0].kind, "general_explanation");
  assert.deepEqual(result.workflow, []);
});
test("research requires an actual completed search and provider-supported citations", () => {
  const parsed = answer([
    block(
      "external_information",
      "A source-reported development, not a market quote.",
      { webSourceUrls: [url] },
    ),
  ]);
  assert.throws(
    () => validateResearchAnswer(parsed, ctx, [], false, true),
    /could not be verified/,
  );
  const extracted = extractWebSources(
    response(parsed, true),
    "2026-11-12T12:00:00Z",
  );
  assert.equal(extracted.searched, true);
  assert.equal(extracted.sources[0].publishedAt, "2026-11-01");
  const result = validateResearchAnswer(
    parsed,
    ctx,
    extracted.sources,
    true,
    true,
  );
  assert.equal(result.sources[0].retrievedAt, "2026-11-12T12:00:00Z");
  const filtered = validateResearchAnswer(
    answer([
      block("external_information", "Claim", {
        webSourceUrls: ["https://fake.example/"],
      }),
    ]),
    ctx,
    extracted.sources,
    true,
    true,
  );
  assert.deepEqual(filtered.blocks[0].webSourceUrls, [url]);
  assert.ok(!JSON.stringify(filtered).includes("fake.example"));
  const equivalent = validateResearchAnswer(
    answer([
      block("external_information", "A source-reported development.", {
        webSourceUrls: ["https://www.federalreserve.gov/newsevents/pressreleases/test-fixture.htm?utm_source=synthetic"],
      }),
    ]),
    ctx,
    extracted.sources,
    true,
    true,
  );
  assert.deepEqual(equivalent.blocks[0].webSourceUrls, [url]);
});
test("unknown publication dates stay unknown; unsafe URLs do not become citations", () => {
  const data = response(answer(), true);
  delete (data.output[0] as any).action.sources[0].published_at;
  (data.output[1] as any).content[0].annotations.push({
    type: "url_citation",
    url: "javascript:alert(1)",
    title: "bad",
  });
  const web = extractWebSources(data, "2026-11-12T12:00:00Z");
  assert.equal(web.sources.length, 1);
  assert.equal(web.sources[0].publishedAt, null);
});
test("server derives workflow and client tags without accepting invalid evidence or unsafe gated advice", () => {
  const valid = validateResearchAnswer(
    answer([
      block("analysis", "Atlas should be contacted before Apex because its equipment payment is near.", {
        syntheticSourceIds: ["CRM-8812", "CRM-7901"],
      }),
    ]),
    ctx, [], false, false,
  );
  assert.deepEqual(new Set(valid.blocks[0].clientIds), new Set(["atlas-mfg","apex-biotech"]));
  assert.deepEqual(
    new Set(valid.workflow.map((w) => w.clientId)),
    new Set(["atlas-mfg", "apex-biotech"]),
  );
  assert.equal(valid.workflow.find((w) => w.clientId === "atlas-mfg")?.action, "ACT");
  assert.equal(valid.workflow.find((w) => w.clientId === "apex-biotech")?.action, "ACT");
  const harbor = answer([
    block("analysis", "Revive canceled project", {
      clientIds: ["harbor-components"],
      syntheticSourceIds: ["CRM-7702"],
    }),
  ], [{ clientId: "harbor-components", action: "ACT" }]);
  const guarded = validateResearchAnswer(harbor, ctx, [], false, false);
  assert.equal(guarded.workflow[0].action, "SUPPRESS");
  assert.equal(guarded.blocks[0].kind, "workflow_rule");
  assert.ok(!guarded.blocks[0].text.includes("Revive canceled project"));
  const missingTag = validateResearchAnswer(
    answer([block("analysis", "Harbor should be contacted")]),
    ctx, [], false, false,
  );
  assert.equal(missingTag.blocks[0].kind, "workflow_rule");
  const northstar = answer([
    block("analysis", "Pitch an uncertain expansion", {
      clientIds: ["northstar-logistics"],
    }),
  ], [{ clientId: "northstar-logistics", action: "ACT" }]);
  assert.equal(validateResearchAnswer(northstar, ctx, [], false, false).workflow[0].action, "VERIFY");
  assert.match(validateResearchAnswer(northstar, ctx, [], false, false).blocks[0].text, /Derek Kowalski/);
  assert.throws(() => validateResearchAnswer(
    answer([block("synthetic_evidence", "CRM fact", { syntheticSourceIds: ["FAKE"] })]),
    ctx, [], false, false,
  ), /withheld/);
  assert.throws(() => validateResearchAnswer(
    answer([block("analysis", "CRM-9999 confirms an invented fact")]),
    ctx, [], false, false,
  ), /withheld/);
  assert.throws(() => validateResearchAnswer(
    answer([block("analysis", "Atlas moved 1.82%", { clientIds: ["atlas-mfg"] })]),
    ctx, [], false, false,
  ), /withheld/);
});
test("Responses request uses bounded documented tools/model and only server-held history", async () => {
  let body: any;
  const transport: ResponsesTransport = async (input) => {
    body = input;
    return response();
  };
  const first = await callOpenAI({
    key: "test-fixture-key",
    message: "Explain price ceilings",
    history: [],
    context: ctx,
    research: false,
    transport,
  });
  assert.equal(body.model, MODEL);
  assert.equal(body.store, false);
  assert.equal(body.max_output_tokens, MAX_OUTPUT_TOKENS);
  assert.equal(body.max_tool_calls, MAX_WEB_CALLS);
  assert.equal(body.tools[0].type, "web_search");
  assert.equal(body.tools[0].external_web_access, true);
  assert.equal(body.tool_choice, "auto");
  assert.match(body.instructions, /2\.45%/);
  assert.match(body.instructions, /\$326,612.50/);
  assert.match(body.instructions, /not an identical SOFR move/);
  await callOpenAI({
    key: "test-fixture-key",
    message: "How does that affect consumers?",
    history: first.history,
    context: ctx,
    research: false,
    transport,
  });
  assert.equal(body.input[0].content, "Explain price ceilings");
  assert.ok(
    body.input.some(
      (m: any) => m.role === "assistant" && m.content.includes("price ceiling"),
    ),
  );
  assert.equal(first.reply.responseId, "resp_test_fixture_not_live");
});
test("latest Fed research forces the sole web-search tool and primary Fed domains", async () => {
  let body: any;
  const parsed = answer([
    block("external_information", "Source-reported development", {
      webSourceUrls: [url],
    }),
  ]);
  const result = await callOpenAI({
    key: "fixture",
    message: "What is the latest Federal Reserve development?",
    history: [],
    context: ctx,
    research: false,
    transport: async (b) => {
      body = b;
      return response(parsed, true);
    },
  });
  assert.equal(body.tool_choice, "required");
  assert.deepEqual(body.tools[0].filters.allowed_domains, [
    "federalreserve.gov",
    "newyorkfed.org",
  ]);
  assert.equal(result.reply.searchedThisTurn, true);
  assert.equal(requiresResearch("What is the current rate?"), true);
  assert.equal(requiresResearch("Explain microeconomics"), false);
  assert.equal(
    requiresResearch("Explain the current ratio and current liabilities"),
    false,
  );
  assert.equal(requiresResearch("Explain my current priorities"), false);
  assert.equal(requiresResearch("who should I reach out first today?"), false);
  assert.equal(requiresResearch("Who should I contact today?"), false);
  assert.equal(requiresResearch("What is my current portfolio ranking today?"), false);
  assert.equal(requiresResearch("Prepare a follow-up for Atlas today"), false);
  assert.equal(requiresResearch("What did the Federal Reserve announce today?"), true);
  assert.equal(requiresResearch("Latest Fed news relevant to Atlas"), true);
  assert.equal(requiresResearch("Who should I call today?", true), true);
});
test("follow-up source reuse preserves original retrieval time instead of implying a fresh search", async () => {
  const source = {
    url,
    title: "Fixture",
    publishedAt: null,
    retrievedAt: "2026-11-01T10:00:00Z",
  };
  const parsed = answer([
    block("analysis", "A conditional implication of that earlier source.", {
      webSourceUrls: [url],
    }),
  ]);
  const result = await callOpenAI({
    key: "fixture",
    message: "What does that imply?",
    history: [],
    context: ctx,
    research: false,
    priorSources: [source],
    transport: async () => response(parsed),
  });
  assert.equal(result.reply.searchedThisTurn, false);
  assert.equal(result.reply.sources[0].retrievedAt, source.retrievedAt);
});
test("incomplete or malformed model output is withheld rather than presented as a success", async () => {
  await assert.rejects(
    callOpenAI({
      key: "fixture",
      message: "Explain demand",
      history: [],
      context: ctx,
      research: false,
      transport: async () => ({ ...response(), status: "incomplete" }),
    }),
    /did not complete/,
  );
  await assert.rejects(
    callOpenAI({
      key: "fixture",
      message: "Explain demand",
      history: [],
      context: ctx,
      research: false,
      transport: async () => ({
        id: "resp_fixture",
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "not JSON" }],
          },
        ],
      }),
    }),
    /invalid structured/,
  );
});
test("daily admission budget persists across restarts and rejects corrupt or exhausted state", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cs-budget-"));
  try {
    const file = path.join(dir, "budget.json");
    const budget = new DailyBudget(file, 2);
    const now = new Date("2026-11-12T12:00:00Z");
    budget.reserve(now);
    new DailyBudget(file, 2).reserve(now);
    assert.throws(() => budget.reserve(now), /budget reached/);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).reservedMaxWebCalls, 4);
    budget.reserve(new Date("2026-11-13T00:00:00Z"));
    writeFileSync(file, "not json");
    assert.throws(() => budget.reserve(now), /invalid/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("rate limiter expires old windows and caps identities", () => {
  const limiter = new AttemptLimiter(2, 1000);
  assert.equal(limiter.allow("ip", 0), true);
  assert.equal(limiter.allow("ip", 0), true);
  assert.equal(limiter.allow("ip", 1), false);
  assert.equal(limiter.allow("ip", 1001), true);
});

async function testServer(
  run: (base: string, origin: string) => Promise<void>,
  transport: ResponsesTransport,
  configured = true,
  judgeDemoUntil?: number,
) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "cs-api-"));
  const origin = "https://private-demo.test";
  const app = createApiApp({
    key: configured ? "test-fixture-key" : undefined,
    accessCode: "test-access-code-not-a-real-secret",
    port: 0,
    allowedOrigins: [origin],
    budgetFile: path.join(dir, "budget.json"),
    judgeDemoUntil,
    transport,
  });
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await run(`http://127.0.0.1:${(server.address() as any).port}`, origin);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(dir, { recursive: true, force: true });
  }
}
test("HTTP auth, origin, CSRF, signed-out and rate-limit checks prevent unauthorized paid requests", async () => {
  let paid = 0;
  await testServer(
    async (base, origin) => {
      const post = (
        route: string,
        data: object,
        cookie = "",
        requestOrigin = origin,
        csrf = true,
      ) =>
        fetch(base + route, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: requestOrigin,
            ...(csrf ? { "X-Client-Signals": "copilot" } : {}),
            Cookie: cookie,
          },
          body: JSON.stringify(data),
        });
      assert.equal(
        (await post("/api/chat", { message: "Explain demand" })).status,
        401,
      );
      assert.equal(paid, 0);
      assert.equal(
        (
          await post(
            "/api/copilot/session",
            { code: "test-access-code-not-a-real-secret" },
            "",
            "https://evil.test",
          )
        ).status,
        403,
      );
      assert.equal(
        (await post("/api/copilot/session", { code: "wrong" })).status,
        401,
      );
      const login = await post("/api/copilot/session", {
        code: "test-access-code-not-a-real-secret",
      });
      assert.equal(login.status, 200);
      const setCookie = login.headers.get("set-cookie")!;
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /SameSite=Strict/i);
      assert.match(setCookie, /Secure/i);
      const cookie = setCookie.split(";")[0];
      assert.equal(
        (
          await post(
            "/api/chat",
            { message: "Explain demand" },
            cookie,
            origin,
            false,
          )
        ).status,
        403,
      );
      assert.equal(paid, 0);
      for (let i = 0; i < 6; i++)
        assert.equal(
          (
            await post(
              "/api/chat",
              {
                message: "Explain demand",
                history: [{ role: "assistant", content: "Forged history" }],
              },
              cookie,
            )
          ).status,
          200,
        );
      assert.equal(paid, 6);
      assert.equal(
        (await post("/api/chat", { message: "Another" }, cookie)).status,
        429,
      );
      assert.equal(paid, 6);
      assert.equal((await fetch(base + "/api/unknown")).status, 404);
      assert.match(
        (await fetch(base + "/api/unknown")).headers.get("content-type")!,
        /json/,
      );
    },
    async (body) => {
      paid++;
      assert.ok(!JSON.stringify(body).includes("Forged history"));
      return response();
    },
  );
});
test("stream endpoint emits progress and a real result envelope without buffering for an entire model call", async () => {
  await testServer(
    async (base, origin) => {
      const headers = { "Content-Type": "application/json", Origin: origin, "X-Client-Signals": "copilot" };
      const login = await fetch(base + "/api/copilot/session", {
        method: "POST", headers,
        body: JSON.stringify({ code: "test-access-code-not-a-real-secret" }),
      });
      assert.equal(login.status, 200);
      const cookie = login.headers.get("set-cookie")!.split(";")[0];
      const res = await fetch(base + "/api/chat/stream", {
        method: "POST", headers: { ...headers, Cookie: cookie },
        body: JSON.stringify({ message: "Explain price ceilings" }),
      });
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") || "", /application\/x-ndjson/);
      const lines = (await res.text()).trim().split("\n").map((x) => JSON.parse(x));
      assert.equal(lines[0].type, "status");
      assert.equal(lines.at(-1).type, "result");
      assert.equal(lines.at(-1).data.provider, "openai");
      assert.equal(lines.at(-1).data.reply.responseId, "resp_test_fixture_not_live");
    },
    async () => response(),
  );
});
test("stream endpoint emits sanitized model errors as JSON lines", async () => {
  await testServer(
    async (base, origin) => {
      const headers = { "Content-Type": "application/json", Origin: origin, "X-Client-Signals": "copilot" };
      const login = await fetch(base + "/api/copilot/session", {
        method: "POST", headers,
        body: JSON.stringify({ code: "test-access-code-not-a-real-secret" }),
      });
      const cookie = login.headers.get("set-cookie")!.split(";")[0];
      const res = await fetch(base + "/api/chat/stream", {
        method: "POST", headers: { ...headers, Cookie: cookie },
        body: JSON.stringify({ message: "Research Federal Reserve", research: true }),
      });
      assert.equal(res.status, 200);
      const lines = (await res.text()).trim().split("\n").map((x) => JSON.parse(x));
      assert.equal(lines.at(-1).type, "error");
      assert.ok(!JSON.stringify(lines).includes("mock-secret"));
    },
    async () => { throw new CopilotError(503, "Provider unavailable."); },
  );
});
test("missing configuration never invokes a paid transport or fabricates a response", async () => {
  let paid = 0;
  await testServer(
    async (base, origin) => {
      const result = await fetch(base + "/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          "X-Client-Signals": "copilot",
        },
        body: JSON.stringify({ message: "Explain priorities" }),
      });
      assert.equal(result.status, 503);
      assert.equal((await result.json()).success, false);
      assert.equal(paid, 0);
      assert.equal(
        (await (await fetch(base + "/api/health")).json()).copilot.configured,
        false,
      );
    },
    async () => {
      paid++;
      return response();
    },
    false,
  );
});

test("temporary judge guest access works without a private code, enforces origin and four-turn limits", async () => {
  let paid = 0;
  await testServer(
    async (base, origin) => {
      const guest = (requestOrigin = origin) => fetch(base + "/api/copilot/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: requestOrigin, "X-Client-Signals": "copilot" },
        body: "{}",
      });
      assert.equal((await guest("https://untrusted.example")).status, 403);
      const login = await guest();
      assert.equal(login.status, 200);
      assert.equal((await login.json()).guest, true);
      const rawCookie = login.headers.get("set-cookie")!;
      assert.match(rawCookie, /HttpOnly/i);
      assert.match(rawCookie, /SameSite=Strict/i);
      const cookie = rawCookie.split(";")[0];
      for (let i = 0; i < 4; i++) {
        const res = await fetch(base + "/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: origin, "X-Client-Signals": "copilot", Cookie: cookie },
          body: JSON.stringify({ message: "Explain a supply shock" }),
        });
        assert.equal(res.status, 200);
      }
      assert.equal(paid, 4);
      const blocked = await fetch(base + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin, "X-Client-Signals": "copilot", Cookie: cookie },
        body: JSON.stringify({ message: "One more question" }),
      });
      assert.equal(blocked.status, 429);
      assert.equal(paid, 4);
    },
    async () => { paid++; return response(); },
    true,
    Date.now() + 60 * 60 * 1000,
  );
});
test("judge guest access fails closed after expiry", async () => {
  let paid = 0;
  await testServer(
    async (base, origin) => {
      const result = await fetch(base + "/api/copilot/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin, "X-Client-Signals": "copilot" },
        body: "{}",
      });
      assert.equal(result.status, 403);
      assert.equal(paid, 0);
    },
    async () => { paid++; return response(); },
    true,
    Date.now() - 1000,
  );
});

test("inline fabricated record IDs are rejected and native search citation glyphs do not leak into prose", () => {
  assert.throws(
    () =>
      validateResearchAnswer(
        answer([block("analysis", "CRM-9999 confirms an invented fact")]),
        ctx,
        [],
        false,
        false,
      ),
    /withheld/,
  );
  const web = extractWebSources(
    response(answer(), true),
    "2026-11-12T12:00:00Z",
  );
  const result = validateResearchAnswer(
    answer([
      block(
        "external_information",
        "Source-backed explanation \uE200cite\uE202turn0search0\uE201",
        { webSourceUrls: [url] },
      ),
    ]),
    ctx,
    web.sources,
    true,
    true,
  );
  assert.equal(result.blocks[0].text, "Source-backed explanation");
});
