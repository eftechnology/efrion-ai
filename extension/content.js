// Signal to the host page that the EFRION extension is installed and active
document.documentElement.setAttribute('data-efrion-extension', 'active');

let screenCaptureIntervalId = null;
let screenCaptureInterval = 2000;
let domDirty = true;
let cachedAccessibilityTree = [];
let mutationObserver = null;
let mutationDebounceTimer = null;
let isPushToTalkActive = false;
let isPlaying = false;
let lastSpeechEndTime = 0;
const POST_SPEECH_COOLDOWN_MS = 800; // Lowered from 5000 to improve responsiveness
let isCoolingDown = false;
let lastTreeJson = ''; // Used to track DOM changes
let actionHistory = []; // Stack of { type, id, oldValue, url } for undo
let conversationHistory = []; // { source, text, ts }
let chatPanelManuallyClosed = false;
let isSilentMode = false;

function pushToHistory(action) {
    actionHistory.push({ ...action, timestamp: Date.now() });
    if (actionHistory.length > 10) actionHistory.shift(); // Keep last 10 actions
    console.log(`📜 Action pushed to history: ${action.type}`);
}

function undoLastAction() {
    if (actionHistory.length === 0) {
        console.warn("⚠️ No actions to undo.");
        return;
    }

    const last = actionHistory.pop();
    console.log(`🔙 Undoing: ${last.type} on ${last.id}`);

    if (last.type === 'type_text') {
        const el = document.querySelector(`[data-gemini-id="${last.id}"]`);
        if (el) {
            el.value = last.oldValue || "";
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            console.log("✅ Restored previous value.");
        }
    } else if (last.type === 'click_element') {
        if (last.causedNavigation) {
            window.history.back();
            console.log("✅ Navigating back.");
        } else {
            // Re-click to toggle if it was a dynamic UI element
            const el = document.querySelector(`[data-gemini-id="${last.id}"]`);
            if (el) el.click();
            console.log("✅ Re-clicked to toggle state.");
        }
    }
    
    updateHUD('idle');
    const statusText = erpShadowRoot?.getElementById('erp-ai-status-text');
    if (statusText) statusText.innerText = "Undo Complete";
}

function scheduleDebouncedCapture() {
    if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(() => {
        if (domDirty) {
            console.log("⚡ DOM mutation detected - Triggering immediate sync...");
            captureAndSend(true); // Sync DOM state immediately (skip image for speed)
        }
    }, 300); // 300ms debounce
}
// ==============================================================================
// SAFE MESSAGING & CLEANUP
// ==============================================================================
function cleanupSession() {
    console.log("🧹 Cleaning up old session due to extension reload...");
    removeHUD();
    if (screenCaptureIntervalId) {
        clearInterval(screenCaptureIntervalId);
        screenCaptureIntervalId = null;
    }
    if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
    }
    stopRecording();
    isPushToTalkActive = false;
    isPlaying = false;
}

function safeSendMessage(payload) {
    try {
        chrome.runtime.sendMessage(payload, (response) => {
            if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
                    cleanupSession();
                }
            }
        });
    } catch (err) {
        if (err.message.includes("Extension context invalidated")) {
            cleanupSession();
        } else {
            console.error("Failed to send message:", err);
        }
    }
}

// ==============================================================================
// IN-PAGE HUD (Isolated via Shadow DOM)
// ==============================================================================
let erpShadowRoot = null;

