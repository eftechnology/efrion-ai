# EFRION AI Autopilot — Release History

---

## v2.2 — Silent Mode & Accessibility Fix (2026-03-16)

### New Features
- **Silent mode toggle**: speaker button in HUD mutes all AI audio output; icon switches between speaker/muted states with visual indicator
- Backend-aware silence: `silent_mode` flag tracked per-session on the server; audio chunks from Gemini are dropped server-side when muted (not just suppressed in the browser)

### Improvements
- **`set_plan` silent tool**: replaced fragile text-based `PLAN:` parsing with a proper function call — AI calls `set_plan(steps=[...])` silently, HUD updates without any spoken announcement
- System prompt updated: AI no longer narrates each step during execution; speaks only a brief summary after all steps complete
- **Accessibility tree label fix**: heading siblings (`<h3>`, `<h2>`, etc.) are no longer used as labels for adjacent buttons/links — buttons now always report their own text (e.g. `"+ Add Employee"` instead of `"Employee Directory"`)

---

## v2.1 — Conversation History & Plan Window (2026-03-16)

### New Features
- Conversation history panel infrastructure (`#erp-ai-chat-panel`) — built, hidden pending UX polish
- Chat panel accumulates full session message history (user, AI, system) with chat-bubble UI

### Improvements
- **Plan window now works end-to-end**: plan parsing moved from partial transcription chunks to full `turn_complete` buffer — eliminates garbage steps from mid-sentence detection
- Plan step parser handles both numbered lists (`1. Step 2. Step`) and comma-separated formats
- `activeIndex` now advances automatically after each tool call completes
- Plan panel shows **✓ Done** badge when all steps complete, then auto-fades and hides after 3 seconds
- HUD `overflow: hidden` replaced with `overflow: visible` + `position: relative` — fixes absolutely-positioned panels being clipped

---

## v2.0 — HUD Redesign (2026-03-16)

### New Features
- Full HUD UI/UX overhaul with glassmorphism design (backdrop blur, border glow, translucent layers)
- Draggable HUD pill (drag anywhere on screen)
- HUD miniaturization — collapses to a 32×32 circle with status ring color, auto-expands on activity
- State-aware animated equalizer bars for volume visualization
- Smooth state transitions with cross-fade animations (`erp-slide-up`, `erp-fade-in`, `erp-text-shimmer`)
- Error state with pulsing red indicator and retry button
- TASKS.md added with full project analysis and improvement backlog

---

## v1.9 — EFRION Website & Demo (2026-03-16)

### New Features
- EFRION AI Autopilot promotional website built in Next.js
- Gated demo access flow with login and request-access UI
- Comprehensive autopilot test scenarios added to `test_erp.html`
- Logo updated (EF initials, connector line fixes)

---

## v1.7 — Semantic Enrichment & Self-Correction (2026-03-16)

*Stable release — documented in ROADMAP.md*

### New Features
- **AI Undo System**: voice command (`"undo"`, `"go back"`) or keyboard trigger reverts last action; supports `type_text` restore and `click_element` back-navigation
- **Advanced Target Highlighting**: animated SVG pointer with ghost cursor effect for pre-action confirmation
- **Direct In-Page Activation**: two-step HUD flow, direct activation without popup
- Expanded ERP test lab with multi-tab, multi-form scenarios

### Improvements
- Interaction protocol refined for faster action-response cycles

---

## v1.6 — Dead-End Detection & Form Intelligence (2026-03-16)

*Documented in ROADMAP.md*

### New Features
- **Dead-End Detection**: state-based verification after each AI action; if UI doesn't change the AI receives automated feedback and self-corrects
- **Robust Form Label Detection**: multi-strategy label resolution (ARIA attributes, standard `<label>` elements, proximity analysis) for complex ERP forms

### Improvements
- `type_text` tool: enhanced to select dropdown options by visible text or internal value
- Safety lock enforcement hardened; `type_text` context improved

---

## v1.5 — Performance & Cross-Page Persistence (2026-03-16)

*First ROADMAP-tracked release*

### New Features
- **Cross-Page Persistence**: full plan and session state recovery across page reloads and navigations (stored in background service worker)
- **Advanced DOM Diffing**: detects spatial element movement and `<select>` option changes in addition to add/remove events

### Improvements
- Event-driven DOM syncing with debounced mutation observer — near-instant UI updates
- AI latency drastically reduced via tighter capture intervals and action-completion sync

---

## v1.0 — Architecture Overhaul (2026-03-16)

### New Features
- **Shadow DOM HUD**: isolated rendering context prevents style conflicts with host page
- **Stable Element IDs** (`data-gemini-id`): persistent accessibility tree IDs survive DOM re-renders
- **Multi-Step Planning Protocol**: AI announces `PLAN:` before acting; HUD displays step-by-step plan
- **Safety Lock** (optional): intercepts critical actions (`click_element`, `type_text`, `navigate_to`), requires verbal or button confirmation before executing
- Backend persistence: `asyncio.Queue` decouples audio/video/text dispatch; session recovers across tab reloads
- Transcription forwarding: user and model speech transcribed and shown in HUD transcript area
- Closed-loop feedback: extension reports action success/failure back to AI via `status` messages

### Fixes
- Resolved protocol deadlocks (Error 1008) with turn-aware state management
- Confirmation loop fix with explicit status tracking
- `show_confirm_ui` / `hide_confirm_ui` command flow stabilized

---

## v0.2 — Audio, Tools & Stability Sprint (2026-03-15)

### New Features
- **Push-to-Talk**: hold mouse button or Alt key to activate microphone
- **AudioWorklet recording**: 16kHz PCM audio pipeline (fell back to ScriptProcessorNode for extension sandbox compatibility)
- **Gemini model upgrade**: `gemini-2.5-flash-native-audio-preview-12-2025`
- `navigate_to` tool: AI can switch between ERP modules via URL
- `read_text` tool: AI can extract visible page text for data-driven decisions
- `.env` support for `GEMINI_API_KEY`
- Visual diffing: skip sending unchanged screenshots to reduce token usage
- `Confirm Action` button and flow for safety-critical operations

### Fixes
- WebSocket 1007 errors (audio encoding, PCM mime type)
- Base64 encoding robustness for audio and image data
- `Extension context invalidated` graceful cleanup
- Content script persistence across navigations
- Post-speech cooldown to reduce AI chattiness
- `asyncio` task management and busy loop elimination
- Correct Gemini API `send_realtime_input` argument splitting

---

## v0.1 — Initial Prototype (2026-03-02)

### Features
- Chrome extension with FastAPI/WebSocket backend
- Gemini Live API integration (audio I/O + function calling)
- In-page HUD with start/stop controls
- DOM mutation observer for accessibility tree transmission
- Accessibility tree with interactive element IDs for AI tool use
- `click_element`, `type_text`, `scroll_page` tools
- `uv` package manager setup
- Basic `test_erp.html` demo page
