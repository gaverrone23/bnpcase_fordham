# CLIENT SIGNALS | PROJECT HANDOFF

**Project:** Ram Mode | NYU Product Management Club x BNP Paribas, Banking Reimagined  
**Team:** Gabriel, Talbia, Manali  
**Handoff date:** November 11, 2026  
**Product:** Client Signals | Corporate Banking  
**Working prototype:** Google AI Studio Build, owned in the team's existing Fordham-associated project  
**Primary objectives:** Connect + Prioritize  
**Status:** Interactive prototype available; AI chat integration has a confirmed critical runtime defect; source-code audit pending

> **START HERE.** This is a working handoff and issue register, not a claim that the product is production-ready. It distinguishes (A) official competition requirements, (B) decisions the team made, (C) behavior directly observed in screenshots and test recordings, and (D) code-level assertions that still require verification. The exported application ZIP was not attached to the conversation when this document was authored, so **file structure, actual Gemini invocation, access controls, and API integrations have NOT been independently audited against source code**. Preserve the exported ZIP alongside this document and use it as the authoritative implementation snapshot.

---

## 0. Executive handoff: what the next teammate must know

### The product in one sentence

**Client Signals helps a relationship manager (RM) managing many mid-sized corporate clients connect market developments to documented client circumstances, then decide which client to contact first, with inspectable evidence and explicit banker control.**

### The current situation

- **Working visually:** Portfolio priority list; Top 3 / Verify / Muted / All navigation; client evidence inspector; demonstrations of actionable, uncertain, and suppressed opportunities; banker review controls; a simulated market-event update that visibly changed priorities.
- **Broken:** Ask Client Signals intermittently, and in recent tests consistently, reports: `AI Assistant is currently offline: connection to server failed. Please inspect authorized evidence directly in the main workbench.`
- **Critical debugging evidence:** Chrome DevTools showed `chat` network requests with HTTP **200**, but the Console reported `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON` from **`AskClientSignalsPanel.tsx` (including line 191)**. The frontend is attempting to parse an HTML response as JSON. This suggests a missing/misrouted backend endpoint, an SPA fallback response, or a proxy/hosting mismatch. **The exact root cause is not yet proven.**
- **Do not infer:** HTTP 200 does not mean Gemini succeeded. A plausible Harbor response in an earlier recording does not establish that arbitrary questions consistently reach the model.
- **AI Studio development quota:** The Fordham account displayed **"Quota limit reached, change access method to continue"**. This is a separate development-access obstacle and must not be confused with the chat endpoint's HTML/JSON error. A personal Google One subscription does not automatically increase quota for an app owned by the Fordham Workspace account.
- **Immediate priority:** Preserve the source-code export, repair the chat request/response pipeline using a targeted code change, test with genuine end-to-end model calls, then rehearse the reliable deterministic workflow as a presentation fallback.

### Binding north star

> Help the RM identify which market developments matter to their clients and decide whom to contact first.

Every proposed change should improve this question or the RM's ability to trust the answer. No unnecessary dashboards, general-purpose chat, autonomous outreach, new CRM platform, or speculative features.

---

## 1. Official competition brief: non-negotiable requirements

**Authoritative source:** `NYU PMC x BNP Paribas Case Prompt - Fall 2026.pdf`. Where earlier exploratory concepts conflict, follow this brief and the final team persona decision below.

| Item | Requirement |
| --- | --- |
| Challenge | Design a product feature, workflow, or system change that turns client conversations and external market developments into useful ideas for what bankers should discuss with clients next. |
| Target user selection | Choose one specific persona and design for their reality. |
| Required objective | **Connect:** identify which market, industry, or regulatory developments matter to which clients, and why. |
| Selected second objective | **Prioritize:** decide which clients to engage, about what, and when. |
| Explicitly deprioritized | Capture, Prepare, Learn, each with a clear scope rationale. |
| Human control | No autonomous client outreach; RM reviews actions before anything reaches a client. |
| Show evidence | Every insight must trace to client context and a dated external development. |
| Relevance | Demonstrate what is *not* surfaced; don't optimize for more alerts. |
| Bank constraints | Confidentiality, information barriers, authorized research, explainability, suitability considerations. |
| Product approach | Extend existing banker workflows; do not rebuild the CRM or create a stand-alone news reader. |
| Deliverables | Accessible **slide deck plus working prototype**, with at least one end-to-end client/event/decision walkthrough. |
| Deck deadline | **Thursday, November 12, 2026, 11:59 PM EST.** |
| Presentation | **Friday, November 13, 2026**, at BNP Paribas, **787 7th Ave, New York, NY 10019**; arrive by **7:45 AM**. |
| Live format | **7-minute presentation + 3-minute Q&A** (official written brief). |
| Submission | PDF, PPTX, accessible Slides/Canva link, or another accessible format. An editable shared link must not be modified after deadline. |

