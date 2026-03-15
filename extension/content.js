let screenCaptureInterval;
let domDirty = true;
let cachedAccessibilityTree = [];
let mutationObserver = null;
let isPushToTalkActive = false;

// ==============================================================================
// IN-PAGE HUD
// ==============================================================================
function createHUD() {
    if (document.getElementById('erp-ai-hud')) return;
    const hud = document.createElement('div');
    hud.id = 'erp-ai-hud';
    hud.style.position = 'fixed';
    hud.style.bottom = '20px';
    hud.style.right = '20px';
    hud.style.padding = '10px 15px';
    hud.style.backgroundColor = 'rgba(40, 40, 40, 0.95)';
    hud.style.color = '#fff';
    hud.style.borderRadius = '30px';
    hud.style.fontFamily = 'Segoe UI, Tahoma, sans-serif';
    hud.style.fontSize = '14px';
    hud.style.zIndex = '9999999';
    hud.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
    hud.style.display = 'flex';
    hud.style.alignItems = 'center';
    hud.style.gap = '12px';
    hud.style.backdropFilter = 'blur(10px)';
    hud.style.border = '1px solid rgba(255,255,255,0.1)';
    hud.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    hud.innerHTML = `
        <div id="erp-ai-indicator" style="width: 12px; height: 12px; border-radius: 50%; background-color: #4CAF50; animation: erp-pulse-green 1.5s infinite;"></div>
        <span id="erp-ai-status-text" style="font-weight: 500; min-width: 100px;">AI Connected</span>
        
        <div style="display: flex; gap: 8px; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 12px;">
            <!-- Push-to-Talk Button -->
            <button id="erp-ai-mic-btn" title="Hold to Speak (Alt)" style="
                background: #444;
                border: none;
                color: white;
                padding: 8px;
                border-radius: 50%;
                cursor: pointer;
                width: 38px;
                height: 38px;
                display: flex;
                align-items: center;
                justify-content: center;
                outline: none;
                transition: all 0.2s;
            ">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.34 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
            </button>

            <!-- Stop Session Button -->
            <button id="erp-ai-stop-btn" title="Stop Autopilot" style="
                background: rgba(244, 67, 54, 0.2);
                border: none;
                color: #f44336;
                padding: 8px;
                border-radius: 50%;
                cursor: pointer;
                width: 38px;
                height: 38px;
                display: flex;
                align-items: center;
                justify-content: center;
                outline: none;
                transition: all 0.2s;
            ">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M6 6h12v12H6z"/>
                </svg>
            </button>
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
        70% { transform: scale(1.1); box-shadow: 0 0 0 14px rgba(244, 67, 54, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
      }
      #erp-ai-mic-btn:hover { background: #555; }
      #erp-ai-mic-btn:active { transform: scale(0.9); }
      #erp-ai-mic-btn.active { background: #f44336; color: white; animation: erp-pulse-red 1s infinite; }
      #erp-ai-stop-btn:hover { background: rgba(244, 67, 54, 0.4); }
      #erp-ai-stop-btn:active { transform: scale(0.9); }
    `;
    document.head.appendChild(style);
    document.body.appendChild(hud);

    const micBtn = document.getElementById('erp-ai-mic-btn');
    const stopBtn = document.getElementById('erp-ai-stop-btn');
    
    // Push-to-Talk Event Listeners
    const startPTT = (e) => {
        if (e) e.preventDefault();
        if (!isPushToTalkActive) {
            isPushToTalkActive = true;
            micBtn.classList.add('active');
            updateHUD('listening');
            console.log("🎤 Mic Open (PTT)");
        }
    };

    const stopPTT = (e) => {
        if (isPushToTalkActive) {
            isPushToTalkActive = false;
            micBtn.classList.remove('active');
            updateHUD('idle');
            console.log("🔇 Mic Closed (PTT)");
        }
    };

    micBtn.addEventListener('mousedown', startPTT);
    window.addEventListener('mouseup', stopPTT);
    
    stopBtn.addEventListener('click', () => {
        console.log("🛑 Stopping session from HUD...");
        chrome.runtime.sendMessage({ action: 'stop_session' });
    });
    
    // Keybind: Hold 'Alt' key to speak
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Alt' && !isPushToTalkActive) {
            startPTT(e);
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Alt') stopPTT(e);
    });
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
        text.innerText = 'AI Connected';
        indicator.style.backgroundColor = '#4CAF50';
        indicator.style.animation = 'erp-pulse-green 1.5s infinite';
    } else if (status === 'speaking') {
        text.innerText = 'AI Speaking...';
        indicator.style.backgroundColor = '#2196F3';
        indicator.style.animation = 'none';
    } else if (status === 'processing') {
        text.innerText = 'Executing...';
        indicator.style.backgroundColor = '#FFC107';
        indicator.style.animation = 'none';
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`📩 Content script received message: ${JSON.stringify(message)}`);
    if (message.action === 'ws_connected') {
        createHUD();
        startRecording();
        
        if (!mutationObserver) {
            mutationObserver = new MutationObserver(() => {
                domDirty = true;
            });
            mutationObserver.observe(document.body, { 
                childList: true, 
                subtree: true, 
                attributes: true, 
                attributeFilter: ['class', 'style', 'hidden', 'disabled'] 
            });
        }
        
        screenCaptureInterval = setInterval(() => {
            let treeToSend = null;
            if (domDirty) {
                cachedAccessibilityTree = getSimplifiedAccessibilityTree();
                treeToSend = cachedAccessibilityTree;
                domDirty = false;
            }
            
            const pageState = {
                url: window.location.href,
                title: document.title,
                readyState: document.readyState,
                accessibilityTree: treeToSend,
                domChanged: treeToSend !== null
            };
            chrome.runtime.sendMessage({ action: 'capture_screen', pageState: pageState });
        }, 1500);
        
    } else if (message.type === 'command') {
        updateHUD('processing');
        if (message.command === 'stop_audio') {
            audioQueue = [];
            isPlaying = false;
            nextStartTime = 0;
            if (audioContext && audioContext.state === 'running') {
                audioContext.suspend().then(() => audioContext.resume());
            }
            updateHUD('idle');
        } else if (message.command === 'click_element') {
            simulateClickWithGhostCursor(message.id);
        } else if (message.command === 'type_text') {
            typeTextIntoElement(message.id, message.text);
        } else if (message.command === 'scroll_page') {
            scrollPage(message.direction);
        } else if (message.command === 'navigate_to') {
            navigateTo(message.url);
        } else if (message.command === 'read_text') {
            readText(message.query);
        } else if (message.command === 'highlight_element') {
            highlightElement(message.id);
        }
    } else if (message.type === 'audio') {
        updateHUD('speaking');
        playAudio(message.data, message.mime_type);
        
    } else if (message.type === 'error') {
        alert(message.message);
        chrome.runtime.sendMessage({ action: 'stop_session' });

    } else if (message.action === 'stop') {
        stopRecording();
        removeHUD();
        clearInterval(screenCaptureInterval);
        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }
    }
});

