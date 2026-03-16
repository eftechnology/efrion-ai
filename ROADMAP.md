# EFRION AI Autopilot — Roadmap

> Current version: **v2.2** · Last updated: 2026-03-16

---

## ✅ Completed

### Core Architecture
- [x] Chrome extension + FastAPI/WebSocket backend
- [x] Gemini Live API integration (audio I/O + function calling) — `gemini-2.5-flash-native-audio-preview-12-2025`
- [x] Shadow DOM HUD — isolated rendering, no style conflicts with host page
- [x] Stable element IDs (`data-gemini-id`) — survive DOM re-renders
- [x] `asyncio.Queue` decoupling — audio/video/text dispatchers run concurrently
- [x] `.env` support for `GEMINI_API_KEY`
- [x] `uv` package manager setup

### AI Tools
- [x] `click_element` — click by accessibility tree ID
- [x] `type_text` — fill inputs and select dropdown options by visible text or value
- [x] `scroll_page` — scroll up/down
- [x] `navigate_to` — switch between ERP modules by URL
- [x] `read_text` — extract visible page text for data-driven decisions
- [x] `undo_last_action` — revert last action (restores text or navigates back)
- [x] `highlight_element` — animated SVG ghost cursor pre-action confirmation (safety lock mode)
- [x] `set_plan` — silent function call to display plan in HUD without speaking steps aloud

### Accessibility Tree
- [x] DOM mutation observer — event-driven syncing with debounce
- [x] Advanced DOM diffing — detects spatial movement, select option changes, add/remove
- [x] Multi-strategy label detection — ARIA attributes, `<label>`, `for`, proximity, placeholder, title, innerText
- [x] Fixed: heading siblings no longer used as button labels (v2.2)
- [x] Viewport-only tree — only sends interactive elements visible in current viewport

### Audio Pipeline
- [x] Push-to-Talk — hold mouse button or Alt key to record
- [x] 16kHz PCM audio pipeline via ScriptProcessorNode (AudioWorklet fallback attempted)
- [x] Real-time input/output transcription (`AudioTranscriptionConfig`)
- [x] Post-speech cooldown to reduce AI chattiness
- [x] Visual diffing — skip sending unchanged screenshots to reduce token usage

### HUD & UX
- [x] In-page HUD injection via extension icon click
- [x] Two-step direct activation (no popup required)
- [x] Glassmorphism design — backdrop blur, border glow, translucent layers
- [x] Draggable HUD pill — drag anywhere on screen
- [x] HUD miniaturization — collapses to 32×32 circle, auto-expands on activity
- [x] State-aware animated equalizer bars (idle / listening / speaking)
- [x] Smooth state transitions (`erp-slide-up`, `erp-fade-in`, `erp-text-shimmer`)
- [x] Error state — pulsing red indicator + retry button
- [x] Silent mode toggle — mute button suppresses AI audio locally and server-side
- [x] Transcript area — shows latest user/AI message with auto-fade

### Plan Window
- [x] `set_plan` tool sets plan silently via function call (no verbal announcement)
- [x] Plan fallback parser at `turn_complete` — handles numbered and comma-separated formats
- [x] `activeIndex` auto-advances after each successful tool action
- [x] ✓ Done badge when all steps complete, auto-fades after 3 seconds
- [x] Cross-page persistence — plan restored from background service worker on navigation

### Safety & Reliability
- [x] Optional Safety Lock — intercepts critical actions, requires verbal or button confirmation
- [x] Dead-end detection — detects when an action produced no UI change and feeds back to AI
- [x] Closed-loop feedback — extension reports action success/failure back via `status` messages
- [x] AI undo system — voice trigger (`"undo"`, `"go back"`) reverts last action
- [x] Protocol deadlock fix (Error 1008) — turn-aware state management
- [x] Content script persistence across navigations

### Conversation History
- [x] Chat panel infrastructure built (`#erp-ai-chat-panel`) — chat-bubble UI, scrollable, per-session history
- [x] Hidden pending UX polish (button is `display: none`)

### Demo & Website
- [x] `efrion_erp.html` — comprehensive test ERP with Employees, Orders, Reports, modals, toasts
- [x] EFRION promo website (Next.js) — Hero, Features, Architecture, Demo Scenarios
- [x] Gated demo access — login + request-access flow, persisted to `data/access-requests.json`
- [x] RELEASE.md — full release history from v0.1 to v2.2

---

## 🔴 Critical — Security & Correctness