**Judging dimensions:** Problem Identification; Impact Analysis; Solution Design; Design and Prototyping; Success Metrics; Presentation Quality; Overall Impact.

### Selected persona (final)

**User #1: RM managing a large book of mid-sized corporate clients with limited time to track each relationship.** The RM covers CFOs and treasury teams across companies with different FX, financing, trade, and industry exposures. They work through existing CRM notes, research, calendar, and relationships; their scarce resource is attention and confidence.

**Historical concept warning:** Early files titled *Open Decisions* focused on User #3, an RM inheriting a book. That concept was superseded. Do **not** revert to the inherited-book persona, Northstar Foods/Riverton/Larkspur dataset, or the old application name simply because these appear in archived build documents.

### Scope boundaries

- **Connect + Prioritize:** Mandatory product demonstration.
- **Capture:** Read existing synthetic notes, do not build meeting recording or automated conversation ingestion.
- **Prepare:** A lightweight suggested question or conditional specialist consultation can support the RM, but a complete meeting brief, product recommendation engine, and sales-playbook workflow are out of scope.
- **Learn:** Basic explicit decision feedback is acceptable; no claim of a trained learning loop or measured model improvement.
- **Demo mode:** A standalone desktop web app is acceptable for showcasing interactions; **the intended deployed product integrates with existing CRM/research workflows**.

---

## 2. User problem, product thesis, and differentiation

### Job to be done

> "When I start my day, show me the few developments that genuinely affect clients in my portfolio, explain the evidence and urgency, and let me decide who merits my attention before I reach out."

### Current failure the product addresses

1. Client intentions and constraints are fragmented across past CRM notes, account history, and banker memory.
2. Market and industry changes arrive through public news, authorized internal research, and specialized data feeds.
3. The RM must manually connect a development to a particular client, determine whether the underlying need is still active, and decide when to contact them.
4. Generic news alerts create volume without client specificity. Confident but wrong outreach can damage trust with a CFO or treasurer.

### Product thesis

An evidence-based **client-event matching and prioritization layer** can reduce the manual work of finding *relevant* conversations. Its differentiation is not alert volume or a fluent chatbot: it is **traceability, selective suppression, uncertainty handling, and human decision control**.

### What the app should answer in seconds

1. **What changed?** Specific market/industry/regulatory event, source, and timestamp.
2. **Why does it matter to this client?** The dated authorized client context that makes the connection credible.
3. **Why now and why before another client?** Timing, exposure, evidence quality, and relative priority.
4. **What should the RM do?** Review, verify, defer, or dismiss, with an optional evidence-supported next question or relevant specialist consultation.

---

## 3. Current prototype experience and observed UI

**Working name and header:** `Client Signals / Corporate Banking`.

**Observed workspace:**

- Header includes a portfolio of **five synthetic mid-cap accounts**, a **07:30 EST ingest** indicator (treat this as a demo label, not proof of a real data feed), simulated CRM/research and simulated policy-check labels.
- Queue views: **Top 3 (3)**, **Verify (1)**, **Muted (1)**, **All (5)** in the tested state.
- Main queue cards include client name, sector, market trigger, "Why now" narrative, and urgency/exposure/evidence descriptors.
- Evidence inspector displays client profile, market link, source snippets, a causal rationale, an estimated exposure/uncertainty section, and RM actions.
- **Ask Client Signals** appears as a contextual right-side panel in later builds, with proposed questions and a typed input. It is not currently a reliable live reasoning feature.
- **Demo Controls** include Reset Demo and a simulated market-event update. In the November 11 test, a synthetic **Fed +25 bps** event produced an update modal and reordered priority cards.
- No real banker emails, client calls, or transactions were demonstrated or should occur.

### Core interaction: RM working from the queue

1. Start with today's most relevant **actionable** opportunities.
2. Select a client card.
3. Inspect the dated client record and corresponding market/research event side by side.
4. Compare the priority drivers and identify uncertainty.
5. Choose a banker-controlled outcome: review for outreach, verify, defer, or dismiss with reason.
6. Optionally ask a contextual question, but **do not make the live-demo success depend on chat until the backend is verified**.

### Core interaction: RM asking a question

Target behavior after the bug fix: the RM asks an unrehearsed question in the visible chat, the system retrieves only authorized synthetic records, applies deterministic constraints, performs a genuine model call as necessary, cites actual source IDs, and returns an answer that cannot contradict the suppression/verification state.