function getSimplifiedAccessibilityTree() {
    const interactiveElements = [];
    const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])');
    
    elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && 
            rect.top >= 0 && rect.left >= 0 && 
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
// AUDIO RECORDING
// ==============================================================================

let audioInputContext;
let audioStream;
let processor;

async function startRecording() {
    console.log("🎙️ Initializing Audio Pipeline...");
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioInputContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        await audioInputContext.resume();

        const source = audioInputContext.createMediaStreamSource(audioStream);
        processor = audioInputContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
            if (!isPushToTalkActive) return;

            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Audio = reader.result.split(',')[1];
                chrome.runtime.sendMessage({ action: 'send_audio', data: base64Audio });
            };
            reader.readAsDataURL(new Blob([pcmData.buffer]));
        };

        source.connect(processor);
        processor.connect(audioInputContext.destination);
        console.log("✅ Audio Pipeline Ready. Hold Mic Button or 'Alt' to speak.");
        
    } catch (err) {
        console.error("Error accessing microphone:", err);
        chrome.runtime.sendMessage({ action: 'stop_session' });
    }
}

function stopRecording() {
    if (processor) {
        processor.disconnect();
        processor.onaudioprocess = null;
        processor = null;
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
        updateHUD('idle');
        return;
    }
    
    const rect = el.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    
    const cursor = document.createElement('div');
    cursor.style.position = 'fixed';
    cursor.style.left = `${window.innerWidth / 2}px`;
    cursor.style.top = `${window.innerHeight / 2}px`;
    cursor.style.width = '20px';
    cursor.style.height = '20px';
    cursor.style.backgroundColor = 'rgba(255, 51, 102, 0.7)';
    cursor.style.borderRadius = '50%';
    cursor.style.zIndex = '999999';
    cursor.style.pointerEvents = 'none';
    cursor.style.transition = 'all 0.5s ease-out';
    cursor.style.boxShadow = '0 0 10px rgba(255, 51, 102, 0.5)';
    document.body.appendChild(cursor);
    
    requestAnimationFrame(() => {
        cursor.style.left = `${targetX - 10}px`;
        cursor.style.top = `${targetY - 10}px`;
    });
    
    setTimeout(() => {
        cursor.style.transform = 'scale(2)';
        cursor.style.opacity = '0';
        el.click();
        setTimeout(() => {
            cursor.remove();
            updateHUD('idle');
            chrome.runtime.sendMessage({ action: 'action_completed', detail: `Clicked ${id}` });
        }, 300);
    }, 500);
}