function createHUD() {
    console.log("🛠️ createHUD() called");
    if (document.getElementById('erp-ai-hud-container')) return;

    const container = document.createElement('div');
    container.id = 'erp-ai-hud-container';
    container.style.position = 'fixed';
    container.style.bottom = '30px';
    container.style.right = '30px';
    container.style.zIndex = '2147483647';
    container.style.transition = 'bottom 0.1s ease, right 0.1s ease';
    document.body.appendChild(container);

    erpShadowRoot = container.attachShadow({ mode: 'open' });

    const hud = document.createElement('div');
    hud.id = 'erp-ai-hud';
    
    // Modern Glassmorphism Styling
    hud.style.padding = '12px 20px';
    hud.style.backgroundColor = 'rgba(25, 25, 25, 0.82)';
    hud.style.backdropFilter = 'blur(16px)';
    hud.style.webkitBackdropFilter = 'blur(16px)';
    hud.style.color = '#fff';
    hud.style.borderRadius = '50px';
    hud.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    hud.style.fontSize = '14px';
    hud.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)';
    hud.style.display = 'flex';
    hud.style.alignItems = 'center';
    hud.style.gap = '15px';
    hud.style.border = '1px solid rgba(255,255,255,0.1)';
    hud.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    hud.style.cursor = 'grab';
    hud.style.userSelect = 'none';
    hud.style.maxWidth = '600px';
    hud.style.overflow = 'visible';
    hud.style.position = 'relative';

    hud.innerHTML = `
        <style>
          :host {
            --hud-bg: rgba(25, 25, 25, 0.82);
            --hud-border: rgba(255,255,255,0.1);
            --hud-blur: 16px;
            --hud-radius: 50px;
            --hud-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
            --color-offline: #94a3b8;
            --color-idle: #4CAF50;
            --color-listening: #f44336;
            --color-speaking: #2196F3;
            --color-processing: #FFC107;
            --color-confirm: #4CAF50;
            --color-error: #ef4444;
            --dot-size: 12px;
            --transition-state: opacity 0.15s ease;
            --transition-bounce: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          @keyframes erp-pulse-green {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
          }
          @keyframes erp-pulse-red {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7); }
            70% { transform: scale(1.2); box-shadow: 0 0 0 15px rgba(244, 67, 54, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
          }
          @keyframes erp-pulse-yellow {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
          }
          @keyframes erp-pulse-blue {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(33, 150, 243, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
          }
          @keyframes erp-pulse-error {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.9); }
            50% { transform: scale(1.2); box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
          @keyframes erp-fade-in {
            from { transform: scale(0.85); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes erp-text-shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes erp-slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          .btn-hover:hover { transform: translateY(-2px); filter: brightness(1.2); }
          .btn-hover:active { transform: scale(0.95); }

          #erp-ai-minimize-btn {
            background: transparent;
            border: none;
            color: #aaa;
            cursor: pointer;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s, transform 0.2s;
          }
          #erp-ai-minimize-btn:hover { color: #fff; transform: scale(1.1); }

          #erp-ai-mute-btn {
            background: transparent; border: none; color: #aaa; cursor: pointer;
            padding: 5px; display: none; align-items: center; justify-content: center;
            transition: color 0.2s, transform 0.2s;
          }
          #erp-ai-mute-btn:hover { color: #fff; transform: scale(1.1); }
          #erp-ai-mute-btn.muted { color: #f87171; }
          #erp-ai-hud.mini #erp-ai-mute-btn { display: none !important; }

          #erp-ai-hud.mini {
            padding: 10px;
            width: 32px;
            height: 32px;
            justify-content: center;
            gap: 0;
            border-radius: 50%;
            cursor: pointer;
            overflow: hidden;
          }
          #erp-ai-hud.mini #erp-ai-status-text,
          #erp-ai-hud.mini #erp-ai-transcript,
          #erp-ai-hud.mini #erp-ai-volume-container,
          #erp-ai-hud.mini #erp-ai-start-btn,
          #erp-ai-hud.mini #erp-ai-stop-btn,
          #erp-ai-hud.mini #erp-ai-confirm-btn,
          #erp-ai-hud.mini #erp-ai-confirm-detail,
          #erp-ai-hud.mini #erp-ai-minimize-btn {
            display: none !important;
            opacity: 0;
          }
          #erp-ai-hud.mini #erp-ai-plan-container {
            display: none !important;
          }

          /* Mini glow rings */
          #erp-ai-hud.mini.state-idle      { box-shadow: 0 0 0 3px rgba(76,175,80,0.6), 0 8px 32px rgba(0,0,0,0.4); }
          #erp-ai-hud.mini.state-listening { box-shadow: 0 0 0 3px rgba(244,67,54,0.7), 0 8px 32px rgba(0,0,0,0.4); }
          #erp-ai-hud.mini.state-processing { box-shadow: 0 0 0 3px rgba(255,193,7,0.6), 0 8px 32px rgba(0,0,0,0.4); }
          #erp-ai-hud.mini.state-speaking  { box-shadow: 0 0 0 3px rgba(33,150,243,0.7), 0 8px 32px rgba(0,0,0,0.4); }
          #erp-ai-hud.mini.state-confirm   { box-shadow: 0 0 0 3px rgba(76,175,80,0.8), 0 8px 32px rgba(0,0,0,0.4); }
          #erp-ai-hud.mini.state-error     { box-shadow: 0 0 0 3px rgba(239,68,68,0.9), 0 8px 32px rgba(0,0,0,0.4); }

          #erp-ai-start-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 8px 18px;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            display: none;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          }
          #erp-ai-confirm-btn {
            background: #10b981;
            color: white;
            border: none;
            padding: 6px 14px;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            display: none;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          }
          .status-indicator {
            width: var(--dot-size);
            height: var(--dot-size);
            border-radius: 50%;
            transition: background-color 0.3s;
            flex-shrink: 0;
          }

          #erp-ai-transcript {
            border-left: 1px solid rgba(255,255,255,0.1);
            padding-left: 15px;
            font-size: 12px;
            color: rgba(255,255,255,0.6);
            max-width: 240px;
            white-space: normal;
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            font-weight: 400;
            transition: opacity 0.3s ease;
            cursor: default;
          }
          #erp-ai-transcript:hover { -webkit-line-clamp: unset; }

          .state-speaking #erp-ai-transcript {
            background: linear-gradient(90deg, rgba(255,255,255,0.55) 0%, rgba(96,165,250,0.95) 50%, rgba(255,255,255,0.55) 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: erp-text-shimmer 2s linear infinite;
          }

          #erp-ai-volume-container {
            display: none;
            align-items: flex-end;
            height: 20px;
            gap: 2.5px;
          }
          .vol-bar {
            width: 3px;
            border-radius: 2px 2px 0 0;
            transition: height 0.08s ease, background-color 0.2s ease;
            height: 3px;
            background: #10b981;
          }

          #erp-ai-confirm-detail {
            font-size: 11px;
            color: #6ee7b7;
            background: rgba(16,185,129,0.12);
            border: 1px solid rgba(16,185,129,0.25);
            border-radius: 10px;
            padding: 3px 10px;
            display: none;
            animation: erp-fade-in 0.25s ease;
            white-space: nowrap;
            max-width: 160px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          #erp-ai-plan-container {
            position: absolute;
            bottom: 100%;
            right: 0;
            margin-bottom: 15px;
            background: rgba(30, 30, 30, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 18px;
            width: 280px;
            display: none;
            flex-direction: column;
            gap: 10px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.5);
            animation: erp-slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .plan-item {
            font-size: 12.5px;
            color: #bbb;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            transition: all 0.2s;
          }
          .plan-item.done { color: #555; text-decoration: line-through; opacity: 0.55; }
          .plan-item.active { color: #fff; font-weight: 600; background: rgba(255,255,255,0.06); border-radius: 8px; padding: 4px 6px; margin: -4px -6px; }
          .plan-step-num {
            width: 18px; height: 18px; border-radius: 50%;
            background: rgba(255,255,255,0.12); color: #ccc;
            font-size: 10px; font-weight: 700;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; margin-top: 1px;
          }
          .plan-item.done .plan-step-num { background: rgba(16,185,129,0.2); color: #10b981; }
          .plan-item.active .plan-step-num { background: rgba(255,255,255,0.9); color: #111; }

          #erp-ai-chat-btn {
            background: transparent; border: none; color: #aaa; cursor: pointer;
            padding: 5px; display: none; align-items: center; justify-content: center;
            transition: color 0.2s, transform 0.2s;
          }
          #erp-ai-chat-btn:hover { color: #fff; transform: scale(1.1); }
          #erp-ai-chat-btn.active { color: #60a5fa; }

          #erp-ai-chat-panel {
            position: absolute; bottom: 100%; left: 0; margin-bottom: 15px;
            background: rgba(20, 20, 20, 0.90);
            backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
            border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
            padding: 14px 14px 10px; width: 320px; max-height: 360px;
            display: none; flex-direction: column;
            box-shadow: 0 12px 40px rgba(0,0,0,0.55);
            animation: erp-slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          #erp-ai-chat-panel-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 10px; flex-shrink: 0;
          }
          #erp-ai-chat-panel-title {
            font-size: 11px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.4px; color: #888;
          }
          #erp-ai-chat-messages {
            overflow-y: auto; display: flex; flex-direction: column;
            gap: 8px; max-height: 290px; padding-right: 4px;
            scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent;
          }
          #erp-ai-chat-messages::-webkit-scrollbar { width: 4px; }
          #erp-ai-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 2px; }

          .chat-msg { display: flex; flex-direction: column; max-width: 85%; animation: erp-fade-in 0.2s ease; }
          .chat-msg.user  { align-self: flex-end;  align-items: flex-end; }
          .chat-msg.ai    { align-self: flex-start; align-items: flex-start; }
          .chat-msg.system { align-self: center; align-items: center; max-width: 100%; }

          .chat-msg-bubble { padding: 7px 11px; border-radius: 12px; font-size: 12.5px; line-height: 1.45; word-break: break-word; }
          .chat-msg.user   .chat-msg-bubble { background: rgba(37,99,235,0.28); border: 1px solid rgba(96,165,250,0.25); color: #e0eaff; border-bottom-right-radius: 4px; }
          .chat-msg.ai     .chat-msg-bubble { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.08); color: #ddd; border-bottom-left-radius: 4px; }
          .chat-msg.system .chat-msg-bubble { background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.2); color: #fcd34d; border-radius: 10px; font-size: 11.5px; }

          .chat-msg-meta { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 3px; padding: 0 3px; }

          #erp-ai-hud.mini #erp-ai-chat-btn,
          #erp-ai-hud.mini #erp-ai-chat-panel { display: none !important; }
        </style>

        <div id="erp-ai-chat-panel">
            <div id="erp-ai-chat-panel-header">
                <span id="erp-ai-chat-panel-title">Conversation</span>
            </div>
            <div id="erp-ai-chat-messages"></div>
        </div>

        <div id="erp-ai-plan-container"></div>

        <button id="erp-ai-minimize-btn" title="Minimize/Expand">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19 13H5v-2h14v2z"/>
            </svg>
        </button>
        <button id="erp-ai-chat-btn" title="Conversation History" class="btn-hover">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
        </button>
        <button id="erp-ai-mute-btn" title="Toggle Silent Mode">
            <svg id="erp-ai-mute-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
        </button>

        <div id="erp-ai-indicator" class="status-indicator" style="background-color: #94a3b8;"></div>
        <span id="erp-ai-status-text" style="font-weight: 600; min-width: 90px; color: #fff; letter-spacing: -0.2px;">Autopilot</span>

        <div style="display: flex; gap: 10px; align-items: center;">
            <button id="erp-ai-start-btn" class="btn-hover">Start</button>
            <button id="erp-ai-confirm-btn" class="btn-hover">Confirm Action</button>
            <button id="erp-ai-stop-btn" class="btn-hover" title="Exit Autopilot" style="
                background: rgba(239, 68, 68, 0.15);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #f87171;
                padding: 0;
                border-radius: 50%;
                cursor: pointer;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                outline: none;
                transition: all 0.2s;
            ">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        </div>
        <div id="erp-ai-transcript">Waiting for sound...</div>
        <div id="erp-ai-confirm-detail"></div>
        <div id="erp-ai-volume-container">
            <div class="vol-bar" id="vol-b1"></div>
            <div class="vol-bar" id="vol-b2"></div>
            <div class="vol-bar" id="vol-b3"></div>
            <div class="vol-bar" id="vol-b4"></div>
            <div class="vol-bar" id="vol-b5"></div>
        </div>
    `;

    erpShadowRoot.appendChild(hud);

    // ==============================================================================
    // 🖱️ DRAG AND DROP LOGIC
    // ==============================================================================
    let isDragging = false;
    let startX, startY, initialRight, initialBottom;

    hud.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return; // Don't drag if clicking buttons
        isDragging = true;
        hud.style.cursor = 'grabbing';
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = container.getBoundingClientRect();
        initialRight = window.innerWidth - rect.right;
        initialBottom = window.innerHeight - rect.bottom;
        
        container.style.transition = 'none'; // Disable transition while dragging
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = startX - e.clientX;
        const deltaY = startY - e.clientY;
        
        container.style.right = `${initialRight + deltaX}px`;
        container.style.bottom = `${initialBottom + deltaY}px`;
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            hud.style.cursor = 'grab';
            container.style.transition = 'bottom 0.1s ease, right 0.1s ease';
        }
    });

    const startBtn = erpShadowRoot.getElementById('erp-ai-start-btn');
    const stopBtn = erpShadowRoot.getElementById('erp-ai-stop-btn');
    const confirmBtn = erpShadowRoot.getElementById('erp-ai-confirm-btn');
    const minBtn = erpShadowRoot.getElementById('erp-ai-minimize-btn');

    minBtn.addEventListener('click', () => {
        hud.classList.toggle('mini');
        const isMini = hud.classList.contains('mini');
        minBtn.innerHTML = isMini ?
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 14H5v5h2v-5zm12-5h2V4h-2v5zM5 4v5h2V4H5zm14 15h2v-5h-2v5z"/></svg>' :
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>';
    });

    // Click mini circle to expand
    hud.addEventListener('click', (e) => {
        if (hud.classList.contains('mini') && !e.target.closest('button')) {
            hud.classList.remove('mini');
            minBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>';
        }
    });

    startBtn.addEventListener('click', () => {
        startBtn.innerText = "Connecting...";
        startBtn.disabled = true;
        safeSendMessage({ action: 'start_session' });
    });

    stopBtn.addEventListener('click', () => safeSendMessage({ action: 'stop_session' }));

    confirmBtn.addEventListener('click', () => {
        safeSendMessage({ type: 'action', action: 'confirm' });
        confirmBtn.style.display = 'none';
        const confirmDetail = erpShadowRoot.getElementById('erp-ai-confirm-detail');
        if (confirmDetail) confirmDetail.style.display = 'none';
    });

    const chatBtn = erpShadowRoot.getElementById('erp-ai-chat-btn');
    const chatPanel = erpShadowRoot.getElementById('erp-ai-chat-panel');
    chatBtn.addEventListener('click', () => {
        const isOpen = chatPanel.style.display === 'flex';
        if (isOpen) {
            chatPanel.style.display = 'none';
            chatBtn.classList.remove('active');
            chatPanelManuallyClosed = true;
        } else {
            chatPanel.style.display = 'flex';
            chatBtn.classList.add('active');
            chatPanelManuallyClosed = false;
            renderChatPanel();
        }
    });

    const muteBtn = erpShadowRoot.getElementById('erp-ai-mute-btn');
    const muteIcon = erpShadowRoot.getElementById('erp-ai-mute-icon');
    muteBtn.addEventListener('click', () => {
        isSilentMode = !isSilentMode;
        if (isSilentMode) {
            muteBtn.classList.add('muted');
            muteBtn.title = 'Unmute AI';
            muteIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
        } else {
            muteBtn.classList.remove('muted');
            muteBtn.title = 'Toggle Silent Mode';
            muteIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
        }
        safeSendMessage({ type: 'silent_mode', enabled: isSilentMode });
    });

    console.log("✅ HUD created successfully in Shadow DOM");
    updateHUD('offline'); // Initial state
}