**Observed limitation:** This behavior was not reliably demonstrated. The chat UI currently can fail because HTML is returned where JSON is expected.

---

## 4. Synthetic demonstration dataset and scenario fixtures

The following represents **observed or planned demo scenarios**, not live BNP client or market information. Exact record fields, source excerpts, and IDs must be checked against the exported ZIP before editing them.

| Client / scenario | Client-specific context | Trigger | Expected product behavior | Evidence status |
| --- | --- | --- | --- | --- |
| **Atlas Manufacturing Co.** | Synthetic Cleveland-based industrial manufacturing client; €14.5M German equipment purchase; approximately 15% hedged; delivery around 45 days in showcased scenario. | Hypothetical EUR/USD appreciation and ECB-related narrative. | Potentially actionable FX exposure: explain the documented equipment commitment, exposure assumptions, event timing, and RM next step. | Seen in workbench; numerical consistency needs audit. |
| **Apex BioTech Instruments** | Synthetic life-sciences client with approximately $35M floating-rate debt in the demonstrated financing scenario. | Hypothetical US rates shock; later simulation used **Fed +25 bps**. | Higher financing urgency where actual debt reset/financing terms justify it. In the latest recording, Apex moved from #2 to **#1** after the synthetic shock. | Ranking movement observed; model participation and all assumptions unverified. |
| **Harbor Automotive Components** | Earlier Mexico expansion discussed, then subsequently canceled according to a newer CRM note. | Tariff/trade-policy development superficially matches the old expansion. | **Muted / excluded** for this canceled thesis. Explain why no outreach is justified on that basis; suggest conditional internal verification only if supported by a distinct current exposure. | Suppression shown; one earlier chat answer discussed the cancellation, but dynamic model basis not verified. |
| **Northstar Regional Distribution** | Stale record suggests international freight expansion; newer finance guidance reportedly froze international capex. | Cross-border trade/tariff development. | **Verify first**, not actionable. Present contradictory dated notes and a neutral next verification step. | Verify screen observed; live chat answer failed. |
| **Meridian Logistics & Freight** | Additional synthetic portfolio account shown in the ranked list. | Logistics/trade exposure; exact source and rationale need inspection. | Only show as actionable if a specific authorized client-event connection remains defensible. | Client card seen; underlying records not source-audited. |

**Naming caution:** Earlier planning materials used variations such as *Northstar Logistics*, *Harbor Components*, and *Meridian Shipping*. The actual exported code and current UI should determine canonical IDs and labels; do not accidentally merge different fixtures because names are similar.

### Two numerical checks that must be fixed or explicitly explained

**Atlas FX scenario:**

- €14.5M × (1 - 15%) = **€12.325M** unhedged notional.
- A move from **1.0820 to 1.1085 USD/EUR** is **0.0265**, or **265 pips**, and corresponds to **about 2.45% relative to 1.0820**, **not 1.82%**.
- At constant notional, €12.325M × 0.0265 = **$326,612.50** incremental USD cost. The arithmetic is internally consistent **only under the stated hedging/notional and FX reference assumptions**.
- The observed copy combined the 1.0820 → 1.1085 rate move with a ~1.82% narrative. **Correct the percentage or change the underlying rates consistently.** Label the entire event as a synthetic scenario; do not imply current market prices.

**Apex Fed scenario:**

- $35M × 0.0025 = **$87,500/year** of simple additional interest *if* the full 25 basis-point change passes through to the facility for a full year at constant principal.
- A Fed funds target change is **not automatically an identical move in a client's borrowing rate**. Validate reset timing, index, margin, floor/cap, hedge coverage, and actual contract exposure before claiming a precise dollar impact.
- The displayed **Fed increase to 5.50%** was part of a **hypothetical demo event**, not a verified real announcement.

### Data-provenance contract

Each source and derived claim should record or display, as relevant:

- `sourceId`, `sourceType`, `title`, `publishedAt`, `effectiveAt`, `lastVerifiedAt` (if applicable), `version`, `classification`, `permittedRoles`, `clientId`, `status`.
- Distinguish **synthetic CRM**, **simulated internal bank research**, **curated historical public material**, and **verified live feed** (only if an actual adapter and retrieval are independently established).
- Mark **confirmed documented fact** versus **interpretation** versus **hypothesis needing verification**.
- Do not invent live articles, links, bank research titles, market quotes, or user-study results.

---

## 5. Decision logic: authoritative product behavior

**This is the required design, not a claim that every rule is implemented correctly in the code.**

