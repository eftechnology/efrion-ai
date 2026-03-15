let screenCaptureIntervalId = null; 
let screenCaptureInterval = 5000;
let domDirty = true;
let cachedAccessibilityTree = [];
let mutationObserver = null;
let isPushToTalkActive = false;
let isPlaying = false; 
let lastSpeechEndTime = 0;
const POST_SPEECH_COOLDOWN_MS = 5000;
let isCoolingDown = false;
let lastTreeJson = ''; // Used to track DOM changes

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
// IN-PAGE HUD
// ==============================================================================
function createHUD() {
    console.log("🛠️ createHUD() called");
    if (document.getElementById('erp-ai-hud')) {
        console.log("⚠️ HUD already exists");
        return;
    }
    
    const hud = document.createElement('div');
    hud.id = 'erp-ai-hud';
    hud.style.position = 'fixed';
    hud.style.bottom = '30px';
    hud.style.right = '30px';
    hud.style.padding = '12px 20px';
    hud.style.backgroundColor = '#222';
    hud.style.color = '#fff';
    hud.style.borderRadius = '40px';
    hud.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    hud.style.fontSize = '14px';
    hud.style.zIndex = '2147483647';
    hud.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)';
    hud.style.display = 'flex';
    hud.style.alignItems = 'center';
    hud.style.gap = '15px';
    hud.style.border = '1px solid #444';
    hud.style.transition = 'all 0.3s ease';
    
    hud.innerHTML = `
        <div id="erp-ai-indicator" style="width: 12px; height: 12px; border-radius: 50%; background-color: #4CAF50; animation: erp-pulse-green 1.5s infinite;"></div>
        <span id="erp-ai-status-text" style="font-weight: 600; min-width: 90px; color: #eee;">AI Online</span>
        
        <div style="display: flex; gap: 10px; align-items: center;">
            <button id="erp-ai-mic-btn" title="Hold to Speak (Alt)" style="
                background: #333;
                border: 1px solid #555;
                color: white;
                padding: 0;
                border-radius: 50%;
                cursor: pointer;
                width: 42px;
                height: 42px;
                display: flex;
                align-items: center;
                justify-content: center;
                outline: none;
                transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            ">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.34 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
            </button>

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
    
    const style = document.createElement('style');
    style.id = 'erp-ai-style';
    style.innerHTML = `
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
      #erp-ai-mic-btn:hover { background: #444; border-color: #777; transform: translateY(-2px); }
      #erp-ai-mic-btn:active { transform: scale(0.9); }
      #erp-ai-mic-btn.active { background: #f44336; border-color: #f44336; color: white; animation: erp-pulse-red 1s infinite; }
      #erp-ai-stop-btn:hover { background: rgba(255, 0, 0, 0.3); border-color: #ff5555; transform: translateY(-2px); }
      #erp-ai-stop-btn:active { transform: scale(0.9); }
    `;
    document.head.appendChild(style);
    document.body.appendChild(hud);

    const micBtn = document.getElementById('erp-ai-mic-btn');
    const stopBtn = document.getElementById('erp-ai-stop-btn');
    
    const startPTT = (e) => { return; 
        if (e) e.preventDefault();
        if (!isPushToTalkActive) {
            isPushToTalkActive = true;
            micBtn.classList.add('active');
            updateHUD('listening');
            console.log("🎤 Mic Open (PTT)");
        }
    };

    const stopPTT = (e) => { return; 
        if (isPushToTalkActive) {
            isPushToTalkActive = false;
            micBtn.classList.remove('active');
            updateHUD('idle');
            console.log("🔇 Mic Closed (PTT)");
        }
    };

    micBtn.addEventListener('mousedown', startPTT);
    window.addEventListener('mouseup', stopPTT);
    stopBtn.addEventListener('click', () => safeSendMessage({ action: 'stop_session' }));
    
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Alt' && !isPushToTalkActive) startPTT(e);
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Alt') stopPTT(e);
    });
    console.log("✅ HUD created successfully");
}

function removeHUD() {
    const hud = document.getElementById('erp-ai-hud');
    const style = document.getElementById('erp-ai-style');
    if (hud) hud.remove();
    if (style) style.remove();
}

function updateHUD(status) {
    const text = document.getElementById('erp-ai-status-text');
    const indicator = document.getElementById('erp-ai-indicator');
    if (!text || !indicator) return;

    if (status === 'listening') {
        text.innerText = 'Listening...';
        indicator.style.backgroundColor = '#f44336';
        indicator.style.animation = 'erp-pulse-red 1s infinite';
    } else if (status === 'idle') {
        text.innerText = 'AI Online';
        indicator.style.backgroundColor = '#4CAF50';
        indicator.style.animation = 'erp-pulse-green 1.5s infinite';
    } else if (status === 'speaking') {
        text.innerText = 'AI Speaking...';
        indicator.style.backgroundColor = '#2196F3';
        indicator.style.animation = 'none';
        document.getElementById('erp-ai-volume-container').style.display = 'none';
    } else if (status === 'processing') {
        text.innerText = 'Executing...';
        indicator.style.backgroundColor = '#FFC107';
        indicator.style.animation = 'none';
        document.getElementById('erp-ai-volume-container').style.display = 'none';
    }
}

function updateTranscriptHUD(source, transcript) {
    const el = document.getElementById('erp-ai-transcript');
    if (!el) return;
    const prefix = source === 'USER' ? '👤' : '🤖';
    el.innerText = `${prefix} ${transcript}`;
    el.style.color = source === 'USER' ? '#eee' : '#2196F3';
    
    // Clear transcript after 5 seconds if not updated
    if (el.transcriptTimeout) clearTimeout(el.transcriptTimeout);
    el.transcriptTimeout = setTimeout(() => {
        el.innerText = '...';
        el.style.color = '#555';
    }, 5000);
}

function captureAndSend(domOnly = false) {
    if (isCoolingDown || isPlaying) return; // Completely silent during speech or cooldown

    let treeToSend = null;
    if (domDirty) {
        const tree = getSimplifiedAccessibilityTree();
        const treeJson = JSON.stringify(tree);
        
        // Only send if the tree has actually changed
        if (treeJson !== lastTreeJson) {
            treeToSend = tree;
            lastTreeJson = treeJson;
        }
        domDirty = false;
    }

    // Only skip image capture if explicitly told or if just sent recently (logic can be expanded)
    const pageState = {
        url: window.location.href,
        title: document.title,
        readyState: document.readyState,
        accessibilityTree: treeToSend,
        domChanged: treeToSend !== null
    };

    // If nothing changed and we aren't sending an image, don't send anything
    if (!treeToSend && domOnly) return;

    safeSendMessage({ action: 'capture_screen', skipImage: domOnly, pageState: pageState });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ws_connected') {
        createHUD();
        // Set volume container visible when connected
        const vol = document.getElementById('erp-ai-volume-container');
        if (vol) vol.style.display = 'block';
        
        startRecording();
        if (!mutationObserver) {
            mutationObserver = new MutationObserver(() => domDirty = true);
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
                const remaining = Math.ceil((POST_SPEECH_COOLDOWN_MS - (now - lastSpeechEndTime)) / 1000);
                console.log(`⏳ Post-speech cooldown active (${remaining}s remaining)...`);
                return;
            }

            captureAndSend();
        }, screenCaptureInterval);
    } else if (message.type === 'command') {
        updateHUD('processing');
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

function getSimplifiedAccessibilityTree() {
    const interactiveElements = [];
    const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])');
    elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.left >= 0 && 
            rect.bottom <= window.innerHeight && rect.right <= window.innerWidth) {
            interactiveElements.push({
                id: `el-${index}`,
                tagName: el.tagName.toLowerCase(),
                label: el.innerText?.trim() || el.placeholder || el.getAttribute('aria-label') || '',
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
            });
            el.setAttribute('data-gemini-id', `el-${index}`);
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
                const meter = document.getElementById('erp-ai-volume-meter');
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
    if (!el) return;
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
        setTimeout(() => { cursor.remove(); updateHUD('idle'); safeSendMessage({ action: 'action_completed', detail: `Clicked ${id}` }); }, 300);
    }, 500);
}

function typeTextIntoElement(id, text) {
    const el = document.querySelector(`[data-gemini-id="${id}"]`);
    if (!el) { updateHUD('idle'); return; }
    el.focus(); el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(() => { updateHUD('idle'); safeSendMessage({ action: 'action_completed', detail: `Typed into ${id}` }); }, 300);
}

function scrollPage(direction) {
    const scrollAmount = window.innerHeight * 0.8;
    window.scrollBy({ top: direction === 'down' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
    setTimeout(() => { updateHUD('idle'); safeSendMessage({ action: 'action_completed', detail: `Scrolled ${direction}` }); }, 500);
}

function navigateTo(url) {
    console.log(`🚀 Navigating to: ${url}`);
    updateHUD('processing');
    const textEl = document.getElementById('erp-ai-status-text');
    if (textEl) textEl.innerText = `Navigating...`;
    setTimeout(() => { window.location.href = url; }, 500);
}

// Check session status on load (for navigation/reload persistence)
console.log("🔍 Checking session status on load...");
chrome.runtime.sendMessage({ action: 'query_status' }, (response) => {
    if (response && response.status === 'connected') {
        console.log("♻️ Resuming active session...");
    }
});

function readText(query) {
    let text = document.body.innerText;
    if (query) {
        const relevantLines = text.split('\n').filter(line => line.toLowerCase().includes(query.toLowerCase()));
        text = relevantLines.join('\n') || `No text found matching "${query}"`;
    }
    safeSendMessage({ action: 'action_completed', detail: `Read text result: ${text.substring(0, 1000)}` });
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
        safeSendMessage({ action: 'action_completed', detail: `Highlighted ${id}.` });
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