- [ ] **Validate API key on startup** — `os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")` silently accepts placeholder; raise `ValueError` if missing or equals placeholder
- [ ] **Restrict CORS** — `allow_origins=["*"]` allows any site to call the local backend; change to `chrome-extension://<id>` or `localhost` only
- [ ] **Fix `type_text` event coverage** — only fires `input` + `change`; React/Vue/Angular controlled inputs also need `focus`, `keydown`, `keyup`, `blur`

---

## 🟠 High Priority — Reliability

- [ ] **Improve dead-end detection** — 800 ms timeout too short for async-rendered pages; use accessibility tree diff instead of full JSON stringify; make timeout configurable (default 1200 ms)
- [ ] **Retry on tool failure** — after dead-end, scroll element into view and retry once before reporting failure to user
- [ ] **Error recovery UI** — replace `alert()` on API/network errors with in-HUD error state + "Reconnect" button
- [ ] **Microphone permission error handling** — on denial, show in-HUD "Retry Microphone" button instead of silently stopping

---

## 🟡 Medium Priority — Code Quality

- [ ] **Extract constants** — magic numbers (`300` debounce, `800` dead-end timeout, `50` JPEG quality, `16000` sample rate) scattered inline; add `CONFIG` object at top of each file
- [ ] **Split `content.js` into ES modules** — 1000+ line file mixes HUD, audio, DOM, automation, undo; split into `hud.js`, `audio.js`, `dom.js`, `automation.js`, `history.js`
- [ ] **Structured backend logging** — replace `print()` with Python `logging` module (`DEBUG`/`INFO`/`WARNING`/`ERROR`)
- [ ] **Make hardcoded values configurable** — WebSocket URL, model name, JPEG quality hardcoded; move to `.env` / `chrome.storage`

---

## 🟢 Feature Gaps — New Capabilities

- [ ] **Conversation history panel UX polish** — unhide chat button, fix panel positioning relative to plan panel, size/scroll refinements (infrastructure already complete)
- [ ] **iframe support** — accessibility tree only reads main document; traverse same-origin iframes and merge trees with frame-prefixed IDs
- [ ] **File input handling** — detect `<input type="file">`, pause automation, prompt user to handle manually
- [ ] **Multi-tab session isolation** — all tabs share one WebSocket; key sessions by `tabId`
- [ ] **Persist to `chrome.storage.local`** — action history and plan state lost on browser crash; serialize on every update
- [ ] **Adaptive screenshot quality** — fixed at 50% JPEG; increase to 70% on pages where AI reported label-recognition failure
- [ ] **Rate limiting between tool calls** — enforce minimum 300 ms gap between actions on slow pages
- [ ] **Localize safety lock affirmations** — confirmation words (`"yes"`, `"proceed"`) are English-only; load from locale file via `AUTOPILOT_LANGUAGE` env var
- [ ] **OCR fallback** — use Gemini vision to identify icon-only buttons and canvas-based UI elements lacking semantic HTML
- [ ] **Branching plan logic** — AI suggests alternative plans if page state contradicts initial assumptions
- [ ] **Cancel mid-plan** — voice command to abort remaining steps in a running plan

---

## 🔵 Testing

- [ ] **Unit tests for `findLabelForElement`** — 7-strategy label detection is most critical logic, zero test coverage; write Jest tests for each strategy
- [ ] **Integration tests for WebSocket protocol** — mock WebSocket server, assert message shapes for each tool call type
- [ ] **E2E tests with Playwright** — load `test_erp.html` with extension loaded, assert voice-triggered workflows complete correctly

---

## 🚀 Demo & Deployment

- [ ] **Record hackathon demo video** — key scenes: ghost cursor execution, barge-in interruption, undo; upload to YouTube, embed on promo site
- [ ] **Deploy promo website to Vercel** — set `DEMO_USERNAME`, `DEMO_PASSWORD`, `SESSION_TOKEN` as Vercel env vars
- [ ] **Request-access email notification** — integrate Resend to email new access requests to admin (local JSON file breaks on Vercel serverless)

---

## 📋 Long-Term Backlog

- [ ] Pre-built workflow templates for SAP, Oracle, NetSuite, Odoo
- [ ] Multi-language audio support with accent-aware recognition
- [ ] Audit log — persist all AI actions with timestamps to `chrome.storage.local`
- [ ] Docker container for backend deployment
- [ ] CI/CD pipeline (GitHub Actions: lint → test → build)
- [ ] Error tracking integration (Sentry)
