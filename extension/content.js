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
    document.body.appendChild(container);
    
    erpShadowRoot = container.attachShadow({ mode: 'open' });
    
    const hud = document.createElement('div');
    hud.id = 'erp-ai-hud';
    hud.style.padding = '12px 20px';
    hud.style.backgroundColor = '#222';
    hud.style.color = '#fff';
    hud.style.borderRadius = '40px';
    hud.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    hud.style.fontSize = '14px';
    hud.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
    hud.style.display = 'flex';
    hud.style.alignItems = 'center';
    hud.style.gap = '15px';
    hud.style.border = '1px solid #444';
    hud.style.transition = 'all 0.3s ease';
    
    hud.innerHTML = `
        <style>
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
          #erp-ai-stop-btn:hover { background: rgba(255, 0, 0, 0.3); border-color: #ff5555; transform: translateY(-2px); }
          #erp-ai-stop-btn:active { transform: scale(0.9); }
          #erp-ai-confirm-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 6px 14px;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            display: none;
            transition: all 0.2s;
            box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);
          }
          #erp-ai-confirm-btn:hover { background: #45a049; transform: translateY(-1px); }
          .status-indicator { width: 12px; height: 12px; border-radius: 50%; }
          
          #erp-ai-plan-container {
            position: absolute;
            bottom: 100%;
            right: 0;
            margin-bottom: 15px;
            background: rgba(34, 34, 34, 0.95);
            border: 1px solid #444;
            border-radius: 12px;
            padding: 15px;
            width: 250px;
            display: none;
            flex-direction: column;
            gap: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            backdrop-filter: blur(10px);
          }
          .plan-item {
            font-size: 12px;
            color: #ccc;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .plan-item.done { color: #4CAF50; text-decoration: line-through; }
          .plan-item.active { color: #fff; font-weight: 600; }
        </style>
        
        <div id="erp-ai-plan-container"></div>

        <div id="erp-ai-indicator" class="status-indicator" style="background-color: #4CAF50; animation: erp-pulse-green 1.5s infinite;"></div>
        <span id="erp-ai-status-text" style="font-weight: 600; min-width: 90px; color: #eee;">AI Online</span>
        
        <div style="display: flex; gap: 10px; align-items: center;">
            <button id="erp-ai-confirm-btn">Confirm Action</button>
            <button id="erp-ai-stop-btn" title="Exit Autopilot" style="
                background: rgba(255, 0, 0, 0.1);
                border: 1px solid rgba(255, 0, 0, 0.3);
                color: #ff5555;
                padding: 0;
                border-radius: 50%;
                cursor: pointer;
                width: 42px;
                height: 42px;
                display: flex;
                align-items: center;
                justify-content: center;
                outline: none;
                transition: all 0.2s;
            ">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        </div>
        <div id="erp-ai-transcript" style="
            border-left: 1px solid #444;
            padding-left: 15px;
            font-size: 12px;
            color: #aaa;
            max-width: 200px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 400;
        ">Waiting for sound...</div>
        <div id="erp-ai-volume-container" style="
            width: 40px;
            height: 4px;
            background: #333;
            border-radius: 2px;
            overflow: hidden;
            display: none;
        ">
            <div id="erp-ai-volume-meter" style="width: 0%; height: 100%; background: #4CAF50; transition: width 0.1s;"></div>
        </div>
    `;
    
    erpShadowRoot.appendChild(hud);
    
    const stopBtn = erpShadowRoot.getElementById('erp-ai-stop-btn');
    stopBtn.addEventListener('click', () => safeSendMessage({ action: 'stop_session' }));

    const confirmBtn = erpShadowRoot.getElementById('erp-ai-confirm-btn');
    confirmBtn.addEventListener('click', () => {
        safeSendMessage({ type: 'action', action: 'confirm' });
        confirmBtn.style.display = 'none';
    });
    
    console.log("✅ HUD created successfully in Shadow DOM");
}

function removeHUD() {
    const container = document.getElementById('erp-ai-hud-container');
    if (container) container.remove();
    erpShadowRoot = null;
}

