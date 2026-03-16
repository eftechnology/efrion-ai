# ERP AI Autopilot - Roadmap & Status

## 🚀 Current Status: Stable v2.2 (Silent Mode & Accessibility Fix)
Full HUD overhaul with glassmorphism design, draggable pill, plan window, silent mode toggle, and reliable AI automation with accurate accessibility tree labeling.

---

## ✅ Recently Completed Updates (v2.2)

### 🔇 Silent Mode
- **Mute button in HUD**: toggles AI audio output on/off with visual speaker icon
- **Backend-aware**: server drops audio chunks from Gemini when muted — no audio sent to browser at all
- **`set_plan` tool**: AI sets plan silently via function call instead of speaking steps aloud; system prompt updated to suppress per-step narration

### 🐛 Bug Fixes
- **Accessibility tree label fix**: heading siblings no longer used as labels for buttons/links — buttons now report their own `innerText` (fixes "Add Employee" not found)

---

## ✅ Previously Completed (v2.0 – v2.1)

### 🗂️ Plan Window
- End-to-end working plan window: parsing from `turn_complete` buffer, `activeIndex` auto-advances, ✓ Done badge, auto-dismiss
- Conversation history panel built (hidden, pending UX polish)

### 🎨 HUD Redesign
- Glassmorphism design with backdrop blur and border glow
- Draggable HUD pill, miniaturization mode, animated equalizer bars
- Smooth state transitions, error state with retry button

### 🏎️ Performance & Architecture (v1.0 – v1.7)
- Shadow DOM HUD isolation, stable `data-gemini-id` element IDs
- Cross-page persistence, advanced DOM diffing, dead-end detection
- Multi-strategy label detection, AI undo system, target highlighting
- Push-to-talk, AudioWorklet recording, Gemini 2.5 Flash integration

---

## 🛠️ Upcoming Tasks (Short-Term)

### 1. Conversation History Panel
- Unhide chat button, polish panel positioning and sizing relative to plan panel
- Infrastructure already complete (`#erp-ai-chat-panel`) — just needs UX polish

### 2. Intelligence
- **OCR Fallback**: Use Gemini's visual analysis to identify icon-only buttons or canvas-based UI elements lacking semantic HTML
- **Branching Logic**: AI suggests alternative plans if page data contradicts initial assumptions

### 3. Multi-Step Planning
- **Cancel mid-plan**: voice command to abort remaining steps in a running plan

---

## 🌟 Long-Term Vision

### 🤖 Autonomous Workflow Engine
Transition from a guided assistant to a fully autonomous workflow engine that can handle complex multi-page tasks (e.g., "Monthly Close", "Stock Rebalance") with minimal human oversight.

### 🏢 Cross-ERP Compatibility
Pre-trained templates and optimized prompt engineering for major ERP platforms (SAP, Oracle, Odoo, NetSuite).

### 🌍 Multilingual Native Audio
Full support for multi-language voice interaction with accent-aware recognition.