function removeHUD() {
    const container = document.getElementById('erp-ai-hud-container');
    if (container) container.remove();
    erpShadowRoot = null;
}

function setStatusText(el, newText) {
    if (!el || el.innerText === newText) return;
    el.style.transition = 'opacity 0.15s ease';
    el.style.opacity = '0';
    setTimeout(() => { el.innerText = newText; el.style.opacity = '1'; }, 150);
}

function updateHUD(status, extra = {}) {
    if (!erpShadowRoot) return;

    // Sync state class on HUD element
    const hudEl = erpShadowRoot.getElementById('erp-ai-hud');
    if (hudEl) {
        hudEl.className = hudEl.className.split(' ').filter(c => !c.startsWith('state-')).join(' ').trim();
        hudEl.classList.add(`state-${status}`);
    }

    const text = erpShadowRoot.getElementById('erp-ai-status-text');
    const indicator = erpShadowRoot.getElementById('erp-ai-indicator');
    const confirmBtn = erpShadowRoot.getElementById('erp-ai-confirm-btn');
    const startBtn = erpShadowRoot.getElementById('erp-ai-start-btn');
    const stopBtn = erpShadowRoot.getElementById('erp-ai-stop-btn');
    const transcript = erpShadowRoot.getElementById('erp-ai-transcript');
    
    if (!text || !indicator) return;

    const volContainer = erpShadowRoot.getElementById('erp-ai-volume-container');
    const confirmDetail = erpShadowRoot.getElementById('erp-ai-confirm-detail');

    if (status === 'offline') {
        setStatusText(text, 'Autopilot');
        indicator.style.backgroundColor = 'var(--color-offline)';
        indicator.style.animation = 'none';
        if (startBtn) { startBtn.style.display = 'block'; startBtn.disabled = false; startBtn.innerText = 'Start'; }
        if (stopBtn) stopBtn.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'none';
        if (confirmDetail) confirmDetail.style.display = 'none';
        if (transcript) transcript.style.display = 'none';
        const planContainer = erpShadowRoot.getElementById('erp-ai-plan-container');
        if (planContainer) planContainer.style.display = 'none';
        if (volContainer) volContainer.style.display = 'none';
        conversationHistory = [];
        chatPanelManuallyClosed = false;
        const chatPanel = erpShadowRoot.getElementById('erp-ai-chat-panel');
        if (chatPanel) chatPanel.style.display = 'none';
        const chatBtn = erpShadowRoot.getElementById('erp-ai-chat-btn');
        if (chatBtn) chatBtn.classList.remove('active');
        isSilentMode = false;
        const muteBtn = erpShadowRoot.getElementById('erp-ai-mute-btn');
        if (muteBtn) { muteBtn.style.display = 'none'; muteBtn.classList.remove('muted'); }
    } else if (status === 'listening') {
        setStatusText(text, 'Listening...');
        indicator.style.backgroundColor = 'var(--color-listening)';
        indicator.style.animation = 'erp-pulse-red 1s infinite';
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'flex';
        if (transcript) transcript.style.display = '-webkit-box';
        if (volContainer) volContainer.style.display = 'flex';
    } else if (status === 'idle') {
        setStatusText(text, 'AI Online');
        indicator.style.backgroundColor = 'var(--color-idle)';
        indicator.style.animation = 'erp-pulse-green 1.5s infinite';
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'flex';
        const muteBtn = erpShadowRoot.getElementById('erp-ai-mute-btn');
        if (muteBtn) muteBtn.style.display = 'flex';
        if (confirmBtn) confirmBtn.style.display = 'none';
        if (confirmDetail) confirmDetail.style.display = 'none';
        if (transcript) transcript.style.display = '-webkit-box';
        if (volContainer) volContainer.style.display = 'flex';
    } else if (status === 'speaking') {
        setStatusText(text, 'AI Speaking...');
        indicator.style.backgroundColor = 'var(--color-speaking)';
        indicator.style.animation = 'erp-pulse-blue 1.5s infinite';
        if (volContainer) volContainer.style.display = 'none';
    } else if (status === 'processing') {
        setStatusText(text, 'Thinking...');
        indicator.style.backgroundColor = 'var(--color-processing)';
        indicator.style.animation = 'erp-pulse-yellow 1s infinite';
        if (volContainer) volContainer.style.display = 'none';
    } else if (status === 'confirm') {
        setStatusText(text, 'Verify Action');
        indicator.style.backgroundColor = 'var(--color-confirm)';
        indicator.style.animation = 'erp-pulse-green 1s infinite';
        if (confirmBtn) confirmBtn.style.display = 'block';
        if (confirmDetail) {
            if (extra.action) {
                const actionText = extra.action.toLowerCase();
                const isConfirmation = /\b(confirm|proceed|yes|ok)\b/i.test(actionText);
                const isDestructiveStarter = /\b(reset|clear|delete|destroy|drop)\b/i.test(actionText);
                
                // Only flag as "needs confirmation" if it's a confirming keyword AND NOT a destructive starter.
                // This allows clicking "Clear Cache" (destructive starter) but blocks "Confirm" (confirmation).
                const needsConfirmation = isConfirmation && !isDestructiveStarter;

                if (needsConfirmation) {
                    confirmDetail.innerText = extra.action;
                    confirmDetail.style.display = 'block';
                } else {
                    confirmDetail.style.display = 'none';
                }
            } else {
                confirmDetail.style.display = 'none';
            }
        }
    } else if (status === 'error') {
        setStatusText(text, 'Error');
        indicator.style.backgroundColor = 'var(--color-error)';
        indicator.style.animation = 'erp-pulse-error 0.6s infinite';
        if (startBtn) { startBtn.style.display = 'block'; startBtn.disabled = false; startBtn.innerText = 'Retry'; }
        if (stopBtn) stopBtn.style.display = 'flex';
        if (confirmBtn) confirmBtn.style.display = 'none';
        if (confirmDetail) confirmDetail.style.display = 'none';
        if (volContainer) volContainer.style.display = 'none';
        if (transcript) {
            transcript.style.display = '-webkit-box';
            transcript.style.color = '#f87171';
            transcript.innerText = '⚠ Session ended';
        }
    }
}