function updateHUD(status) {
    if (!erpShadowRoot) return;
    const text = erpShadowRoot.getElementById('erp-ai-status-text');
    const indicator = erpShadowRoot.getElementById('erp-ai-indicator');
    const confirmBtn = erpShadowRoot.getElementById('erp-ai-confirm-btn');
    if (!text || !indicator) return;

    if (status === 'listening') {
        text.innerText = 'Listening...';
        indicator.style.backgroundColor = '#f44336';
        indicator.style.animation = 'erp-pulse-red 1s infinite';
        erpShadowRoot.getElementById('erp-ai-volume-container').style.display = 'block';
    } else if (status === 'idle') {
        text.innerText = 'AI Online';
        indicator.style.backgroundColor = '#4CAF50';
        indicator.style.animation = 'erp-pulse-green 1.5s infinite';
        erpShadowRoot.getElementById('erp-ai-volume-container').style.display = 'block';
    } else if (status === 'speaking') {
        text.innerText = 'AI Speaking...';
        indicator.style.backgroundColor = '#2196F3';
        indicator.style.animation = 'none';
        erpShadowRoot.getElementById('erp-ai-volume-container').style.display = 'none';
    } else if (status === 'processing') {
        text.innerText = 'Thinking...';
        indicator.style.backgroundColor = '#FFC107';
        indicator.style.animation = 'erp-pulse-yellow 1s infinite';
        erpShadowRoot.getElementById('erp-ai-volume-container').style.display = 'none';
    } else if (status === 'confirm') {
        text.innerText = 'Verify Action';
        indicator.style.backgroundColor = '#4CAF50';
        indicator.style.animation = 'erp-pulse-green 1s infinite';
        if (confirmBtn) confirmBtn.style.display = 'block';
    }
}