```text
Synthetic client records + synthetic/curated events + mock internal research
       |
       v
Permitted-source / entitlement filter (before model context is assembled)
       |
       v
Client-event connection and evidence extraction (Gemini if actually connected)
       |
       v
Evidence validation: real source IDs, dates, factual support, no unsupported claims
       |
       v
Hard deterministic gates: permissions, obsolete/canceled theses, contradictions
       |
       +--> SUPPRESSED / MUTED: relevant-looking but invalid or not permitted
       +--> VERIFY FIRST: conflicting, stale, incomplete, or unconfirmed evidence
       +--> ELIGIBLE: sufficiently documented and authorized
       |
       v
Rank eligible opportunities using explainable relative factors
       |
       v
RM reviews evidence -> makes explicit decision -> no autonomous client action
```

### Ranking factors (qualitative unless code demonstrates a transparent formula)

- Relevance of external development to the client's **documented** exposures or pending decisions.
- Time sensitivity: upcoming purchase, debt reset, renewal, trade-policy effective date.
- Exposure/impact, with assumptions and sensitivity explicit.
- Quality, freshness, and completeness of supporting evidence.
- Eligibility: an attractive idea **cannot** override a hard suppression or permission block.

**No arbitrary 95/100 scores.** Explain why Atlas ranks ahead of Apex, and why the ranking changes (or does not change) when a new synthetic event arrives. "Top 3" is a display ceiling, not a quota; there may be 0–2 eligible opportunities.

### Suppression behavior

- Canceled Mexico expansion: suppress the specific outreach thesis, don't say there is conclusively "zero exposure" in the client's whole business.
- Contradictory expansion notes: verify, don't infer that the expansion definitely continues.
- Confidential or information-barrier-restricted material: don't feed it into the model or expose its contents/existence in RM-facing UI.
- If nothing relevant exists: the queue can legitimately show **zero actionable opportunities**.

### Human review and actions

- Review for outreach: internal banker acknowledgement only, not a sent message.
- Needs verification: RM must confirm a missing condition before asserting client relevance.
- Defer: RM chooses to revisit, with reason/time if supported.
- Dismiss with reason: RM rejects the suggestion and records why.
- Reset Demo: restore seeded fixture state; do not retain a previous synthetic event or decision unless explicitly designed.

---

## 6. Real AI, deterministic components, and non-goals

| Component | Intended mechanism | Verification as of handoff |
| --- | --- | --- |
| Top priority queue and filtered tabs | UI plus seeded state and ranking rules | Visually observed; exact state/persistence code not audited. |
| Simulation of synthetic Fed rate event | Fixture injection plus re-evaluation | Event modal and reordering observed; algorithm and event ingestion code not audited. |
| Harbor suppression | Deterministic cancellation/eligibility gate | Outcome visually observed; source-to-code enforcement not verified. |
| Northstar verification | Conflict handling rule | UI status observed; underlying conflict detection code not verified. |
| Ask Client Signals conversational reasoning | Intended server-side Gemini integration | **BROKEN IN RECENT TESTS**; live model calls not verified. |
| Market news feeds | Curated/synthetic data is sufficient for demo | **No real-time provider integration demonstrated**. Do not claim live feeds. |
| Bank research and CRM | Simulated adapters / synthetic fixtures | No BNP production integration claimed or verified. |
| Policy permissions / information barriers | Simulated rules and entitlements | Architectural intent only; do not claim production-grade controls or compliance signoff. |
| Product actions | Internal, banker-approved state change | Some controls visible; complete regression test pending. |

### Technical implementation facts requiring source ZIP inspection

**Do not guess** framework/runtime versions, exact chat endpoint URL, actual Gemini model name, authorization middleware, deployed backend availability, source file paths beyond the observed `AskClientSignalsPanel.tsx`, database/persistence strategy, API billing project, or secret wiring. Inspect `package.json`, server handlers, app entry point, Vite config, and environment examples once the ZIP is shared.

**Expected behavior for the assistant:** Answer unscripted, domain-limited corporate banking questions from permitted data; support contextual and portfolio questions; cite source IDs; compare priority drivers; distinguish hypotheticals from stored facts; never autonomously send communications; and never contradict enforced policy and suppression decisions.

### Security principles (demonstration, not certification)

1. Filter authorized records before they enter model input.
2. Treat source documents and CRM note text as untrusted; resist prompt injection.
3. Never leak restricted content or metadata to unauthorized users.
4. Keep API secrets server-side and out of source control.
5. Human approval before any external action.
6. Never claim actual BNP production access, regulatory certification, suitability approval, or verified bank policies.

---

## 7. P0 defect: chat returns HTML instead of JSON

### Reproduction and observed evidence