function updatePlanHUD(steps, activeIndex = 0) {
    if (!erpShadowRoot) return;
    const container = erpShadowRoot.getElementById('erp-ai-plan-container');
    if (!container) return;

    if (!steps || steps.length === 0) {
        container.style.display = 'none';
        return;
    }

    const total = steps.length;
    const allDone = activeIndex >= total;
    const current = Math.min(activeIndex + 1, total);

    if (container._dismissTimeout) clearTimeout(container._dismissTimeout);

    container.style.display = 'flex';
    container.style.opacity = '1';
    container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <div style="font-weight:700; font-size:11px; text-transform:uppercase; color:#888;">Current Plan</div>
            ${allDone
                ? `<div style="font-size:11px; font-weight:700; color:#10b981; background:rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.4); border-radius:10px; padding:2px 8px;">✓ Done</div>`
                : `<div style="font-size:11px; font-weight:700; color:#10b981; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:2px 8px;">${current} / ${total}</div>`
            }
        </div>
        ${steps.map((step, i) => {
            const isDone = allDone || i < activeIndex;
            const isActive = !allDone && i === activeIndex;
            const label = isDone ? '✓' : (i + 1);
            const cls = isDone ? 'done' : (isActive ? 'active' : '');
            return `<div class="plan-item ${cls}">
                <div class="plan-step-num">${label}</div>
                <span>${typeof step === 'string' ? step : (step.text || step.description || JSON.stringify(step))}</span>
            </div>`;
        }).join('')}
    `;

    if (allDone) {
        container._dismissTimeout = setTimeout(() => {
            container.style.transition = 'opacity 0.5s ease';
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.display = 'none';
                container.style.opacity = '1';
                container.style.transition = '';
            }, 500);
        }, 3000);
    }
}

function renderChatPanel() {
    if (!erpShadowRoot) return;
    const messagesEl = erpShadowRoot.getElementById('erp-ai-chat-messages');
    if (!messagesEl) return;

    if (conversationHistory.length === 0) {
        messagesEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.25);font-size:11px;padding:20px 0;">No messages yet</div>';
        return;
    }

    messagesEl.innerHTML = conversationHistory.map(entry => {
        const cls = entry.source === 'USER' ? 'user' : (entry.source === 'SYSTEM' ? 'system' : 'ai');
        const label = entry.source === 'USER' ? 'You' : (entry.source === 'SYSTEM' ? 'System' : 'AI');
        const timeStr = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const safe = entry.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        return `<div class="chat-msg ${cls}">
            <div class="chat-msg-bubble">${safe}</div>
            <div class="chat-msg-meta">${label} · ${timeStr}</div>
        </div>`;
    }).join('');

    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function updateTranscriptHUD(source, transcript) {
    if (!erpShadowRoot) return;
    const el = erpShadowRoot.getElementById('erp-ai-transcript');
    if (!el) return;

    // Push to history
    conversationHistory.push({ source, text: transcript, ts: Date.now() });
    if (conversationHistory.length > 100) conversationHistory.shift();

    // Render chat panel (panel stays hidden until chat feature is re-enabled)
    renderChatPanel();

    // Auto-open on first message (unless user manually closed)
    // const chatPanel = erpShadowRoot.getElementById('erp-ai-chat-panel');
    // const chatBtn = erpShadowRoot.getElementById('erp-ai-chat-btn');
    // if (chatPanel && !chatPanelManuallyClosed && chatPanel.style.display === 'none') {
    //     chatPanel.style.display = 'flex';
    //     if (chatBtn) chatBtn.classList.add('active');
    // }

    const prefix = source === 'USER' ? '👤' : (source === 'SYSTEM' ? '🛡️' : '🤖');
    const newText = `${prefix} ${transcript}`;
    const newColor = source === 'USER' ? '#eee' : (source === 'SYSTEM' ? '#FFC107' : '#60a5fa');

    // Cross-fade update
    el.style.transition = 'opacity 0.2s ease';
    el.style.opacity = '0';
    setTimeout(() => {
        el.innerText = newText;
        el.style.color = newColor;
        el.style.webkitTextFillColor = '';
        el.style.opacity = '1';
    }, 200);

    // Fade out after 6s
    if (el.transcriptTimeout) clearTimeout(el.transcriptTimeout);
    el.transcriptTimeout = setTimeout(() => {
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity = '0';
        setTimeout(() => { el.innerText = ''; }, 400);
    }, 6000);
}

let lastAccessibilityTree = new Map(); // ID -> Element map for diffing

function getTreeDiff(currentTree) {
    const currentMap = new Map(currentTree.map(el => [el.id, el]));
    const added = [];
    const removed = [];
    const updated = [];

    // Find Added and Updated
    for (const [id, el] of currentMap) {
        if (!lastAccessibilityTree.has(id)) {
            added.push(el);
        } else {
            const prev = lastAccessibilityTree.get(id);
            const labelChanged = prev.label !== el.label;
            const roleChanged = prev.role !== el.role;
            // Detect movement if element shifted by more than 5 pixels
            const moved = Math.abs(prev.x - el.x) > 5 || Math.abs(prev.y - el.y) > 5;
            // Detect if select options changed
            const optionsChanged = JSON.stringify(prev.options) !== JSON.stringify(el.options);

            if (labelChanged || roleChanged || moved || optionsChanged) {
                updated.push({ 
                    id, 
                    changes: {
                        label: labelChanged ? el.label : undefined,
                        role: roleChanged ? el.role : undefined,
                        moved: moved ? { x: el.x, y: el.y } : undefined,
                        options: optionsChanged ? el.options : undefined
                    }
                });
            }
        }
    }

    // Find Removed
    for (const id of lastAccessibilityTree.keys()) {
        if (!currentMap.has(id)) {
            removed.push(id);
        }
    }

    lastAccessibilityTree = currentMap;
    return { added, removed, updated, totalCount: currentTree.length };
}

function captureAndSend(domOnly = false) {
    if (isCoolingDown || isPlaying) return; 

    let domPayload = null;
    if (domDirty) {
        const currentTree = getSimplifiedAccessibilityTree();
        const diff = getTreeDiff(currentTree);
        
        const hasChanges = diff.added.length > 0 || diff.removed.length > 0 || diff.updated.length > 0;
        
        if (hasChanges) {
            // HEURISTIC: If more than 30% of elements changed, send the full tree.
            // Otherwise, send a semantic diff to save tokens.
            const changeCount = diff.added.length + diff.removed.length + diff.updated.length;
            if (changeCount > diff.totalCount * 0.3 || lastAccessibilityTree.size === 0) {
                domPayload = { type: 'full', tree: currentTree };
            } else {
                domPayload = { type: 'diff', diff: { added: diff.added, removed: diff.removed, updated: diff.updated } };
            }
        }
        domDirty = false;
    }

    const pageState = {
        url: window.location.href,
        title: document.title,
        readyState: document.readyState,
        domUpdate: domPayload
    };

    if (!domPayload && domOnly) return;

    safeSendMessage({ action: 'capture_screen', skipImage: domOnly, pageState: pageState });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'inject_hud') {
        createHUD();
    } else if (message.action === 'ws_connected') {
        createHUD();
        updateHUD('idle');
        // Set volume container visible when connected
        const vol = erpShadowRoot?.getElementById('erp-ai-volume-container');
        if (vol) vol.style.display = 'flex';
        
        startRecording();
        
        // Initial screen sync (delayed slightly to ensure audio stream is ready and user can speak)
        setTimeout(() => captureAndSend(), 1000);

        if (!mutationObserver) {
            mutationObserver = new MutationObserver(() => {
                domDirty = true;
                scheduleDebouncedCapture();
            });
            mutationObserver.observe(document.body, { 
                childList: true, subtree: true, attributes: true, 
                attributeFilter: ['class', 'style', 'hidden', 'disabled'] 
            });
        }
        if (screenCaptureIntervalId) clearInterval(screenCaptureIntervalId);
        screenCaptureIntervalId = setInterval(() => {
            // 1. Skip sending screenshots/DOM updates if the AI is currently speaking
            if (isPlaying) return;

            // 2. Post-speech cooldown check
            const now = Date.now();
            if (now - lastSpeechEndTime < POST_SPEECH_COOLDOWN_MS) {
                return;
            }

            captureAndSend();
        }, 1500); // More frequent updates (1.5s)
    } else if (message.type === 'command') {
        if (message.command === 'stop_audio') {
            audioQueue = []; nextStartTime = 0;
            if (audioContext && audioContext.state === 'running') audioContext.suspend().then(() => audioContext.resume());
            updateHUD('idle');
        } else if (message.command === 'click_element') simulateClickWithGhostCursor(message.id);
        else if (message.command === 'type_text') typeTextIntoElement(message.id, message.text);
        else if (message.command === 'scroll_page') scrollPage(message.direction);
        else if (message.command === 'navigate_to') navigateTo(message.url);
        else if (message.command === 'read_text') readText(message.query);
        else if (message.command === 'highlight_element') highlightElement(message.id);
        else if (message.command === 'show_confirm_ui') {
            const hud = erpShadowRoot?.getElementById('erp-ai-hud');
            hud?.classList.remove('mini');
            updateHUD('confirm', { action: message.actionDescription || '' });
        } else if (message.command === 'hide_confirm_ui') {
            const confirmBtn = erpShadowRoot?.getElementById('erp-ai-confirm-btn');
            if (confirmBtn) confirmBtn.style.display = 'none';
            const confirmDetail = erpShadowRoot?.getElementById('erp-ai-confirm-detail');
            if (confirmDetail) confirmDetail.style.display = 'none';
            updateHUD('idle');
        } else if (message.command === 'update_plan') {
            const hud = erpShadowRoot?.getElementById('erp-ai-hud');
            hud?.classList.remove('mini');
            updatePlanHUD(message.steps, message.activeIndex ?? 0);
        } else if (message.command === 'undo_last_action') {
            undoLastAction();
        }
    } else if (message.type === 'transcription') {
        updateTranscriptHUD(message.source, message.text);
    } else if (message.type === 'audio') {
        playAudio(message.data, message.mime_type);
    } else if (message.type === 'error') {
        console.error('Session error:', message.message);
        updateHUD('error');
        updateTranscriptHUD('SYSTEM', message.message || 'An error occurred');
    } else if (message.action === 'stop') {
        stopRecording(); 
        updateHUD('offline');
        if (screenCaptureIntervalId) clearInterval(screenCaptureIntervalId);
        if (mutationObserver) { mutationObserver.disconnect(); mutationObserver = null; }
    } else if (message.action === 'play_audio') {
        console.log('🔊 AI started speaking');
        isPlaying = true;
        updateHUD('speaking');
    } else if (message.action === 'stop_audio') {
        console.log('🤐 AI finished speaking');
        isPlaying = false;
        lastSpeechEndTime = Date.now(); 
        updateHUD('idle');
    }
});

function generateStableId(el) {
    const tagName = el.tagName.toLowerCase();
    const text = (el.innerText || el.value || el.placeholder || "").trim().substring(0, 20);
    const classes = Array.from(el.classList).slice(0, 2).join(".");
    const parentTag = el.parentElement ? el.parentElement.tagName.toLowerCase() : "";
    const str = `${tagName}:${text}:${classes}:${parentTag}`;

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return `el-${Math.abs(hash).toString(16)}`;
}

function findLabelForElement(el) {
    // 1. Standard labels property
    if (el.labels && el.labels.length > 0) {
        return el.labels[0].innerText;
    }

    // 2. ARIA attributes
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) return labelEl.innerText;
    }

    // 3. Common attributes
    if (el.placeholder) return el.placeholder;
    if (el.title) return el.title;

    // 4. Linked <label> via 'for' attribute (fallback if el.labels is empty)
    if (el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`);
        if (label) return label.innerText;
    }

    // 5. Parent <label>
    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.innerText;

    // 6. Proximity Analysis: only for form inputs, not for buttons/links which have their own text.
    // Headings are section titles, not field labels — skip them here.
    const isFormField = ['input', 'select', 'textarea'].includes(el.tagName.toLowerCase());
    if (isFormField) {
        let prev = el.previousElementSibling;
        if (prev && prev.tagName === 'LABEL') {
            return prev.innerText;
        }
    }

    // 7. Last resort: use the element's own text if it's a button/link
    return (el.innerText || "").trim();
}

