// Browser acceptance checks use the cloud-supplied Playwright/Chromium runtime.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const baseURL = process.env.BASE_URL || "http://127.0.0.1:3000";
const output =
  process.env.SCREENSHOT_DIR || "/tmp/client-signals-rm-experience";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      baseURL,
      viewport: { width: 1440, height: 1000 },
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const inspector = () => page.getByTestId("evidence-inspector");
    const primary = (name) =>
      page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("button", { name, exact: true });
    const choose = (name) =>
      page.getByRole("button", { name: `Select ${name}`, exact: true }).click();
    const shot = async (name) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
    };
    const scenario = async (name) => {
      await page
        .getByRole("button", { name: "Demo Controls", exact: true })
        .click();
      await page.getByRole("button", { name, exact: false }).click();
    };
    await page.goto(baseURL);
    await inspector().waitFor();
    await shot("signals");
    await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    const ai = () => page.getByRole("dialog", { name: "Ask AI", exact: true });
    await ai()
      .getByText(/AI unavailable: Gemini API key is not configured/)
      .waitFor();
    assert.ok(
      !(await ai()
        .getByRole("textbox", { name: "Question for AI" })
        .isEnabled()),
    );
    await shot("ask-ai-unavailable");
    await page.keyboard.press("Escape");
    assert.equal(await ai().count(), 0);
    console.log(
      "PASS global Ask AI opens, explains missing key, disables requests and closes with Escape",
    );

    await inspector()
      .getByRole("button", { name: "Mark for Outreach Review", exact: true })
      .first()
      .click();
    await inspector()
      .getByRole("button", { name: "Undo review", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Top 3 (2)", exact: true })
      .waitFor();
    await inspector()
      .getByRole("heading", {
        name: "Atlas Manufacturing Co.",
        level: 1,
        exact: true,
      })
      .waitFor();
    await inspector()
      .getByLabel("Internal follow-up note or task", { exact: true })
      .fill(
        "Confirm the EUR payment date with Claire before preparing outreach.",
      );
    await inspector()
      .getByRole("button", { name: "Save internal follow-up", exact: true })
      .click();
    await inspector().getByText("Follow-up saved", { exact: true }).waitFor();
    await shot("reviewed-follow-up");
    await inspector()
      .getByRole("list", { name: "Saved follow-ups", exact: true })
      .scrollIntoViewIfNeeded();
    await shot("internal-follow-up");
    const task = inspector().getByRole("checkbox", {
      name: /Complete follow-up: Confirm the EUR/,
    });
    await task.check();
    assert.equal(await task.isChecked(), true);
    await task.uncheck();
    await inspector()
      .getByRole("button", { name: "Undo review", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Top 3 (3)", exact: true })
      .waitFor();
    await inspector()
      .getByRole("button", { name: "Mark for Outreach Review", exact: true })
      .first()
      .click();
    await inspector()
      .getByRole("button", {
        name: "Continue remaining priorities",
        exact: true,
      })
      .click();
    await inspector()
      .getByRole("heading", {
        name: "Apex BioTech Instruments",
        level: 1,
        exact: true,
      })
      .waitFor();
    console.log(
      "PASS review keeps client in view, follow-up saves/completes/reopens, undo restores eligibility, continue selects another client",
    );

    await inspector()
      .getByRole("button", { name: "Open client portfolio", exact: true })
      .click();
    const portfolio = () =>
      page.getByRole("region", { name: "Client portfolio", exact: true });
    await portfolio()
      .getByRole("heading", {
        name: "Apex BioTech Instruments",
        level: 1,
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", {
        name: "Open portfolio: Atlas Manufacturing Co.",
        exact: true,
      })
      .click();
    assert.match(await portfolio().innerText(), /CRM-8812/);
    assert.match(await portfolio().innerText(), /Historical CRM interactions/);
    assert.match(
      await portfolio().innerText(),
      /Confirm the EUR payment date with Claire/,
    );
    await shot("portfolio");
    await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    await ai().getByText("Atlas Manufacturing Co.", { exact: true }).waitFor();
    await page.keyboard.press("Escape");
    await portfolio()
      .getByRole("button", {
        name: "View client signals & evidence →",
        exact: true,
      })
      .click();
    await inspector()
      .getByRole("heading", {
        name: "Atlas Manufacturing Co.",
        level: 1,
        exact: true,
      })
      .waitFor();
    await primary("My Portfolio").click();
    await portfolio()
      .getByRole("heading", {
        name: "Atlas Manufacturing Co.",
        level: 1,
        exact: true,
      })
      .waitFor();
    await page.reload();
    await inspector().waitFor();
    assert.match(
      await inspector().innerText(),
      /Confirm the EUR payment date with Claire/,
    );
    console.log(
      "PASS Portfolio and Signals link by client, AI uses portfolio context, locally stored follow-up survives navigation and reload",
    );

    // Clear all three actionable clients without using Reset Demo, then recover one.
    for (let i = 0; i < 3; i++) {
      await inspector()
        .getByRole("button", { name: "Mark for Outreach Review", exact: true })
        .first()
        .click();
      await inspector()
        .getByRole("button", {
          name: "Continue remaining priorities",
          exact: true,
        })
        .click();
    }
    await page
      .getByRole("heading", {
        name: "No recommendations in this queue",
        exact: true,
      })
      .waitFor();
    assert.equal(await inspector().count(), 0);
    await shot("empty-queue-next-steps");
    await page
      .getByRole("button", { name: "Ask AI about my portfolio →", exact: true })
      .click();
    await ai().waitFor();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", {
        name: "Review decisions & undo actions →",
        exact: true,
      })
      .click();
    await choose("Atlas Manufacturing Co.");
    await inspector()
      .getByRole("button", { name: "Undo review", exact: true })
      .click();
    await inspector()
      .getByRole("button", {
        name: "Continue remaining priorities",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Top 3 (1)", exact: true })
      .waitFor();
    await inspector()
      .getByRole("button", { name: "Defer", exact: true })
      .click();
    await inspector()
      .getByRole("button", { name: "Undo banker decision", exact: true })
      .click();
    await inspector()
      .getByRole("button", { name: "Dismiss", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm Dismissal", exact: true })
      .click();
    await inspector()
      .getByRole("button", { name: "Undo banker decision", exact: true })
      .click();
    await inspector()
      .getByRole("button", { name: "Verify First", exact: true })
      .click();
    await inspector()
      .getByRole("button", { name: "Undo banker decision", exact: true })
      .click();
    await page.getByRole("button", { name: "All (5)", exact: true }).click();
    for (const name of [
      "Apex BioTech Instruments",
      "Meridian Logistics & Freight",
    ]) {
      await choose(name);
      await inspector()
        .getByRole("button", { name: "Undo review", exact: true })
        .click();
    }
    await page
      .getByRole("button", { name: "Top 3 (3)", exact: true })
      .waitFor();
    console.log(
      "PASS empty queue has actionable exits; review/defer/dismiss/manual verification recover without reset",
    );

    for (const [tab, name, gate] of [
      ["Verify (1)", "Northstar Regional Distribution", "VERIFY"],
      ["Muted (1)", "Harbor Automotive Components", "SUPPRESS"],
    ]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      await inspector()
        .getByRole("heading", { level: 1, name, exact: true })
        .waitFor();
      assert.match(await inspector().innerText(), new RegExp(gate));
      assert.equal(
        await inspector().getByRole("button", { name: /Undo/ }).count(),
        0,
      );
      assert.ok(
        !(await inspector()
          .getByRole("button", {
            name: "Mark for Outreach Review",
            exact: true,
          })
          .isEnabled()),
      );
      await inspector()
        .getByRole("button", { name: "Open client portfolio", exact: true })
        .click();
      assert.equal(
        await portfolio()
          .getByRole("button", {
            name: "Mark for Outreach Review",
            exact: true,
          })
          .count(),
        0,
      );
      await primary("Signals & Opportunities").click();
    }
    console.log(
      "PASS Northstar VERIFY and Harbor SUPPRESS stay protected in both views",
    );

    await scenario("Simulate Event: Fed 25 bps Rate Hike");
    const report = page.getByRole("dialog", {
      name: "Simulated market update",
    });
    await report.waitFor();
    assert.match(await report.innerText(), /87,500/);
    assert.match(await report.innerText(), /MKT-2026-980-FED/);
    await shot("fed-update");
    await report
      .getByRole("button", { name: "Inspect Evidence", exact: true })
      .nth(1)
      .click();
    await inspector()
      .getByRole("heading", {
        name: "Apex BioTech Instruments",
        level: 1,
        exact: true,
      })
      .waitFor();
    assert.match(await inspector().innerText(), /Conditional sensitivity/);
    await page.getByRole("button", { name: "Top 3 (3)", exact: true }).click();
    assert.deepEqual(
      await page
        .getByRole("button", { name: /^Select / })
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label"))),
      [
        "Select Apex BioTech Instruments",
        "Select Atlas Manufacturing Co.",
        "Select Meridian Logistics & Freight",
      ],
    );
    await choose("Atlas Manufacturing Co.");
    assert.match(await inspector().innerText(), /2\.45%/);
    assert.match(await inspector().innerText(), /326,612\.50/);
    await scenario("Quiet Market Scenario");
    await page
      .getByRole("heading", {
        name: "No recommendations in this queue",
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", {
        name: "End simulation; keep my work",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Top 3 (3)", exact: true })
      .waitFor();
    assert.match(
      await inspector().innerText(),
      /Confirm the EUR payment date with Claire/,
    );
    await scenario("Simulate Event: USTR 90-Day Exemption");
    await page
      .getByRole("button", {
        name: "Acknowledge & Return to Workbench",
        exact: true,
      })
      .click();
    await scenario("Reset Demo State");
    await page
      .getByRole("button", { name: "Top 3 (3)", exact: true })
      .waitFor();
    assert.ok(
      !(await inspector().innerText()).includes(
        "Confirm the EUR payment date with Claire",
      ),
    );
    console.log(
      "PASS Fed/quiet/USTR scenarios, ending simulation preserves work, math/ranking and explicit Reset Demo",
    );

    const health = await page.request.get("/api/health");
    assert.equal((await health.json()).hasGeminiKey, false);
    const offline = await page.request.post("/api/chat", {
      data: { message: "Compare Atlas and Apex" },
    });
    assert.equal(offline.status(), 503);
    assert.equal((await offline.json()).success, false);
    const refresh = await page.request.post("/api/evaluate-signal", {
      data: { client: {}, event: {} },
    });
    assert.equal(refresh.status(), 503);
    assert.equal((await refresh.json()).success, false);
    const malformed = await page.request.post("/api/chat", { data: {} });
    assert.equal(malformed.status(), 400);
    assert.deepEqual(errors, []);
    console.log(
      "PASS real missing-key APIs report unavailable rather than fake inference; no browser runtime errors",
    );
    // Transport-only test: simulate a configured health check and an HTML routing error.
    // This does NOT simulate successful AI inference.
    await page.route("**/api/health", (route) =>
      route.fulfill({ json: { status: "ok", hasGeminiKey: true } }),
    );
    await page.route("**/api/chat", (route) =>
      route.fulfill({
        status: 502,
        contentType: "text/html",
        body: "<html>Routing error</html>",
      }),
    );
    await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    await ai()
      .getByText(/Gemini key configured/)
      .waitFor();
    await ai()
      .getByRole("textbox", { name: "Question for AI" })
      .fill("What should I verify for Atlas?");
    await ai().getByRole("button", { name: "Send", exact: true }).click();
    await ai()
      .getByText("The chat endpoint did not return JSON.", { exact: true })
      .waitFor();
    console.log(
      "PASS simulated HTML transport error is explicit; live Gemini inference NOT VERIFIED",
    );
    await page.keyboard.press("Escape");
    await page.unroute("**/api/health");
    await page.unroute("**/api/chat");
    await page.setViewportSize({ width: 1366, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    console.log("PASS desktop layout at 1366×900; screenshots:", output);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