- Browser: Chrome, Google AI Studio full-screen Build app.
- User input example: **"Which client is currently my highest priority, and why?"**
- User-facing output: **"AI Assistant is currently offline: connection to server failed. Please inspect authorized evidence directly in the main workbench."**
- DevTools, **Network → Fetch/XHR**: requests named `chat`, type `fetch`, returned **HTTP 200**.
- DevTools, **Console**: `Chat error: SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`.
- Reported frontend location: **`AskClientSignalsPanel.tsx`, including line 191**.
- Separate Vite WebSocket/HMR warnings also appeared. **Do not assume** they cause the chat failure without a demonstrated link.

### What is actually known

The browser expected JSON and received text starting with HTML doctype. HTTP 200 can occur when a single-page application falls back to `index.html` for an unknown API route, or when a proxy/hosting layer returns an HTML page. **This strongly prioritizes routing and response-type investigation** over repeated prompt rewrites, but the backend URL/headers and code still need inspection before declaring the root cause.

### Developer repair procedure (first task)

1. Back up exported ZIP / commit the current snapshot. Do not overwrite the only working artifact.
2. Inspect chat submission handler in `AskClientSignalsPanel.tsx`: exact fetch URL, method, request body, response parsing, error handler.
3. Locate the actual server chat handler. Confirm that it is registered for the same URL/method and reachable in **editor preview** and **full-screen**.
4. Review Vite and hosting/proxy routing. Ensure a request for the chat API cannot silently resolve to `index.html`.
5. Check the actual HTTP request's **Request URL, Response Content-Type, and Response body**. Confirm JSON success and structured JSON errors with proper non-200 status codes. Do **not** expose cookies, credentials, authorization headers, or API keys in screenshots or shared logs.
6. Confirm the server actually invokes the configured Gemini API with an accessible model and server-side credentials; identify whether separate quota, billing, or auth conditions prevent inference.
7. Make a **targeted code patch** to repair routing/response validation, not a wholesale app rewrite.
8. In the frontend, verify `response.ok` and a JSON content type before `response.json()`; show a useful non-sensitive diagnostic category, not "connection failed" for every error.
9. Run **three consecutive live end-to-end chat requests** with actual inference evidence; repeat in full-screen mode. Mark model invocation **NOT VERIFIED** if no server trace supports it.

**Do not "fix" this by returning predefined answers, disguising HTML errors, embedding credentials client-side, or fabricating a successful response.**

### Three minimal re-test prompts

1. `Which client is currently my highest priority, and why?`
2. `Why was Harbor Automotive Components' Mexico-expansion opportunity suppressed?`
3. `If Atlas had hedged 90% rather than 15% of the equipment purchase, how would that change the hypothetical exposure? Do not edit any client records.`

Passing requires responses grounded in actual authorized fixtures, not just an HTTP 200 or polished prose.

---

## 8. Current issue backlog: severity and acceptance criteria

| Priority | Issue | Required result | Current status |
| --- | --- | --- | --- |
| **P0** | Chat API returns HTML to JSON parser | Valid JSON end-to-end, correct routing, consecutive genuine model replies, explicit error classes | **OPEN, confirmed** |
| **P0** | Genuine dynamic Gemini invocation not established | Trace model call and prove response is not hardcoded | **NOT VERIFIED** |
| **P0** | Synthetic/live-source provenance ambiguity | Label each source correctly; no claimed real-time news absent verified feed | **OPEN** |
| **P0** | Atlas FX percentage mismatch | Reconcile reference rates, percentage movement, 265 pips, and $326,612.50 | **OPEN, arithmetic issue observed** |
| **P0** | Apex rate pass-through assumptions | Make rate-reset terms and interest calculation conditional | **OPEN, assumption to verify** |
| **P0** | Suppression/verification consistency between dashboard and chat | Harbor stays suppressed, Northstar stays verify unless new evidence changes eligibility | **CHAT TEST BLOCKED** |
| **P1** | Event update auditability | Exact synthetic event, affected clients, before/after positions, actual changes and reasons | **UI improved, logic needs code audit** |
| **P1** | Always-visible and usable chat | Input visible on open; client context legible; evidence/action area not obscured | **Partially observed, test at full width** |
| **P1** | Evidence typography / dense middle column | "Why this client?" and "Why now?" easy to notice; readable source text | **OPEN** |
| **P1** | Suppressed recommendation leaves RM at dead end | Conditional alternative: verify a different active exposure, consult permitted specialist, or monitor | **DESIRED, not validated** |
| **P1** | Queue-selection and evidence synchronization | Selected item and inspector always match across Top 3 / Verify / Muted / All | **REGRESSION TEST NEEDED** |
| **P1** | Banker actions and Reset Demo | Correct state transitions; restore initial portfolio and simulated event state | **REGRESSION TEST NEEDED** |
| **P2** | Portfolio scale and density | Explain how 5 demo fixtures scale to dozens of accounts; avoid misleading exact capacity claims | **PITCH EXPLANATION** |
| **P2** | Future voice input | Consider later only; text chat first | **DEFERRED** |