function getSimplifiedAccessibilityTree() {
    const interactiveElements = [];
    const selector = 'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
    const elements = document.querySelectorAll(selector);

    const idCounts = {};

    elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 &&
                         rect.top >= 0 && rect.left >= 0 &&
                         rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;

        if (isVisible) {
            let baseId = generateStableId(el);
            idCounts[baseId] = (idCounts[baseId] || 0) + 1;
            const finalId = idCounts[baseId] > 1 ? `${baseId}-${idCounts[baseId]}` : baseId;

            const label = findLabelForElement(el).trim();
            const textLower = el.innerText.toLowerCase();
            const labelLower = label.toLowerCase();
            const isConfirmation = /\b(confirm|proceed|yes|ok)\b/i.test(label) || /\b(confirm|proceed|yes|ok)\b/i.test(el.innerText);
            const isDestructiveStarter = /\b(reset|clear|delete|destroy|drop)\b/i.test(label) || /\b(reset|clear|delete|destroy|drop)\b/i.test(el.innerText);
            const needsConfirmation = isConfirmation && !isDestructiveStarter;

            let elementData = {
                id: finalId,
                tagName: el.tagName.toLowerCase(),
                label: label || "Unnamed Element",
                role: el.getAttribute('role') || el.type || "",
                needsConfirmation: needsConfirmation,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
            };

            // Add options for select elements
            if (el.tagName.toLowerCase() === 'select') {
                elementData.options = Array.from(el.options)
                    .filter(opt => opt.value !== "")
                    .map(opt => ({ value: opt.value, text: opt.text }));
            }

            interactiveElements.push(elementData);
            el.setAttribute('data-gemini-id', finalId);
        }
    });
    return interactiveElements;
}// ==============================================================================
// AUDIO RECORDING: 16kHz PCM via AudioWorklet
// ==============================================================================

