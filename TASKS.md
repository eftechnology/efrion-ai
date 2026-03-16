# EFRION AI Autopilot — Task Board

> Generated from project analysis · Last updated: 2026-03-16
> Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## 🔴 Critical — Security & Correctness

- [ ] **Fix API key fallback** (`backend/main.py:15`)
  `os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")` silently accepts a placeholder.
  → Raise a loud `ValueError` if the key is missing or equals the placeholder string.

- [ ] **Restrict CORS to extension origin** (`backend/main.py:22`)
  `allow_origins=["*"]` allows any website to call the local backend.
  → Change to `allow_origins=["chrome-extension://*"]` or the specific extension ID.

- [ ] **Fix `type_text` event coverage** (`extension/content.js:854`)
  Only `input` and `change` events are fired. React, Angular, and Vue controlled inputs also need `focus`, `keydown`, `keyup`, `blur`.
  → Dispatch the full set of events after setting the value.

---

## 🟠 High Priority — Reliability

- [ ] **Improve dead-end detection** (`extension/content.js:813`)
  800 ms timeout is too short for async-rendered pages. Also uses expensive full JSON stringify for comparison.
  → Use the existing accessibility tree diff instead of `JSON.stringify`. Add a configurable timeout (default 1200 ms).

- [ ] **Add retry logic on tool failure**
  If a click or type reports no state change, the AI simply tells the user. No automatic retry.
  → After dead-end detection, attempt to scroll the element into view and retry once before reporting failure.

- [ ] **Fix plan detection parsing** (`backend/main.py:349`)
  Splits on `"PLAN:"` and replaces `.` with `,` to extract steps — breaks if the AI uses those characters naturally.
  → Use Gemini structured output (JSON) for plan steps instead of string parsing.

- [ ] **Improve microphone permission error handling** (`extension/content.js:694`)
  On permission denial, session stops with a single console error and no recovery path.
  → Show an in-HUD error state with a "Retry Microphone" button.

- [ ] **Add error recovery UI**
  Gemini API errors and network failures currently trigger `alert()` then stop the session.
  → Replace with an in-HUD error state showing the error message and a "Reconnect" button.

---

## 🟡 Medium Priority — Code Quality

- [ ] **Extract magic numbers into constants** (`extension/content.js`, `backend/main.py`)
  Values like `300` (debounce ms), `800` (dead-end timeout), `1500` (screenshot interval), `50` (JPEG quality), `16000` (sample rate) are scattered inline.
  → Add a `CONFIG` object at the top of each file with named, documented constants.

- [ ] **Split `content.js` into ES modules**
  At 1 036 lines, the single file mixes HUD rendering, audio pipeline, DOM analysis, UI automation, and undo logic.
  → Split into: `hud.js`, `audio.js`, `dom.js`, `automation.js`, `history.js` — import via `manifest.json` content scripts array.

- [ ] **Replace `print()` with structured logging** (`backend/main.py`)
  All backend output uses `print()`. No log levels, no filtering.
  → Use Python's `logging` module with `DEBUG`/`INFO`/`WARNING`/`ERROR` levels.

- [ ] **Make hardcoded values configurable**
  WebSocket URL (`ws://localhost:8000/ws`), model name (`gemini-2.5-flash-…`), and screenshot JPEG quality are all hardcoded.
  → Move to `.env` / `chrome.storage` so they can be changed without touching source code.

- [ ] **Replace status string literals with constants** (`extension/content.js:300`)
  `updateHUD('offline')`, `updateHUD('idle')`, etc. — typos create silent bugs.
  → Define a `HUD_STATUS` enum/object at the top of the file.

- [ ] **Add JSDoc comments to public functions**
  Key functions (`getSimplifiedAccessibilityTree`, `simulateClickWithGhostCursor`, `captureAndSend`) have no parameter or return type documentation.

---

## 🟢 Feature Gaps — New Capabilities

- [ ] **Add iframe support** (`extension/content.js:604`)
  `getSimplifiedAccessibilityTree()` only reads the main document. Many ERP systems embed content in iframes.
  → Traverse same-origin iframes and merge their accessibility trees with a frame prefix on IDs.

