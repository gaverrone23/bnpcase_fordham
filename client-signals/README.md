<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/da942925-ddca-45e5-adb9-13983e8ad265

## Run Locally

**Prerequisites:** Node.js 24


1. Install dependencies:
   `npm install --legacy-peer-deps --package-lock=false`
2. No API key is needed for the deterministic demo. Chat and AI refresh are unavailable in the primary demo; their implementation is retained for later integration. The backend reads exported variables or `.env`, not `.env.local`.
3. Run the app:
   `npm run dev`

`npm run dev` starts Express and Vite together on port 3000. Select All to inspect each client, or use Demo Controls to simulate an event and Reset Demo to restore the seeded portfolio. All records and events are synthetic; nothing is sent to clients.

Validation: `npm test`, `npm run lint` (type checking), `npm run build`. In the cloud browser-testing environment with Playwright and Chromium supplied, run `node tests/browser.cjs` against the running development server. Screenshots default to `/tmp/client-signals-screenshots`; `SCREENSHOT_DIR` overrides this.