let audioInputContext;
let audioStream;
let workletNode;

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Utility to correctly downsample buffer to 16kHz
function downsampleBuffer(buffer, sampleRate, outSampleRate) {
    if (outSampleRate === sampleRate) return buffer;
    const ratio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
        let accum = 0, count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = accum / count;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

function convertFloat32ToInt16(buffer) {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
        buf[l] = Math.min(1, Math.max(-1, buffer[l])) * 0x7FFF;
    }
    return buf.buffer;
}

async function startRecording() {
    console.log("🎙️ startRecording() called");
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            } 
        });
        console.log("✅ Microphone access granted");

        // Native sample rate to prevent zeroing issues
        audioInputContext = new (window.AudioContext || window.webkitAudioContext)();
        await audioInputContext.resume();
        console.log(`🔊 AudioContext initialized at ${audioInputContext.sampleRate}Hz. State: ${audioInputContext.state}`);

        const workletUrl = chrome.runtime.getURL('recorder-worklet.js');
        await audioInputContext.audioWorklet.addModule(workletUrl);

        const source = audioInputContext.createMediaStreamSource(audioStream);
        workletNode = new AudioWorkletNode(audioInputContext, 'recorder-processor');

        let totalSentChunks = 0;
        let rawBuffer = new Float32Array(0);
        const RAW_BUFFER_THRESHOLD = 4096; // Accumulate more raw samples before downsampling

        workletNode.port.onmessage = (event) => {
            if (!audioInputContext) return; // Safety check for race condition during cleanup
            const msg = event.data;

            if (msg.type === 'pcm_data') {
                const inputChannel = msg.buffer; 

                // 1. Accumulate raw samples
                const newRawBuffer = new Float32Array(rawBuffer.length + inputChannel.length);
                newRawBuffer.set(rawBuffer);
                newRawBuffer.set(inputChannel, rawBuffer.length);
                rawBuffer = newRawBuffer;

                // 2. Process only when we have enough raw data
                if (rawBuffer.length >= RAW_BUFFER_THRESHOLD) {
                    // Downsample once for the larger block
                    const downsampled = downsampleBuffer(rawBuffer, audioInputContext.sampleRate, 16000);
                    const pcm16Buffer = convertFloat32ToInt16(downsampled);
                    const pcm16Array = new Int16Array(pcm16Buffer);

                    // Volume calculation for HUD
                    let maxVal = 0;
                    for (let j = 0; j < pcm16Array.length; j++) {
                        const abs = Math.abs(pcm16Array[j]);
                        if (abs > maxVal) maxVal = abs;
                    }
                    const volumePercent = Math.min(100, (maxVal / 32768) * 100);

                    // Equalizer visualization
                    const barWeights = [0.55, 0.8, 1.0, 0.8, 0.55];
                    for (let b = 1; b <= 5; b++) {
                        const bar = erpShadowRoot?.getElementById(`vol-b${b}`);
                        if (!bar) continue;
                        const noise = 1 + (Math.random() * 0.3 - 0.15);
                        const h = Math.max(3, volumePercent * barWeights[b - 1] * noise * 0.2);
                        bar.style.height = `${h}px`;
                        bar.style.backgroundColor = volumePercent > 80 ? '#ef4444' : volumePercent > 50 ? '#f59e0b' : '#10b981';
                    }

                    const base64Audio = arrayBufferToBase64(pcm16Buffer);
                    safeSendMessage({ action: 'send_audio', data: base64Audio });
                    
                    rawBuffer = new Float32Array(0); // Clear raw buffer
                    totalSentChunks++;
                    
                    if (totalSentChunks % 5 === 0) {
                        console.log(`🎤 Audio Stream: Sent ${totalSentChunks} high-fidelity chunks (Vol: ${volumePercent.toFixed(1)}%)`);
                    }
                }
            }
        };

        source.connect(workletNode);

        // Connect to destination but muted to keep graph active on some browsers
        const muteGain = audioInputContext.createGain();
        muteGain.gain.value = 0;
        workletNode.connect(muteGain);
        muteGain.connect(audioInputContext.destination);

        console.log("🎤 Recording pipeline initialized");

    } catch (err) {
        console.error("❌ Audio Error:", err);
        safeSendMessage({ action: 'stop_session' });
    }
}function stopRecording() {
    if (workletNode) { 
        workletNode.port.onmessage = null;
        workletNode.disconnect(); 
        workletNode = null; 
    }
    if (audioInputContext) { 
        audioInputContext.close(); 
        audioInputContext = null; 
    }
    if (audioStream) { 
        audioStream.getTracks().forEach(track => track.stop()); 
        audioStream = null; 
    }
    console.log("⏹️ Audio session closed");
}

