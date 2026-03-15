let ws = null;
let isIntentionalDisconnect = false;
let reconnectInterval = null;
let lastDataUrl = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start_session') {
        isIntentionalDisconnect = false;
        lastDataUrl = null; // Reset for new session
        connectWebSocket();
        sendResponse({status: 'connecting'});
    } else if (message.action === 'stop_session') {
        isIntentionalDisconnect = true;
        if (reconnectInterval) {
            clearTimeout(reconnectInterval);
            reconnectInterval = null;
        }
        if (ws) ws.close();
        sendResponse({status: 'disconnected'});
    } else if (message.action === 'send_audio') {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'audio', data: message.data }));
        }
    } else if (message.action === 'capture_screen') {
        // Capture the visible tab and send it over WebSocket as a JPEG
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 40 }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }
            
            // Visual Diffing: Only send the image if it has visually changed
            const imageChanged = dataUrl !== lastDataUrl;
            const domChanged = message.pageState.domChanged;
            
            if (ws && ws.readyState === WebSocket.OPEN && (imageChanged || domChanged)) {
                ws.send(JSON.stringify({ 
                    type: 'image', 
                    data: imageChanged ? dataUrl : null,
                    pageState: message.pageState 
                }));
                lastDataUrl = dataUrl;
            }
        });
        return true; 
    } else if (message.action === 'action_completed') {
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Forward action completion to the backend for the closed feedback loop
            ws.send(JSON.stringify({ 
                type: 'status', 
                message: "Action completed, waiting for network idle...",
                detail: message.detail
            }));
        }
    }
});

function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => {
        console.log('WebSocket connected to Python backend');
        if (reconnectInterval) {
            clearTimeout(reconnectInterval);
            reconnectInterval = null;
        }
        // Notify the content script injected in the active tab to start recording audio
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'ws_connected'});
            }
        });
    };

    ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'command') {
            // Forward UI commands (e.g., highlight_element) to the content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, msg);
                }
            });
        } else if (msg.type === 'audio') {
            // Forward AI voice responses to the content script for playback
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, msg);
                }
            });
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'stop'});
            }
        });
        
        // Attempt to reconnect if it wasn't a manual stop
        if (!isIntentionalDisconnect) {
            console.log('Attempting to reconnect in 3 seconds...');
            reconnectInterval = setTimeout(connectWebSocket, 3000);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        // Will trigger onclose naturally
    };
}