**Prioritization rule:** Fix P0 integration and credibility problems before UI polish. Preserve the ability to demo the deterministic flow without AI chat.

---

## 9. Manual acceptance plan (must run on the actual exported code)

Record each test as `PASS`, `FAIL`, or `NOT VERIFIED`, with date, version/commit, operator, screenshot or response evidence, and any exception.

| Test | User action | Expected result |
| --- | --- | --- |
| Launch | Open desktop app | Main queue and selected client load without runtime errors. |
| Compare | Select Atlas, then Apex; ask who to contact first | Evidence-backed comparison using current state, not rank-only circular explanation. |
| Negative signal | Select Muted → Harbor; ask about Mexico tariff | Does not revive canceled thesis; cites authorized newer note, gives conditional next steps only. |
| Conflict | Select Verify → Northstar; ask if expansion is still active | Identifies contradictory notes and recommends verification. |
| Hypothetical | Ask about Atlas 90% hedge | Correct conditional exposure analysis, no CRM mutation, no forced new stored ranking. |
| Synthetic event | Reset Demo; record priority order; trigger Fed +25 bps | Clearly labeled hypothetical event, source/date, visible before/after positions, justified recalc. |
| Quiet day | Remove material signals in a controlled fixture | Zero eligible opportunities permitted; don't fill three slots automatically. |
| Domain limit | Ask for a cake recipe | Concise out-of-domain response without unrelated content. |
| Authorization | Request restricted research | No leakage of contents or existence; no unauthorized data in model context. |
| Source integrity | Inspect citations | Referenced synthetic source IDs actually exist and are authorized. |
| Tab switching | Switch Top 3 / Verify / Muted / All | Inspector and chat's current-client label reflect the selected account. |
| Controls | Mark for review, defer, dismiss | State changes correctly; no client-facing communication. |
| Reset | Activate reset after changing event/status | Exact initial demo state restored. |
| Consecutive chat | Submit 3 different unseen questions | Three real model calls and valid JSON responses; no HTML fallback. |
| Preview parity | Repeat one chat test in editor and full screen | Same working backend endpoint and coherent behavior. |

### Results observed before this handoff

