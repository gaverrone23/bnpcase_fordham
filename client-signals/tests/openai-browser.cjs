// Rendering/transport fixtures ONLY. This suite does not prove live inference.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const output = process.env.SCREENSHOT_DIR || "/tmp/client-signals-openai";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Ask AI", exact: true });
    await dialog
      .getByText(/AI unavailable: OpenAI API key is not configured/)
      .waitFor();
    assert.ok(
      !(await dialog
        .getByRole("textbox", { name: "Question for AI" })
        .isEnabled()),
    );
    for (const name of [
      "Explain my priorities",
      "Research market developments",
      "Challenge an assumption",
      "Prepare a client conversation",
    ])
      assert.ok(
        !(await dialog.getByRole("button", { name, exact: true }).isEnabled()),
      );
    await page.screenshot({
      path: `${output}/openai-unavailable.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    console.log(
      "PASS real unconfigured OpenAI state, disabled requests, four prompt categories, global entry",
    );

    let authenticated = false,
      posts = [];
    await page.route("**/api/copilot/session", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: {
            configured: true,
            accessConfigured: true,
            authenticated,
            model: "TEST FIXTURE",
          },
        });
        return;
      }
      const body = route.request().postDataJSON();
      if (body.code !== "ui-test-fixture-code") {
        await route.fulfill({
          status: 401,
          json: { success: false, error: "Access code not accepted." },
        });
        return;
      }
      authenticated = true;
      await route.fulfill({
        json: {
          success: true,
          configured: true,
          accessConfigured: true,
          authenticated: true,
        },
      });
    });
    await page.route("**/api/copilot/conversation", (route) =>
      route.fulfill({ json: { success: true } }),
    );
    const source =
      "https://www.federalreserve.gov/newsevents/pressreleases/TEST-FIXTURE.htm";
    await page.route("**/api/chat", (route) => {
      const body = route.request().postDataJSON();
      posts.push(body);
      route.fulfill({
        json: {
          success: true,
          provider: "openai",
          reply: {
            model: "TEST FIXTURE — NOT LIVE",
            responseId: "resp_test_fixture_not_live",
            generatedAt: "2026-11-12T12:00:00Z",
            searchedThisTurn: posts.length === 1,
            workflow: [
              {
                clientId: "apex-biotech",
                name: "Apex BioTech Instruments",
                action: "ACT",
                status: "SURFACED",
              },
            ],
            blocks: [
              {
                kind: "external_information",
                text: "TEST FIXTURE — UI rendering only, not live research. This is not a real Federal Reserve announcement.",
                clientIds: [],
                syntheticSourceIds: [],
                webSourceUrls: [source],
              },
              {
                kind: "synthetic_evidence",
                text: "TEST FIXTURE: Apex’s synthetic facility is documented in CRM-7901.",
                clientIds: ["apex-biotech"],
                syntheticSourceIds: ["CRM-7901"],
                webSourceUrls: [],
              },
              {
                kind: "analysis",
                text: "TEST FIXTURE: A possible connection requires banker verification, not automatic reprioritization.",
                clientIds: ["apex-biotech"],
                syntheticSourceIds: [],
                webSourceUrls: [],
              },
              {
                kind: "hypothetical",
                text: "TEST FIXTURE: A 25 bps pass-through would be a conditional scenario.",
                clientIds: ["apex-biotech"],
                syntheticSourceIds: [],
                webSourceUrls: [],
              },
            ],
            sources: [
              {
                url: source,
                title: "Federal Reserve — TEST FIXTURE, NOT LIVE",
                publishedAt: "2026-11-01",
                retrievedAt: "2026-11-11T10:00:00Z",
              },
            ],
          },
        },
      });
    });
    await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    await dialog
      .getByRole("textbox", { name: "Demo access code" })
      .fill("incorrect-fixture");
    await dialog
      .getByRole("button", { name: "Unlock copilot", exact: true })
      .click();
    await dialog
      .getByText("Access code not accepted.", { exact: true })
      .waitFor();
    assert.equal(
      await dialog
        .getByRole("textbox", { name: "Demo access code" })
        .inputValue(),
      "",
    );
    await dialog
      .getByRole("textbox", { name: "Demo access code" })
      .fill("ui-test-fixture-code");
    await dialog
      .getByRole("button", { name: "Unlock copilot", exact: true })
      .click();
    await dialog.getByText(/Private session unlocked/).waitFor();
    await dialog
      .getByRole("button", {
        name: "Research market developments",
        exact: true,
      })
      .click();
    await dialog.getByRole("article", { name: "Copilot answer" }).waitFor();
    const links = dialog.getByRole("link", {
      name: "Federal Reserve — TEST FIXTURE, NOT LIVE",
      exact: true,
    });
    assert.equal(await links.count(), 2);
    assert.equal(await links.first().getAttribute("href"), source);
    assert.equal(await links.first().getAttribute("target"), "_blank");
    assert.match(await links.first().getAttribute("rel"), /noopener/);
    for (const heading of [
      "External information · Web-sourced",
      "Synthetic CRM evidence",
      "Analytical inference",
      "Hypothetical scenario",
    ])
      await dialog
        .getByRole("heading", { name: heading, exact: true })
        .waitFor();
    assert.match(await dialog.innerText(), /Publication date: 2026-11-01/);
    assert.match(await dialog.innerText(), /Retrieved:/);
    assert.match(await dialog.innerText(), /Generated/);
    await page.screenshot({
      path: `${output}/citation-rendering-TEST-FIXTURE-NOT-LIVE.png`,
      fullPage: true,
    });
    assert.equal(posts[0].research, true);
    assert.equal(posts[0].history, undefined);
    assert.equal(posts[0].context.authorizedNotes, undefined);
    await dialog
      .getByRole("textbox", { name: "Question for AI" })
      .fill("Which contract details would change that conclusion?");
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
    await dialog
      .getByRole("article", { name: "Copilot answer" })
      .nth(1)
      .waitFor();
    assert.equal(posts.length, 2);
    assert.match(posts[1].message, /Which contract details/);
    await dialog
      .getByRole("button", { name: "New conversation", exact: true })
      .click();
    await dialog
      .getByText("Ask a question, then keep exploring", { exact: true })
      .waitFor();
    assert.equal(
      await dialog.getByRole("article", { name: "Copilot answer" }).count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS FIXTURE ONLY: unlock failure/success, citations, publication/retrieval/generation separation, provenance labels, follow-up UI and server conversation reset",
    );
    console.log(
      "Live OpenAI inference and research NOT VERIFIED by this rendering suite.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
