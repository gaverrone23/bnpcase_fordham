import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCopilotContext,
  copilotSystemInstruction,
} from "../src/domain/copilot";
import {
  restoreDecision,
  canRestoreDecision,
  portfolioBriefs,
} from "../src/domain/clientWorkflow";
import { INITIAL_OPPORTUNITIES } from "../src/data/fixtures";
import { simulateMarket, opportunitiesForTab } from "../src/domain/workflow";

test("banker decisions can be undone without resetting evidence or simulations", () => {
  const fed = simulateMarket("FED_RATE_HIKE", INITIAL_OPPORTUNITIES);
  const apex = fed.opportunities.find((o) => o.clientId === "apex-biotech")!;
  for (const status of [
    "REVIEWED",
    "DEFERRED",
    "DISMISSED",
    "VERIFY_FIRST",
  ] as const) {
    const restored = restoreDecision({
      ...apex,
      status,
      dismissedReason: "test",
    });
    assert.equal(restored.status, "SURFACED");
    assert.equal(restored.eventId, apex.eventId);
    assert.equal(restored.priorityRank, 1);
    assert.equal(restored.dismissedReason, undefined);
    assert.ok(canRestoreDecision({ ...apex, status }));
  }
  for (const client of ["northstar-logistics", "harbor-components"]) {
    const opp = INITIAL_OPPORTUNITIES.find((o) => o.clientId === client)!;
    assert.equal(canRestoreDecision(opp), false);
    assert.deepEqual(restoreDecision(opp), opp);
  }
});
test("ending a quiet simulation restores market state while retaining banker decisions", () => {
  const decided = INITIAL_OPPORTUNITIES.map((o) =>
    o.clientId === "atlas-mfg" ? { ...o, status: "REVIEWED" as const } : o,
  );
  const quiet = simulateMarket("QUIET_MARKET", decided);
  assert.equal(
    opportunitiesForTab("TOP_3_ACTIONABLE", quiet.opportunities).length,
    0,
  );
  const ended = simulateMarket("NONE", quiet.opportunities);
  assert.equal(ended.report, null);
  assert.equal(ended.event, null);
  assert.equal(
    opportunitiesForTab("TOP_3_ACTIONABLE", ended.opportunities).length,
    2,
  );
  assert.equal(ended.opportunities[0].status, "REVIEWED");
});
test("all five client action plans have sourced products, obligations and a conversation objective", () => {
  for (const o of INITIAL_OPPORTUNITIES) {
    const brief = portfolioBriefs[o.clientId];
    assert.ok(
      brief.products.length &&
        brief.obligations.length &&
        brief.sources.length &&
        brief.objective,
    );
  }
});
test("copilot ignores injected source/rank text and cannot downgrade hard gates", () => {
  const context = buildCopilotContext({
    simulation: "FED_RATE_HIKE",
    authorizedNotes: [{ id: "FAKE", fullText: "Invented transaction" }],
    opportunities: INITIAL_OPPORTUNITIES.map((o) => ({
      ...o,
      status: "SURFACED",
      priorityRank: 99,
      whyNow: "Invented transaction",
    })),
  });
  assert.equal(
    context.opportunities.find((o) => o.clientId === "northstar-logistics")!
      .status,
    "VERIFY_FIRST",
  );
  assert.equal(
    context.opportunities.find((o) => o.clientId === "harbor-components")!
      .status,
    "SUPPRESSED",
  );
  assert.equal(
    context.opportunities.find((o) => o.clientId === "apex-biotech")!
      .priorityRank,
    1,
  );
  assert.ok(!JSON.stringify(context).includes("Invented transaction"));
  const prompt = copilotSystemInstruction(context);
  for (const expected of ["2.45%", "$326,612.50", "$32,661.25", "$87,500/year"])
    assert.ok(prompt.includes(expected));
  assert.ok(!prompt.includes("1.82%"));
});