// ==============================================================================
// UI AUTOMATION
// ==============================================================================

function simulateClickWithGhostCursor(id) {
    const el = document.querySelector(`[data-gemini-id="${id}"]`);
    if (!el) {
        safeSendMessage({ type: 'status', action: 'click_element', message: 'error', detail: `Element ${id} not found.` });
        return;
    }

    // Capture state before click
    const beforeState = lastTreeJson;
    const beforeUrl = window.location.href;

    const rect = el.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    const cursor = document.createElement('div');
    cursor.style.position = 'fixed';
    cursor.style.left = `${window.innerWidth / 2}px`;
    cursor.style.top = `${window.innerHeight / 2}px`;
    cursor.style.width = '20px'; cursor.style.height = '20px';
    cursor.style.backgroundColor = 'rgba(255, 51, 102, 0.7)';
    cursor.style.borderRadius = '50%'; cursor.style.zIndex = '999999';
    cursor.style.pointerEvents = 'none'; cursor.style.transition = 'all 0.5s ease-out';
    cursor.style.boxShadow = '0 0 10px rgba(255, 51, 102, 0.5)';
    document.body.appendChild(cursor);

    requestAnimationFrame(() => {
        cursor.style.left = `${targetX - 10}px`;
        cursor.style.top = `${targetY - 10}px`;
    });

    setTimeout(() => {
        cursor.style.transform = 'scale(2)'; cursor.style.opacity = '0';
        el.click();

        // Verification phase (wait for DOM/URL to react)
        setTimeout(() => {
            cursor.remove();
            updateHUD('idle');

            const currentTree = JSON.stringify(getSimplifiedAccessibilityTree());
            const currentUrl = window.location.href;
            const changed = currentTree !== beforeState || currentUrl !== beforeUrl;

            if (changed) {
                pushToHistory({ type: 'click_element', id: id, causedNavigation: currentUrl !== beforeUrl });
                safeSendMessage({ type: 'status', action: 'click_element', message: 'success', detail: `Clicked ${id}. State changed.` });
                setTimeout(() => captureAndSend(true), 100);
            } else {
                console.warn(`🕵️ Dead-end detected for ${id}`);
                safeSendMessage({ 
                    type: 'status', 
                    action: 'click_element', 
                    message: 'warning', 
                    detail: `Clicked ${id} but no change was detected in the UI. The button might be disabled, or the action might require a different trigger.` 
                });
            }
        }, 800); 
    }, 500);
}

