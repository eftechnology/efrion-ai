let screenCaptureInterval;
let domDirty = true;
let cachedAccessibilityTree = [];
let mutationObserver = null;

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
    hud.style.backgroundColor = '#333';
    hud.style.color = '#fff';
    hud.style.borderRadius = '20px';
    hud.style.fontFamily = 'sans-serif';
    hud.style.fontSize = '14px';
    hud.style.zIndex = '9999999';
    hud.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    hud.style.display = 'flex';
    hud.style.alignItems = 'center';
    hud.style.gap = '8px';
    hud.innerHTML = `
        <div id="erp-ai-indicator" style="width: 10px; height: 10px; border-radius: 50%; background-color: #4CAF50; animation: erp-pulse-green 1.5s infinite;"></div>
        <span id="erp-ai-status-text">AI Listening...</span>
    `;
    
    const style = document.createElement('style');
    style.id = 'erp-ai-style';
    style.innerHTML = `
      @keyframes erp-pulse-green {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
        70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
      }
      @keyframes erp-pulse-blue {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
        70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(33, 150, 243, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(hud);
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
        text.innerText = 'AI Listening...';
        indicator.style.backgroundColor = '#4CAF50';
        indicator.style.animation = 'erp-pulse-green 1.5s infinite';
    } else if (status === 'speaking') {
        text.innerText = 'AI Speaking...';
        indicator.style.backgroundColor = '#2196F3';
        indicator.style.animation = 'erp-pulse-blue 1.5s infinite';
    } else if (status === 'processing') {
        text.innerText = 'AI Executing Action...';
        indicator.style.backgroundColor = '#FFC107';
        indicator.style.animation = 'none';
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`📩 Content script received message: ${JSON.stringify(message)}`);
    if (message.action === 'ws_connected') {
        console.log("🟢 WebSocket connected, initializing HUD and recording...");
        createHUD();
        startRecording();
        
        // Setup MutationObserver to track DOM changes
        if (!mutationObserver) {
            console.log("👁️ Setting up MutationObserver...");
            mutationObserver = new MutationObserver(() => {
                domDirty = true;
            });
            // We observe the body, ignoring our own HUD and Ghost Cursor elements
            mutationObserver.observe(document.body, { 
                childList: true, 
                subtree: true, 
                attributes: true, 
                attributeFilter: ['class', 'style', 'hidden', 'disabled'] 
            });
        }
        
        // Start taking screenshots and capturing page state every 1.5 seconds
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
            chrome.runtime.sendMessage({ 
                action: 'capture_screen', 
                pageState: pageState 
            });
        }, 1500);
        
    } else if (message.type === 'command') {
        updateHUD('processing');
        if (message.command === 'stop_audio') {
            audioQueue = [];
            isPlaying = false;
            nextStartTime = 0;
            console.log("🛑 Audio playback interrupted and flushed.");
            if (audioContext && audioContext.state === 'running') {
                audioContext.suspend().then(() => audioContext.resume());
            }
            updateHUD('listening');
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
        // Play the text-to-speech audio received from Gemini
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

/**
 * Extracts a simplified representation of the DOM/Accessibility tree
 * focusing on interactive elements.
 */
function getSimplifiedAccessibilityTree() {
    const interactiveElements = [];
    const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])');
    
    elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        // Only include elements visible in the viewport
        if (rect.width > 0 && rect.height > 0 && 
            rect.top >= 0 && rect.left >= 0 && 
            rect.bottom <= window.innerHeight && rect.right <= window.innerWidth) {
            
            interactiveElements.push({
                id: `el-${index}`,
                tagName: el.tagName.toLowerCase(),
                type: el.type || '',
                label: el.innerText?.trim() || el.placeholder || el.getAttribute('aria-label') || '',
                role: el.getAttribute('role') || '',
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                rect: {
                    x: Math.round(rect.left),
                    y: Math.round(rect.top),
                    w: Math.round(rect.width),
                    h: Math.round(rect.height)
                }
            });
            
            // Tag the element with a temporary ID for the AI to reference
            el.setAttribute('data-gemini-id', `el-${index}`);
        }
    });
    
    return interactiveElements;
}

// ==============================================================================
// AUDIO RECORDING: Captures User Voice and converts to 16kHz PCM
// Reverted to ScriptProcessorNode for maximum compatibility with Extensions.
// ==============================================================================

let audioInputContext;
let audioStream;
let processor;

async function checkPermissions() {
    try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        
        if (permissionStatus.state === 'denied') {
            alert("❌ Microphone access is BLOCKED for this site. Please click the 'Lock' icon in your browser address bar and allow 'Microphone' to use the AI Autopilot.");
            return false;
        }
        
        return true;
    } catch (err) {
        console.warn("Permissions API check failed:", err);
        return true; 
    }
}

async function startRecording() {
    console.log("🎙️ startRecording() called");
    const hasPermission = await checkPermissions();
    if (!hasPermission) {
        console.warn("🚫 Microphone permission denied or blocked");
        chrome.runtime.sendMessage({ action: 'stop_session' });
        return;
    }

    try {
        console.log("🎤 Requesting microphone access...");
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("✅ Microphone access granted");

        // Use 16kHz mono as expected by Gemini
        audioInputContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        console.log(`🔊 AudioContext created, state: ${audioInputContext.state}`);
        
        // CRITICAL: Resume context (browsers often start it in 'suspended' state)
        await audioInputContext.resume();
        console.log(`🔊 AudioContext resumed, state: ${audioInputContext.state}`);

        const source = audioInputContext.createMediaStreamSource(audioStream);
        
        // Use ScriptProcessorNode (deprecated but reliable for extension content scripts)
        processor = audioInputContext.createScriptProcessor(4096, 1, 1);
        
        let chunkCount = 0;
        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                // Float32 to Int16 conversion
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
            }
            
            // Convert to base64 using a reliable method
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Audio = reader.result.split(',')[1];
                chrome.runtime.sendMessage({ action: 'send_audio', data: base64Audio });
                chunkCount++;
                if (chunkCount % 20 === 0) {
                    console.log(`🎤 Sent ${chunkCount} audio chunks to backend`);
                }
            };
            reader.readAsDataURL(new Blob([pcmData.buffer]));
        };

        source.connect(processor);
        processor.connect(audioInputContext.destination);
        console.log("🎤 Started recording 16kHz PCM audio via ScriptProcessorNode");
        
    } catch (err) {
        console.error("Error accessing microphone:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            alert("❌ Microphone access denied! Please allow microphone access in your browser settings to use the AI Autopilot.");
        } else {
            alert(`⚠️ Error accessing microphone: ${err.message}`);
        }
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
    console.log("⏹️ Stopped recording");
}

// ==============================================================================
// UI AUTOMATION: Executes Tools/Function Calls from Gemini
// ==============================================================================

function simulateClickWithGhostCursor(id) {
    const el = document.querySelector(`[data-gemini-id="${id}"]`);
    if (!el) {
        console.warn(`Element with id ${id} not found.`);
        return;
    }
    
    const rect = el.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    
    // Create Ghost Cursor
    const cursor = document.createElement('div');
    cursor.style.position = 'fixed';
    cursor.style.left = `${window.innerWidth / 2}px`; // Start from center
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
    
    // Animate to target
    requestAnimationFrame(() => {
        cursor.style.left = `${targetX - 10}px`;
        cursor.style.top = `${targetY - 10}px`;
    });
    
    // Simulate Click and Ripple after movement completes
    setTimeout(() => {
        // Ripple effect
        cursor.style.transform = 'scale(2)';
        cursor.style.opacity = '0';
        
        // Execute real click
        el.click();
        console.log(`🎯 Clicked element ${id}`);
        
        // Cleanup
        setTimeout(() => {
            cursor.remove();
            updateHUD('listening');
            chrome.runtime.sendMessage({ action: 'action_completed', detail: `Clicked ${id}` });
        }, 300);
    }, 500);
}

function typeTextIntoElement(id, text) {
    const el = document.querySelector(`[data-gemini-id="${id}"]`);
    if (!el) {
        console.warn(`Element with id ${id} not found for typing.`);
        updateHUD('listening');
        return;
    }
    
    // Simulate focusing and typing
    el.focus();
    el.value = text;
    // Dispatch events to trigger any framework bindings (e.g., React/Angular)
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`⌨️ Typed "${text}" into element ${id}`);
    
    setTimeout(() => {
        updateHUD('listening');
        chrome.runtime.sendMessage({ action: 'action_completed', detail: `Typed into ${id}` });
    }, 300);
}

function scrollPage(direction) {
    const scrollAmount = window.innerHeight * 0.8;
    if (direction === 'down') {
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    } else {
        window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    }
    console.log(`📜 Scrolled ${direction}`);
    
    setTimeout(() => {
        updateHUD('listening');
        chrome.runtime.sendMessage({ action: 'action_completed', detail: `Scrolled ${direction}` });
    }, 500);
}

function navigateTo(url) {
    console.log(`🚀 Navigating to ${url}`);
    // Show a quick HUD message before the page unloads
    updateHUD('processing');
    document.getElementById('erp-ai-status-text').innerText = `Navigating to ${url}...`;
    
    setTimeout(() => {
        window.location.href = url;
    }, 500);
}

function readText(query) {
    let text = document.body.innerText;
    if (query) {
        // Find lines containing the query
        const lines = text.split('\n');
        const relevantLines = lines.filter(line => line.toLowerCase().includes(query.toLowerCase()));
        text = relevantLines.join('\n') || `No text found matching "${query}"`;
    }
    
    console.log(`📖 Read text: ${text.substring(0, 100)}...`);
    
    // Send the captured text back to the agent via the background script
    chrome.runtime.sendMessage({ 
        action: 'action_completed', 
        detail: `Read text result: ${text.substring(0, 1000)}` 
    });
    
    updateHUD('listening');
}

function highlightElement(id) {
    const el = document.querySelector(`[data-gemini-id="${id}"]`);
    if (!el) {
        console.warn(`Element with id ${id} not found for highlighting.`);
        updateHUD('listening');
        return;
    }
    
    console.log(`🔦 Highlighting element ${id}`);
    updateHUD('processing');
    
    // Apply a temporary highlight style
    const originalOutline = el.style.outline;
    const originalBoxShadow = el.style.boxShadow;
    const originalTransition = el.style.transition;
    
    el.style.transition = 'all 0.3s ease-in-out';
    el.style.outline = '5px solid #FFD700'; // Yellow/Gold
    el.style.boxShadow = '0 0 20px #FFD700';
    
    // Animate a bit
    let scale = 1.0;
    const pulseInterval = setInterval(() => {
        scale = scale === 1.0 ? 1.05 : 1.0;
        el.style.transform = `scale(${scale})`;
    }, 400);

    setTimeout(() => {
        clearInterval(pulseInterval);
        el.style.transform = 'scale(1.0)';
        
        // We keep the highlight for a bit so the user can see it
        setTimeout(() => {
            el.style.outline = originalOutline;
            el.style.boxShadow = originalBoxShadow;
            el.style.transition = originalTransition;
            
            updateHUD('listening');
            chrome.runtime.sendMessage({ 
                action: 'action_completed', 
                detail: `Highlighted ${id}. Waiting for verbal confirmation from user.` 
            });
        }, 2000);
    }, 1500);
}

// ============================================================================
// AUDIO PLAYBACK: Plays the Gemini Agent's voice response
// ============================================================================

let audioContext;
let audioQueue = [];
let isPlaying = false;
let nextStartTime = 0;

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 24000 // Gemini API usually returns 24kHz PCM
        });
    }
    // Resume context if suspended (browser auto-play policies)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

/**
 * Decodes base64 string to an ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Handles raw PCM audio chunk playback.
 * The Gemini Live API returns raw 16-bit PCM (usually 24kHz).
 */
function playAudio(base64Data, mimeType) {
    initAudioContext();
    
    try {
        const arrayBuffer = base64ToArrayBuffer(base64Data);
        // Assuming 16-bit PCM
        const int16Array = new Int16Array(arrayBuffer);
        const float32Array = new Float32Array(int16Array.length);
        
        // Convert 16-bit Int PCM to 32-bit Float PCM expected by Web Audio API
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }
        
        // Create an AudioBuffer
        const buffer = audioContext.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);
        
        // Queue the buffer
        audioQueue.push(buffer);
        playNextInQueue();
        
    } catch (e) {
        console.error("Error decoding audio chunk:", e);
    }
}

function playNextInQueue() {
    if (audioQueue.length === 0 || (isPlaying && audioContext.currentTime < nextStartTime)) {
        return;
    }
    
    isPlaying = true;
    const buffer = audioQueue.shift();
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    
    // Calculate when this chunk should start
    if (nextStartTime < audioContext.currentTime) {
        nextStartTime = audioContext.currentTime;
    }
    
    source.start(nextStartTime);
    nextStartTime += buffer.duration;
    
    source.onended = () => {
        if (audioQueue.length === 0) {
            isPlaying = false;
            // Reset nextStartTime so future audio doesn't have an artificial delay
            nextStartTime = 0; 
            updateHUD('listening');
        } else {
            playNextInQueue();
        }
    };
}
