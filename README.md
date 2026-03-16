# EFRION AI Autopilot

> **Just speak. It works.**

A Chrome extension that turns voice commands into autonomous ERP actions — powered by the Gemini Live API. Click, type, navigate, and fill forms hands-free on any web-based ERP system.

Built for the **Gemini Live Agent Challenge**.

---

## How It Works

```
You speak  →  Gemini hears + sees your screen  →  AI clicks, types, navigates  →  Task done
```

1. Click the extension icon to inject the HUD into any ERP page
2. Hold **Alt** (or mouse button) to speak a command
3. The AI plans the task, shows it in the HUD, and executes step by step
4. Watch the ghost cursor complete the workflow autonomously

---

## Features

- **Voice-driven automation** — natural language commands, no training required
- **Real-time screen analysis** — screenshot + semantic accessibility tree sent on every DOM change
- **Multi-step plan window** — AI calls `set_plan()` silently; HUD shows step-by-step progress
- **Closed-loop feedback** — every action reports success/failure back to the AI for self-correction
- **Dead-end detection** — if a click changes nothing, AI retries with a different strategy
- **AI Undo** — say "go back" or "undo" to revert the last action
- **Ghost cursor preview** — animated SVG cursor shows where the AI is about to click
- **Safety lock** — optional confirmation gate before any critical action
- **Silent mode** — mute AI audio while keeping automation running
- **Barge-in / interruption** — speak at any time to redirect the AI mid-task
- **Cross-page persistence** — plan and session state survive page navigations
- **Glassmorphism HUD** — draggable, collapsible overlay with animated equalizer

---

## Architecture

```
┌─────────────────────┐     WebSocket (ws://)     ┌──────────────────────┐
│   Chrome Extension  │ ◄────────────────────────► │   FastAPI Backend    │
│                     │   audio / screenshot / DOM  │                      │
│  content.js         │                             │  main.py             │
│  background.js      │                             │  asyncio queues      │
│  Shadow DOM HUD     │                             │  function calling    │
└─────────────────────┘                             └──────────┬───────────┘
                                                               │
                                                    Gemini Live API
                                                    gemini-2.5-flash-
                                                    native-audio-preview
```

**Extension** — injects a Shadow DOM HUD, builds a semantic accessibility tree from the live DOM, captures screenshots, records audio via Push-to-Talk, and executes AI tool calls (click, type, navigate).

**Backend** — bridges the extension and Gemini Live API over WebSocket. Manages per-session state, dispatches audio/video/text concurrently via `asyncio.Queue`, handles function calling, and advances the plan on each completed action.

**Gemini Live API** — processes real-time audio + vision simultaneously, responds with native audio, and issues structured function calls to control the browser.

---

## Project Structure

```
efrion-ai/
├── extension/               # Chrome Extension (Manifest V3)
│   ├── content.js           # HUD, accessibility tree, DOM automation
│   ├── background.js        # WebSocket connection, message routing
│   ├── manifest.json
│   ├── popup.html / popup.js
│   └── recorder-worklet.js  # 16kHz PCM audio pipeline
├── backend/
│   ├── main.py              # FastAPI + Gemini Live API bridge
│   ├── pyproject.toml       # uv dependencies
│   └── Dockerfile
├── website/                 # Next.js promo + demo site
│   ├── app/
│   │   ├── page.tsx         # Landing page
│   │   ├── login/           # Demo access login
│   │   ├── demo/            # Live demo page
│   │   └── request-access/  # Access request form
│   └── Dockerfile
├── efrion_erp.html          # Standalone ERP test page
├── docker-compose.yml       # Production deployment (Traefik + SSL)
├── .github/workflows/
│   └── deploy.yml           # Auto-deploy on push to master
├── RELEASE.md               # Full version history (v0.1 → v2.2)
└── ROADMAP.md               # Completed and upcoming features
```

---

## Local Development

### Prerequisites