function typeTextIntoElement(id, text) {
    const el = document.querySelector(`[data-gemini-id="${id}"]`);
    if (!el) { updateHUD('idle'); return; }

    const previousValue = el.value; // Capture for history
    el.focus();
    if (el.tagName.toLowerCase() === 'select') {
        let optionToSelect = Array.from(el.options).find(opt => 
            opt.value.toLowerCase() === text.toLowerCase() || 
            opt.text.toLowerCase().includes(text.toLowerCase())
        );

        if (optionToSelect) {
            el.value = optionToSelect.value;
        }
    } else {
        el.value = text;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    setTimeout(() => { 
        updateHUD('idle'); 
        // For typing, we usually just report success as 'change' is the goal
        pushToHistory({ type: 'type_text', id: id, oldValue: previousValue });
        safeSendMessage({ 
            type: 'status', 
            action: 'type_text', 
            message: 'success', 
            detail: `Interacted with ${id}. Value set to: ${text}` 
        }); 
        setTimeout(() => captureAndSend(true), 100);
    }, 300);
}

function scrollPage(direction) {
    const scrollAmount = window.innerHeight * 0.8;
    window.scrollBy({ top: direction === 'down' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
    setTimeout(() => { updateHUD('idle'); safeSendMessage({ type: 'status', action: 'scroll_page', message: 'success', detail: `Scrolled ${direction}` }); }, 500);
}

function navigateTo(url) {
    console.log(`🚀 Navigating to: ${url}`);
    updateHUD('processing');
    const textEl = erpShadowRoot?.getElementById('erp-ai-status-text');
    if (textEl) textEl.innerText = `Navigating...`;
    setTimeout(() => { window.location.href = url; }, 500);
}

// Check session status on load (for navigation/reload persistence)
console.log("🔍 Checking session status on load...");
chrome.runtime.sendMessage({ action: 'query_status' }, (response) => {
    if (response && response.status === 'connected') {
        console.log("♻️ Resuming active session...");
        createHUD();
        updateHUD('idle');
        if (response.plan) {
            updatePlanHUD(response.plan);
        }
    }
});

function readText(query) {
    let text = document.body.innerText;
    if (query) {
        const relevantLines = text.split('\n').filter(line => line.toLowerCase().includes(query.toLowerCase()));
        text = relevantLines.join('\n') || `No text found matching "${query}"`;
    }
    safeSendMessage({ type: 'status', action: 'read_text', message: 'success', detail: `Read text result: ${text.substring(0, 1000)}` });
    updateHUD('idle');
}

function highlightElement(id) {
    const el = document.querySelector(`[data-gemini-id="${id}"]`);
    if (!el) { updateHUD('idle'); return; }
    
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // 1. Create Pulse Ring
    const pulse = document.createElement('div');
    pulse.style.cssText = `
        position: fixed;
        left: ${centerX - 25}px;
        top: ${centerY - 25}px;
        width: 50px;
        height: 50px;
        border: 4px solid #FFD700;
        border-radius: 50%;
        pointer-events: none;
        z-index: 2147483646;
        animation: erp-highlight-pulse 1s ease-out infinite;
    `;

    // 2. Create Floating Pointer (SVG Arrow)
    const pointer = document.createElement('div');
    pointer.style.cssText = `
        position: fixed;
        left: ${centerX - 15}px;
        top: ${rect.top - 60}px;
        width: 30px;
        height: 30px;
        pointer-events: none;
        z-index: 2147483646;
        animation: erp-highlight-float 0.6s ease-in-out infinite alternate;
    `;
    pointer.innerHTML = `
        <svg viewBox="0 0 24 24" fill="#FFD700" stroke="#000" stroke-width="1">
            <path d="M12 21l-8-9h6V3h4v9h6l-8 9z"/>
        </svg>
    `;

    // 3. Inject Styles if missing
    if (!document.getElementById('erp-ai-highlight-styles')) {
        const style = document.createElement('style');
        style.id = 'erp-ai-highlight-styles';
        style.innerHTML = `
            @keyframes erp-highlight-pulse {
                0% { transform: scale(0.5); opacity: 1; border-width: 8px; }
                100% { transform: scale(2.5); opacity: 0; border-width: 1px; }
            }
            @keyframes erp-highlight-float {
                0% { transform: translateY(0); }
                100% { transform: translateY(15px); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(pulse);
    document.body.appendChild(pointer);

    // Standard outline fallback
    const originalOutline = el.style.outline;
    el.style.outline = '4px solid #FFD700';

    setTimeout(() => {
        pulse.remove();
        pointer.remove();
        el.style.outline = originalOutline;
        updateHUD('idle');
        safeSendMessage({ type: 'status', action: 'highlight_element', message: 'success', detail: `Highlighted ${id}.` });
    }, 2500);
}

// ============================================================================
// AUDIO PLAYBACK
// ============================================================================

let audioContext;
let nextStartTime = 0;
let activeSources = 0;

function initAudioContext() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    if (audioContext.state === 'suspended') audioContext.resume();
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes.buffer;
}

function playAudio(base64Data, mimeType) {
    if (isSilentMode) return;
    initAudioContext();
    try {
        const arrayBuffer = base64ToArrayBuffer(base64Data);
        const int16Array = new Int16Array(arrayBuffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768.0;
        const buffer = audioContext.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);
        
        scheduleBuffer(buffer);
    } catch (e) { console.error("Error decoding audio:", e); }
}

function scheduleBuffer(buffer) {
    const now = audioContext.currentTime;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    // Pipeline Logic: 
    // If the pipeline is empty or late, start with a 50ms lookahead to prevent jitter.
    // Otherwise, schedule exactly at the end of the previous buffer (nextStartTime).
    const LOOKAHEAD = 0.05;
    if (nextStartTime < now + 0.01) {
        nextStartTime = now + LOOKAHEAD;
        console.log("🎺 Starting new speech burst");
    }

    source.start(nextStartTime);
    
    // Update state
    if (activeSources === 0) {
        isPlaying = true;
        updateHUD('speaking');
        safeSendMessage({ action: 'play_audio' });
    }
    activeSources++;
    
    const duration = buffer.duration;
    const currentChunkEndTime = nextStartTime;
    nextStartTime += duration;

    source.onended = () => {
        activeSources--;
        if (activeSources <= 0) {
            activeSources = 0;
            isPlaying = false;
            lastSpeechEndTime = Date.now();
            nextStartTime = 0;
            updateHUD('idle');
            safeSendMessage({ action: 'stop_audio' });
            console.log("🤐 Speech burst finished");
        }
    };
}
