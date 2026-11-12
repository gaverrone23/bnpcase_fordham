# Client Signals

Synthetic corporate banking RM demo. No real bank data, external CRM writes, emails or transactions.

## Run locally

Use Node.js 24. From `client-signals/`:

```sh
npm install --legacy-peer-deps --package-lock=false
npm run dev
```

Express and Vite run together at local port 3000. The compatibility install handles the repository's existing Vite/esbuild peer conflict. No key is required for Portfolio, ACT/VERIFY/SUPPRESS, simulations or internal follow-ups.

Banker decisions last for the session. Follow-ups stay in this browser's local storage, not an external CRM. Ending a simulation preserves work; Reset Demo clears demo decisions and follow-ups.

## OpenAI copilot configuration

Copy `.env.example` to ignored `.env` and supply values locally, or configure them securely in environment settings. Never put values in chat, source, screenshots or browser storage.

- `CLIENT_SIGNALS_OPENAI_KEY` (or local `OPENAI_API_KEY`): server-side OpenAI project key with Responses and web-search access. In Codex, the custom name avoids a reserved secret target name. Allow HTTPS to `api.openai.com`.
- `COPILOT_ACCESS_CODE`: a private 16–200-character demo access code, supplied as a real server process variable or in `.env`. It is compared locally, so it cannot be a proxy-only placeholder. Share it only with authorized demo users through a private channel.
- Restart the server after changing configuration. Ask AI reports unavailable if key or access control is missing. Otherwise unlock the drawer with the access code.
- Bindings default to loopback. If using an approved HTTP reverse proxy, explicitly set `HOST` and exact HTTPS `COPILOT_ALLOWED_ORIGINS`; do not add wildcard origins or enable unrestricted CORS.

The backend posts to **OpenAI Responses API** with model snapshot `gpt-5-mini-2025-08-07`, low reasoning, and the supported `web_search` tool. Model identity, API fields and search tooling were checked against OpenAI's [GPT-5 cookbook](https://github.com/openai/openai-cookbook/blob/main/examples/gpt-5/gpt-5_new_params_and_tools.ipynb), [Responses example](https://github.com/openai/openai-cookbook/blob/main/examples/responses_api/responses_example.ipynb), and [official SDK types](https://github.com/openai/openai-node/blob/master/src/resources/responses/responses.ts). Project/model/tool access and live answer quality still require a real end-to-end call; these references are not live validation. No News API is used.

### Access and usage limits

Paid endpoints require an HttpOnly, SameSite=Strict session cookie and an approved same-origin request. There are 8 unlock attempts per IP per 15 minutes, 6 questions/minute per session and IP, 20 requests per 4-hour session, 2 concurrent requests globally, and 1 in flight per session. Failed OpenAI attempts count; there are no automatic paid retries.

Each request permits at most 4000 question characters, 20,000 history characters, 4000 output/reasoning tokens, 2 built-in tool calls and 60 seconds. The server reconstructs fixed synthetic context instead of accepting arbitrary client context/history. A single-host, locked ledger in ignored `.cache/copilot-daily-budget.json` reserves at most **60 requests per UTC day** across restarts (up to 120 tool calls and 240,000 output tokens). Corrupt/locked budget state fails closed. This bounds requests, not an exact dollar charge; tool/context token costs vary. Configure OpenAI project usage controls as an additional safeguard. Multi-instance deployments would need shared authentication and transactional quotas; this branch is a private single-process demo, not a deployment.

Conversation history is held on the server, bounded and scoped to the authenticated session. Responses use `store:false`; this is not a promise of zero provider retention. New conversation clears context and source history, not request quotas. No model response changes CRM facts, ranks or banker decisions.

### Research provenance

Answers separate stable economic explanation, synthetic evidence, external information, analytical inference and hypothetical scenarios. Current questions require a completed web search with supported citations. Fed research is restricted to Federal Reserve/New York Fed domains. News is not an authoritative market-price feed.

Clickable citations use URLs returned by the Responses API/search, not arbitrary model-generated links. Publication metadata is displayed only if supplied; otherwise the UI says it was not provided. Source-stated dates may also appear in cited prose. Retrieval and answer-generation times are separate; follow-ups preserve earlier source retrieval times. Search evidence does not preapprove a client recommendation. Northstar stays VERIFY and Harbor's canceled expansion stays SUPPRESS.

## Temporary Canva judge demo access

For the competition on Friday, November 13, 2026, the organizer's computer may open the shared Client Signals URL without logging in. If server-side `CLIENT_SIGNALS_OPENAI_KEY`, `COPILOT_ACCESS_CODE`, `COPILOT_ALLOWED_ORIGINS` and `JUDGE_DEMO_ENABLED=true` are set, clicking **Ask AI** automatically requests a short-lived guest session. **No private code is shown to judges.** This mode expires automatically at **2026-11-14 05:00 UTC (Friday midnight New York)**. After expiration, normal private-code login is still available.

The server allows at most 12 guest unlocks per 24-hour process window, 4 questions per guest session, and 30 total paid requests per UTC day across guest and private sessions; it also keeps the existing per-IP/session rate and concurrency limits. The total paid-request counter is stored on the service filesystem and can be reset by a free-tier instance replacement or redeployment. These controls **are not a guaranteed dollar cap**: set provider-side limits, keep automatic credit reload OFF, and disable `JUDGE_DEMO_ENABLED` after the event. Never put the OpenAI key in a Canva link, browser code, README, or a slide.

Guest access should be validated from a separate browser/device on the live Render URL with (1) a new guest session automatically available upon opening Ask AI, (2) a real portfolio answer with synthetic record references, and (3) a current Fed web-search answer with provider-backed hyperlinks. Automated tests use fixtures, so they do not prove real inference. The final Canva deck should link to the exact live HTTPS app URL.

## Validation

```sh
npm test
npm run lint
npm run build
```

With the cloud-supplied Playwright/Chromium runtime, run `node tests/browser.cjs`, `node tests/rm-experience.cjs`, and `node tests/openai-browser.cjs` against the app (`BASE_URL` overrides port 3000). The citation-rendering browser test uses labelled fixtures; it does not prove live inference.

For actual acceptance evidence after secure configuration, run `npm run test:live`. It asks six real questions covering the six functional acceptance cases and verifies model-call provenance for acceptance case seven through the authenticated app, writes a timestamped report to ignored `.cache/openai-live-report.json`, checks real response IDs/provenance and research citations, and charges the configured API within the same budgets. If configuration is missing it exits nonzero as **NOT VERIFIED**. Automated shape/source checks do not establish the economic accuracy of an unrehearsed answer; review the recorded model text and cited sources.