function typeTextIntoElement(id, text) {
    const el = document.querySelector(`[data-gemini-id="${id}"]`);
    if (!el) {
        updateHUD('idle');
        return;
    }
    el.focus();
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(() => {
        updateHUD('idle');
        chrome.runtime.sendMessage({ action: 'action_completed', detail: `Typed into ${id}` });
    }, 300);
}

function scrollPage(direction) {
    const scrollAmount = window.innerHeight * 0.8;
    window.scrollBy({ top: direction === 'down' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
    setTimeout(() => {
        updateHUD('idle');
        chrome.runtime.sendMessage({ action: 'action_completed', detail: `Scrolled ${direction}` });
    }, 500);
}

function navigateTo(url) {
    updateHUD('processing');
    const textEl = document.getElementById('erp-ai-status-text');
    if (textEl) textEl.innerText = `Navigating...`;
    setTimeout(() => { window.location.href = url; }, 500);
}

function readText(query) {
    let text = document.body.innerText;
    if (query) {
        const relevantLines = text.split('\n').filter(line => line.toLowerCase().includes(query.toLowerCase()));
        text = relevantLines.join('\n') || `No text found matching "${query}"`;
    }
    chrome.runtime.sendMessage({ action: 'action_completed', detail: `Read text result: ${text.substring(0, 1000)}` });
    updateHUD('idle');
}

function highlightElement(id) {
    const el = document.querySelector(`[data-gemini-id="${id}"]`);
    if (!el) {
        updateHUD('idle');
        return;
    }
    const originalOutline = el.style.outline;
    const originalBoxShadow = el.style.boxShadow;
    el.style.transition = 'all 0.3s ease-in-out';
    el.style.outline = '5px solid #FFD700';
    el.style.boxShadow = '0 0 20px #FFD700';
    
    setTimeout(() => {
        el.style.outline = originalOutline;
        el.style.boxShadow = originalBoxShadow;
        updateHUD('idle');
        chrome.runtime.sendMessage({ action: 'action_completed', detail: `Highlighted ${id}.` });
    }, 2000);
}

// ============================================================================
// AUDIO PLAYBACK
// ============================================================================

let audioContext;
let audioQueue = [];
let isPlaying = false;
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
            nextStartTime = 0; 
            updateHUD('idle');
        } else { playNextInQueue(); }
    };
}