- Python 3.10+ with [uv](https://docs.astral.sh/uv/)
- Node.js 18+ with [pnpm](https://pnpm.io/)
- Chrome or Chromium browser
- Gemini API key — [get one here](https://aistudio.google.com/apikey)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Add your GEMINI_API_KEY to .env

uv sync
uv run uvicorn main:app --reload
# Runs on http://localhost:8000
```

### 2. Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. The extension icon appears in the toolbar

### 3. Website (optional)

```bash
cd website
pnpm install
pnpm dev
# Runs on http://localhost:3000
```

### 4. Test ERP

Open `efrion_erp.html` directly in Chrome — it's a self-contained ERP demo page with Employees, Orders, Reports, and more. No server needed.

---

## Usage

1. Start the backend (`uv run uvicorn main:app`)
2. Open any web-based ERP (or `efrion_erp.html`)
3. Click the extension icon — the HUD appears on the page
4. Click **Start** in the HUD
5. Hold **Alt** and speak your command:
   - *"Add a new employee, John Smith, Engineering department"*
   - *"Create a purchase order for 50 units of Product A"*
   - *"Show me the sales report for this month"*
6. Watch the AI execute the task step by step

**Controls:**
| Action | How |
|---|---|
| Push to talk | Hold `Alt` or hold left mouse button |
| Undo last action | Say *"undo"* or *"go back"* |
| Mute AI audio | Click the speaker icon in the HUD |
| Minimize HUD | Click the `—` button |
| Drag HUD | Click and drag the pill |

---

## Production Deployment

### Requirements

- VPS with Docker + Docker Compose installed
- Domain with DNS A records pointing to the VPS:
  - `ai.efrion.com` → website
  - `ai-api.efrion.com` → backend

### Deploy

```bash
git clone <repo> /opt/efrion-ai
cd /opt/efrion-ai

cp .env.example .env
# Fill in all values in .env

docker compose up -d
```

Traefik automatically provisions Let's Encrypt TLS certificates and redirects HTTP → HTTPS.

### CI/CD

Push to `master` triggers automatic deployment via GitHub Actions. Add these secrets in **Settings → Secrets → Actions**:

| Secret | Description |
|---|---|
| `SSH_HOST` | VPS IP or hostname |
| `SSH_USER` | SSH username |
| `SSH_KEY` | Private SSH key |
| `SSH_PORT` | SSH port (default: 22) |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini API key from Google AI Studio |
| `ENABLE_SAFETY_LOCK` | No | `true` to require voice confirmation before critical actions (default: `false`) |
| `DEMO_USERNAME` | Website | Login username for demo access |
| `DEMO_PASSWORD` | Website | Login password for demo access |
| `SESSION_TOKEN` | Website | Secret for session signing |
| `ACME_EMAIL` | Production | Email for Let's Encrypt certificate notifications |

---

## AI Tools

The backend exposes these tools to Gemini via function calling:

| Tool | Description |
|---|---|
| `set_plan` | Silently sets the task plan shown in the HUD |
| `click_element` | Clicks an element by its accessibility tree ID |
| `type_text` | Types into an input or selects a dropdown option |
| `scroll_page` | Scrolls the page up or down |
| `navigate_to` | Navigates to a URL |
| `read_text` | Extracts visible page text |
| `undo_last_action` | Reverts the last action |
| `highlight_element` | Shows ghost cursor preview (safety lock mode) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI | Gemini 2.5 Flash Native Audio Preview |
| Backend | Python, FastAPI, WebSocket, asyncio |
| Extension | JavaScript, Chrome MV3, Shadow DOM |
| Website | Next.js 16, React 19, Tailwind CSS 4 |
| Deployment | Docker, Traefik, Let's Encrypt |
| Package managers | uv (Python), pnpm (Node) |

---

## Version History

See [RELEASE.md](./RELEASE.md) for the full changelog from v0.1 to v2.2.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for completed features and upcoming work.

---

## License

MIT