- **Atlas vs Apex:** chat returned offline error; no reasoning-quality result.
- **Harbor:** an earlier recording displayed a plausible substantive answer grounded in cancellation context; dynamic Gemini route not confirmed.
- **Northstar:** chat returned offline error; no reasoning-quality result.
- **Fed synthetic event:** event modal, updated priority order (Apex #1, Atlas #2), and updated UI narrative observed; independent source-code-level ranking verification outstanding.
- **DevTools:** `chat` requests returned HTML instead of JSON in the failing path.

**Do not convert blocked tests into PASS merely because the static dashboard tells a plausible story.**

---

## 10. Presentation-ready scenario and demo fallback

### Recommended 90–120 second judge demo (works without relying on the broken chat)

1. **10 seconds: Set the user problem.** "An RM with dozens of relationships cannot manually connect every market change to every client. Wrong outreach damages trust."
2. **25 seconds: Atlas actionable.** Open Atlas. Show the actual client-specific equipment purchase note, FX event, sourced evidence, and a careful explanation of why the RM should consider contacting the client. Do not use the inconsistent 1.82% copy unless corrected.
3. **20 seconds: Harbor withheld.** Open Muted → Harbor. Show the dated cancellation; explain why a keyword/news matcher would have produced a false recommendation and why Client Signals did not.
4. **15 seconds: Northstar uncertainty.** Open Verify → Northstar. Highlight conflicting notes and a banker verification step rather than a confident pitch.
5. **20–30 seconds: Event update.** Show the synthetic Fed +25 bps scenario and Apex's rise in priority, with before/after rationale. Make unmistakably clear that the event is hypothetical, not a live Fed press release.
6. **10 seconds: Human control.** Show review/defer/dismiss; nothing is sent to the client autonomously.

**Optional chat segment only after verified repair:** Ask a genuinely unrehearsed client-prioritization question and show citations. If unstable, **do not live-demo chat**; don't let one failed request erase the credibility of the working core.

### Suggested seven-minute pitch arc (adjust with actual team deck)

- 0:00–0:45: RM job and costly missed/wrong connections.
- 0:45–1:30: Interview findings and external research, with clear evidence limitations.
- 1:30–2:15: Product promise, persona and Connect + Prioritize scope.
- 2:15–4:00: End-to-end Client Signals prototype, including a suppressed/verify contrast.
- 4:00–5:00: How it works, bank integration boundaries, governance and trust.
- 5:00–5:50: Expected impact and proposed pilot metrics (no invented outcomes).
- 5:50–7:00: MVP rollout, tradeoffs, one clear takeaway.

### Likely judge questions

- "How is this different from a CRM alert or a generic AI assistant?" Evidence-linked client relevance, suppression, uncertainty, and workflow-specific priority.
- "What if the AI is wrong?" Inspect original notes and event, deterministic hard gates, RM approval, verification state, audit trail, fail-closed when uncertain.
- "How do you access BNP data?" This prototype **does not**. Synthetic adapters demonstrate a possible integration pattern; deployment needs actual approvals, entitlements, governance, and security.
- "Where does live news come from?" The current demo uses simulated/curated events; live feed integration is not established or claimed.
- "Why three alerts?" Three is the maximum initial view, not a required minimum; suppress low-quality signals and permit zero.
- "What does AI really do?" Be precise: the desired role is extracting/connecting authorized client notes to developments. Do **not** claim working Gemini functionality until proven.
- "Does the Fed shock necessarily increase this client's borrowing cost?" Only if the debt terms create actual rate pass-through; the scenario simplifies those assumptions.

---

## 11. Success metrics and validation plan

**None of these are measured outcomes from this prototype. They are proposed pilot metrics.** Do not invent effectiveness percentages or ROI.

| Layer | Proposed metric | Why it matters |
| --- | --- | --- |
| Quality | RM-rated relevance/precision of surfaced opportunities | Avoid alert overload and generic matches. |
| Safety | Unsupported or wrongly surfaced opportunity rate | Tests whether the tool protects banker/client trust. |
| Suppression quality | Share of intentionally excluded candidates correctly withheld, and false suppression review rate | Prevents both noise and missed valuable opportunities. |
| Time | Time from relevant development to evidence-backed RM decision | Direct fit to Connect + Prioritize. |
| Adoption | Share of target RM morning reviews initiated from the workbench | Measures workflow change rather than feature clicks. |
| Downstream | Share of banker-approved signals that lead to a useful client conversation | Connects insights to relationship activity, subject to delayed measurement. |
| Trust | Evidence inspection and override/verification reasons | Shows how users challenge the system. |

**Interview and user-test status:** The team planned outreach to RMs and prepared simple questions, but this document cannot verify completed interviews or validated outcomes. Keep real participant feedback in a separate research log with exact quotes, date, role, and consent context; do not paste confidential client information into the prototype.

Five useful RM questions:

1. How many relationships do you cover, and how do you decide whom to contact each day?
2. Think of a recent market development that affected a client. How did you connect the news to the client and decide to reach out?
3. Where do you find past client priorities and relevant internal research, and how often is that information outdated?
4. What would make you distrust or reject an automated suggested outreach opportunity?
5. If you had 15 minutes to review your portfolio, what evidence and controls would this tool need to make your decisions easier?

---

## 12. Source-code transfer and collaboration instructions

### First: preserve the export

- Save the **AI Studio exported ZIP** in a shared location with a recognizable filename, such as `CLIENT_SIGNALS_SOURCE_2026-11-11.zip`.
- Do not overwrite it when testing fixes.
- If using GitHub, create a **private repo** and commit the exported source with a date/version tag before any changes.
- Do not commit `.env` files, API keys, Google session tokens, or live bank/client information.
- Download/export version history is not a substitute for an independently recoverable source backup.

### Next: verify the runtime from code

1. Extract ZIP locally and read `README`, `package.json` (if present), and any build/deployment configuration.
2. Install using the actual dependency manager and commands defined by the project; **do not assume** the app runs with `npm run dev` until scripts are checked.
3. Locate frontend chat code, backend endpoints, Vite/proxy/hosting config, Gemini API invocation, data fixtures, and secrets-handling example.
4. Create your own local `.env` from documented environment-variable names; never include secret *values* in the handoff or repo.
5. Test baseline UI before making changes.
6. Give each teammate a branch; merge only after a reproducible test, not just an AI Studio "fixed" message.
7. If sharing the AI Studio project, verify whether collaborators have viewer, Remix, or editor rights; **do not assume** app sharing enables simultaneous source-code editing.

### Suggested roles for a short competition sprint (proposals, not assigned)

- **Technical owner:** Audit/export repository, isolate chat endpoint, validate true Gemini inference, keep a working demo fallback.
- **Product/UX owner:** Ensure exact RM flow, readable evidence, precise financial claims, conditional alternative actions, visual consistency, and design slides.
- **Research/pitch owner:** RM interviews, cited external sources, impact metrics with caveats, slides, narration and Q&A.
- **One person integrates:** Own final deck permissions, 7-minute rehearsal, deadline and immutable submission snapshot.

### Recommended task sequencing

**Pass 1, preserve demo integrity:** Run the 90–120-second deterministic demo and save a working screen recording. Verify Reset Demo.  
**Pass 2, P0 chat repair:** Inspect the actual source, fix HTML/JSON route, prove three live requests.  
**Pass 3, credibility audit:** Fix Atlas FX copy, confirm Apex borrowing assumptions, source labels and updated-state behavior.  
**Pass 4, pitch:** Finalize deck, rehearse full seven-minute talk, prepare backup screenshots/video, test links in a separate browser/account, submit before cutoff.

**Stop rule:** If chat repair threatens the stable demo, freeze chat development for the competition and emphasize the trustworthy Connect + Prioritize flow. Describe AI implementation truthfully rather than pretending full dynamic chat works.

---

## 13. Primary references and historical source files

### Current authoritative materials

- `NYU PMC x BNP Paribas Case Prompt - Fall 2026.pdf` — official rules, objectives, timing, submission, judging.
- `Ram_Mode_RM_Connect_Prioritize_AI_Studio_Master_Build_Prompt.md` — final User #1 / Connect + Prioritize product direction; **aspirational specification, not implementation proof**.
- `implementation_plan.md` — AI Studio initial implementation plan; **plan, not source-code verification**.
- November 11 screenshots and recorded app walkthroughs — evidence for actual UI, simulation, error messages, and observed DevTools failure.
- Exported Client Signals source ZIP — **to be attached by the team; missing from this handoff authoring session**.

### Historical/background only; do not silently revert decisions

- `Open_Decisions_Google_AI_Studio_Build_Brief.md` — earlier inherited-book proposal with different persona and fixtures.
- `Open_Decisions_User_Research_AI_Studio_Addendum.md` — earlier research prompts based on three articles.

### Secondary industry readings (context, not BNP-specific validation)

- ABA Banking Journal, "Sales enablement through CRM: Lifting performance to new heights" (2024): https://bankingjournal.aba.com/2024/05/sales-enablement-through-crm-lifting-performance-to-new-heights/
- McKinsey, "Agentic AI is here: Is your bank's frontline team ready?": https://www.mckinsey.com/industries/financial-services/our-insights/agentic-ai-is-here-is-your-banks-frontline-team-ready
- BCG, "From Commercial Relationship Manager to Client Whisperer": https://www.bcg.com/publications/2021/from-commercial-relationship-manager-to-client-whisperer

These sources support research hypotheses concerning data fragmentation, trusted evidence, workflow fit, and banker adoption. They do not establish how BNP's internal CRM, permissions, or coverage teams are actually configured. Avoid claiming otherwise.

---

## 14. Open decisions / required confirmations

| Question | Owner / next step |
| --- | --- |
| Is the source ZIP in a location all teammates can access? | Project owner: share it and confirm file integrity. |
| Where exactly does `chat` route and what serves the HTML fallback? | Technical owner: inspect frontend URL, backend handler, proxy and hosting. |
| Is there a working Gemini call at all? Which model/key/project and what quotas apply? | Technical owner: verify actual server-side request and logs without revealing secrets. |
| What is the canonical current fixture schema and identity for all five clients? | Technical owner: audit exported code and align demo copy. |
| Are any market/news feeds genuinely live? | Technical owner: inspect adapters; label 'simulated' if not. |
| What assumptions justify Atlas and Apex dollar-impact figures? | Product/technical owners: document input rates, debt reset, timing, hedge share. |
| Have any RM interviews been completed? What were the actual findings? | Research owner: attach original notes and distinguish findings from hypotheses. |
| Will the team live-demo the chat? | Demo owner: yes only after repeated end-to-end reliability testing; otherwise freeze. |
| Is the final deck accessible and ready by Nov 12 at 11:59 PM EST? | Deck/submission owner: confirm permissions and submission snapshot. |

### Handoff completion standard

A teammate who receives **this Markdown plus the ZIP** should be able to (1) understand the official case and selected persona, (2) run or inspect the app, (3) reproduce the critical chat failure, (4) preserve the working demo, (5) repair and test the correct issue, and (6) present the solution without overstating what is live, secure, or validated.

**Version note:** Prepared from official brief, product specification, implementation plan, observed screenshots, recordings, and user testing as available on November 11, 2026. **No source ZIP audit was performed because the exported source was not supplied to this conversation.** Update this file with actual code paths, fixes, test output, and commit identifiers when the source is shared.