function updatePlanHUD(steps) {
    if (!erpShadowRoot) return;
    const container = erpShadowRoot.getElementById('erp-ai-plan-container');
    if (!container) return;

    if (!steps || steps.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = `
        <div style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 5px;">Current Plan</div>
        ${steps.map((step, i) => `
            <div class="plan-item ${i === 0 ? 'active' : ''}">
                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${i === 0 ? '#fff' : '#555'}"></div>
                ${step}
            </div>
        `).join('')}
    `;
}

function updateTranscriptHUD(source, transcript) {
    if (!erpShadowRoot) return;
    const el = erpShadowRoot.getElementById('erp-ai-transcript');
    if (!el) return;
    const prefix = source === 'USER' ? '👤' : (source === 'SYSTEM' ? '🛡️' : '🤖');
    el.innerText = `${prefix} ${transcript}`;
    el.style.color = source === 'USER' ? '#eee' : (source === 'SYSTEM' ? '#FFC107' : '#2196F3');
    
    // Clear transcript after 5 seconds if not updated
    if (el.transcriptTimeout) clearTimeout(el.transcriptTimeout);
    el.transcriptTimeout = setTimeout(() => {
        el.innerText = '...';
        el.style.color = '#555';
    }, 5000);
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
    if (message.action === 'ws_connected') {
        createHUD();
        // Set volume container visible when connected
        const vol = erpShadowRoot?.getElementById('erp-ai-volume-container');
        if (vol) vol.style.display = 'block';
        
        startRecording();
        
        // Immediate sync on connect
        setTimeout(() => captureAndSend(), 500);

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
            updateHUD('confirm');
        } else if (message.command === 'hide_confirm_ui') {
            const confirmBtn = erpShadowRoot?.getElementById('erp-ai-confirm-btn');
            if (confirmBtn) confirmBtn.style.display = 'none';
            updateHUD('idle');
        } else if (message.command === 'update_plan') {
            updatePlanHUD(message.steps);
        }
    } else if (message.type === 'transcription') {
        updateTranscriptHUD(message.source, message.text);
    } else if (message.type === 'audio') {
        playAudio(message.data, message.mime_type);
    } else if (message.type === 'error') {
        alert(message.message);
        safeSendMessage({ action: 'stop_session' });
    } else if (message.action === 'stop') {
        stopRecording(); removeHUD();
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

function getSimplifiedAccessibilityTree() {
    const interactiveElements = [];
    const selector = 'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
    const elements = document.querySelectorAll(selector);

    // Track ID collisions to ensure uniqueness in a single turn
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

            let elementData = {
                id: finalId,
                tagName: el.tagName.toLowerCase(),
                label: (el.innerText || el.getAttribute('aria-label') || el.placeholder || el.title || "").trim(),
                role: el.getAttribute('role') || el.type || "",
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
            };

            // Add options for select elements
            if (el.tagName.toLowerCase() === 'select') {
                elementData.options = Array.from(el.options)
                    .filter(opt => opt.value !== "")
                    .map(opt => ({ value: opt.value, text: opt.text }));
                // Limit label for selects to just the current value or label
                elementData.label = (el.labels && el.labels.length > 0 ? el.labels[0].innerText : (el.placeholder || el.title || "Select Field")).trim();
            }

            interactiveElements.push(elementData);
            el.setAttribute('data-gemini-id', finalId);
        }
    });
    return interactiveElements;
}
// ==============================================================================
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

        workletNode.port.onmessage = (event) => {
            const msg = event.data;
            if (msg.type === 'pcm_data') {
                const inputChannel = msg.buffer; // Raw Float32Array from worklet

                // Downsample to 16kHz
                const downsampled = downsampleBuffer(inputChannel, audioInputContext.sampleRate, 16000);

                // Convert to PCM16
                const pcm16Buffer = convertFloat32ToInt16(downsampled);
                const pcm16Array = new Int16Array(pcm16Buffer);

                let maxVal = 0;
                for (let j = 0; j < pcm16Array.length; j++) {
                    const abs = Math.abs(pcm16Array[j]);
                    if (abs > maxVal) maxVal = abs;
                }
                const volumePercent = Math.min(100, (maxVal / 32768) * 100);
                const meter = erpShadowRoot?.getElementById('erp-ai-volume-meter');
                if (meter) meter.style.width = `${volumePercent}%`;

                const base64Audio = arrayBufferToBase64(pcm16Buffer);
                safeSendMessage({ action: 'send_audio', data: base64Audio });

                totalSentChunks++;
                if (totalSentChunks % 20 === 0) {
                    console.log(`🎤 Audio Stream: Sent ${totalSentChunks} chunks (Vol: ${volumePercent.toFixed(1)}%)`);
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
    if (workletNode) { workletNode.disconnect(); workletNode = null; }
    if (audioInputContext) { audioInputContext.close(); audioInputContext = null; }
    if (audioStream) { audioStream.getTracks().forEach(track => track.stop()); audioStream = null; }
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
    const originalOutline = el.style.outline;
    const originalBoxShadow = el.style.boxShadow;
    el.style.transition = 'all 0.3s ease-in-out';
    el.style.outline = '5px solid #FFD700';
    el.style.boxShadow = '0 0 20px #FFD700';
    setTimeout(() => {
        el.style.outline = originalOutline;
        el.style.boxShadow = originalBoxShadow;
        updateHUD('idle');
        safeSendMessage({ type: 'status', action: 'highlight_element', message: 'success', detail: `Highlighted ${id}.` });
    }, 2000);
}

// ============================================================================
// AUDIO PLAYBACK
// ============================================================================

let audioContext;
let audioQueue = [];
let nextStartTime = 0;

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
    initAudioContext();
    try {
        const arrayBuffer = base64ToArrayBuffer(base64Data);
        const int16Array = new Int16Array(arrayBuffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768.0;
        const buffer = audioContext.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);
        audioQueue.push(buffer);
        playNextInQueue();
    } catch (e) { console.error("Error decoding audio:", e); }
}

function playNextInQueue() {
    if (audioQueue.length === 0 || (isPlaying && audioContext.currentTime < nextStartTime)) return;
    isPlaying = true;
    const buffer = audioQueue.shift();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    if (nextStartTime < audioContext.currentTime) nextStartTime = audioContext.currentTime;
    source.start(nextStartTime);
    nextStartTime += buffer.duration;
    source.onended = () => {
        if (audioQueue.length === 0) { 
            isPlaying = false; 
            lastSpeechEndTime = Date.now();
            nextStartTime = 0; 
            updateHUD('idle'); 
        } 
        else { playNextInQueue(); }
    };
}
