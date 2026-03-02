let mediaRecorder;
let screenCaptureInterval;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ws_connected') {
        startRecording();
        
        // Start taking screenshots and capturing page state every 2 seconds
        screenCaptureInterval = setInterval(() => {
            const pageState = {
                url: window.location.href,
                title: document.title,
                readyState: document.readyState,
                accessibilityTree: getSimplifiedAccessibilityTree()
            };
            chrome.runtime.sendMessage({ 
                action: 'capture_screen', 
                pageState: pageState 
            });
        }, 2000);
        
    } else if (message.type === 'command') {
        if (message.command === 'stop_audio') {
            audioQueue = [];
            isPlaying = false;
            nextStartTime = 0;
            console.log("🛑 Audio playback interrupted and flushed.");
            // If we have an active audioContext, we could theoretically suspend or close the source,
            // but simply clearing the queue and state prevents future chunks from playing.
            // For a hard stop, we can suspend and resume the context.
            if (audioContext && audioContext.state === 'running') {
                audioContext.suspend().then(() => audioContext.resume());
            }
        } else if (message.command === 'click_element') {
            simulateClickWithGhostCursor(message.id);
        } else if (message.command === 'type_text') {
            typeTextIntoElement(message.id, message.text);
        } else if (message.command === 'scroll_page') {
            scrollPage(message.direction);
        }
    } else if (message.type === 'audio') {
        // Play the text-to-speech audio received from Gemini
        playAudio(message.data, message.mime_type);
        
    } else if (message.action === 'stop') {
        stopRecording();
        clearInterval(screenCaptureInterval);
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

async function startRecording() {
    try {
        // Request microphone access from the user within the webpage context
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                // Convert audio Blob to Base64 to send via WebSocket (background.js)
                const base64Data = await blobToBase64(event.data);
                const base64Audio = base64Data.split(',')[1];
                chrome.runtime.sendMessage({ action: 'send_audio', data: base64Audio });
            }
        };

        // Capture and send audio in 500ms chunks for real-time streaming
        mediaRecorder.start(500);
        console.log("🎤 Started recording user voice");
    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Microphone access is required for the AI Autopilot. Please allow microphone permissions.");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        console.log("⏹️ Stopped recording");
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
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
        setTimeout(() => cursor.remove(), 300);
    }, 500);
}

function typeTextIntoElement(id, text) {
    const el = document.querySelector(`[data-gemini-id="${id}"]`);
    if (!el) {
        console.warn(`Element with id ${id} not found for typing.`);
        return;
    }
    
    // Simulate focusing and typing
    el.focus();
    el.value = text;
    // Dispatch events to trigger any framework bindings (e.g., React/Angular)
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`⌨️ Typed "${text}" into element ${id}`);
}

function scrollPage(direction) {
    const scrollAmount = window.innerHeight * 0.8;
    if (direction === 'down') {
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    } else {
        window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    }
    console.log(`📜 Scrolled ${direction}`);
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
        } else {
            playNextInQueue();
        }
    };
}