- [ ] **Handle `<input type="file">` fields**
  File upload inputs cannot be automated. Attempting to click them does nothing useful.
  → Detect file inputs before clicking, pause automation, and prompt the user to handle manually.

- [ ] **Add multi-tab session isolation** (`extension/background.js`)
  All tabs share one WebSocket session. Opening the ERP in two tabs causes conflicts.
  → Key sessions by `tabId`; each tab manages its own independent WebSocket connection.

- [ ] **Persist session to `chrome.storage.local`**
  Action history and plan state live only in memory. A browser crash resets everything.
  → Serialize `actionHistory` and `currentPlan` to `chrome.storage.local` on every update.

- [ ] **Add adaptive screenshot quality**
  JPEG quality is fixed at 50%. For dense-text pages this can be too low for the AI to read field labels.
  → Increase quality to 70% on pages where the previous action reported a label-recognition failure.

- [ ] **Add rate limiting between tool calls**
  Gemini can fire consecutive tool calls with no delay. On slow pages, actions pile up.
  → Enforce a minimum 300 ms gap between automated actions before sending the next tool result.

- [ ] **Localize safety lock affirmations** (`backend/main.py:329`)
  Voice confirmation words (`"proceed"`, `"yes"`, `"go ahead"`) are English-only.
  → Accept an `AUTOPILOT_LANGUAGE` env var and load the affirmations list from a locale file.

- [ ] **HUD miniaturize / collapse mode**
  The HUD covers ERP content and cannot be minimized while active.
  → Add a collapse button that shrinks the HUD to a small status dot while keeping the session running.

---

## 🔵 Testing — Coverage

- [ ] **Unit tests for `findLabelForElement`** (`extension/content.js:564`)
  The 7-strategy label detection is the most critical logic and has zero test coverage.
  → Write Jest tests covering each strategy (ARIA, `for` attribute, proximity, placeholder, etc.).

- [ ] **Integration tests for WebSocket message protocol**
  No tests verify that the extension correctly formats messages the backend expects.
  → Mock the WebSocket server and assert message shapes for each tool call type.

- [ ] **E2E test using `test_erp.html`**
  Manual testing only. Regressions are caught late.
  → Use Playwright to load `test_erp.html` with the extension and assert that voice-triggered workflows complete correctly.

---

## 🚀 Demo & Deployment

- [x] **Expand `test_erp.html` with comprehensive test scenarios**
  Added Purchase Orders wizard, Employees directory, Reports accordion, counter widget, modal dialogs, toast notifications.

- [x] **Build promo website (Next.js)**
  Sections: Hero, How It Works, Features, Architecture, Demo Scenarios, Tech Stack, Footer.

- [x] **Add gated demo access (login + request-access flow)**
  `/request-access` form → persisted to `data/access-requests.json` → manual credential issue → `/login` → `/demo`.

- [ ] **Record the hackathon demo video**
  Script is in `NOTES.md`. Key scenes: ghost cursor execution, barge-in interruption, undo.
  → Record in a single unedited take. Upload to YouTube. Embed on promo website.

- [ ] **Deploy promo website to Vercel**
  Set `DEMO_USERNAME`, `DEMO_PASSWORD`, `SESSION_TOKEN` as Vercel environment variables.
  → `cd website && vercel --prod`

- [ ] **Wire up request-access email notification**
  Currently requests are only saved to a local JSON file (breaks on Vercel serverless).
  → Integrate Resend (or similar) to email `data/access-requests.json` entries to the admin on submission.

---

## 📋 Backlog — Long Term

- [ ] Pre-built workflow templates for SAP, Oracle, NetSuite, Odoo
- [ ] Multi-language audio support (accent-aware STT)
- [ ] OCR fallback for icon-only buttons and canvas-based UI
- [ ] Branching plan logic when discovered page state contradicts assumptions
- [ ] Audit log: persist all AI actions with timestamps to `chrome.storage.local`
- [ ] Error tracking integration (Sentry)
- [ ] Docker container for backend deployment
- [ ] CI/CD pipeline (GitHub Actions: lint → test → build)
