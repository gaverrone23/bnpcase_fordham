# Client Signals | AI-Assisted Corporate Banking Prototype

A prototype designed for corporate relationship managers who need to turn market developments and client context into better-prioritized conversations.

**Created for:** NYU Product Management Club x BNP Paribas *Banking Reimagined* case competition (2026).
**Project:** Team-developed student competition concept, not an official BNP Paribas product or endorsed implementation.
**Status:** Interactive prototype. The original project handoff documents a chat integration problem; live generative-AI behavior should not be presented as verified until retested.

## The business problem

Relationship managers cover multiple clients and must decide which news, market movements, and client events deserve attention. Reviewing isolated research and CRM notes manually makes it harder to distinguish actionable opportunities from weak or incomplete signals.

## What the prototype demonstrates

- **Connect:** Link a market development to relevant client profiles and documented circumstances.
- **Prioritize:** Surface the client conversations most worth reviewing, with a reason for the ranking.
- **Inspect evidence:** Let the banker review the source context, assumptions, and competing signals.
- **Human judgment:** Preserve the relationship manager's decision about whether to act; no autonomous client contact.
- **Uncertainty management:** Mark incomplete or conflicting information for verification rather than disguising it as a recommendation.

## My contribution

I helped develop the product concept and competition presentation, specifying the relationship-manager workflow, prioritization logic, evidence requirements, and human review experience. I used AI-assisted prototyping to translate the product requirements into an interactive demonstration with the team.

This project involved team contributions. The repository does not claim sole authorship of the competition work or independently verified production results.

## Technology

- React and TypeScript for the interface
- Vite for local development
- Express and Node.js for the prototype server
- Google Generative AI SDK for the proposed assistant integration
- Synthetic client profiles, CRM notes, and market-event fixtures

**Data disclaimer:** The prototype uses fictional/synthetic examples and simulated banking workflows. It is not connected to BNP Paribas systems, customer records, live market feeds, or an actual CRM.

## Run locally

Install Node.js and npm, then:

```bash
npm install
npm run dev
```

The client application is in this `client-signals` directory. If configuring the optional Gemini integration, supply `GEMINI_API_KEY` through a local environment file that is excluded from Git, never in browser-facing code or the repository.

## Technical and product limitations

- The AI chat integration is not represented here as fully verified or production-ready.
- Recommendations and outcomes are illustrations based on synthetic fixtures, not real client performance.
- No regulatory, compliance, security, or banking production approval is implied.
- Real deployment would require authorized data access, user permissions, auditability, live integration testing, and stronger controls.

## Public portfolio release

This is the **private working repository**. It contains original team/competition handoff material and assets that should be reviewed separately before any public release. Do not change this repository to public without permission and a source/history audit.

A separate public portfolio edition should include only: this sanitized overview, original approved screenshots, safe sample/demo code or a demonstration link, appropriate team/competition attribution, and an explanation of what is and is not functional.

No external competition documents, teammate details, or internal handoff materials should be copied into that public edition without review.
