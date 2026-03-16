let ws = null;
let isIntentionalDisconnect = false;
let reconnectInterval = null;
let lastDataUrl = null;
let currentPlan = null; // Track the AI's plan across reloads

// Helper to safely send messages to the active tab's content script
function sendMessageToActiveTab(payload) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs.length > 0 && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, payload, (response) => {
                if (chrome.runtime.lastError) {
                    // Ignore errors about the receiving end not existing
                }
            });
        }
    });
}

// Track navigations to notify the AI
chrome.webNavigation?.onCommitted.addListener((details) => {
    if (details.frameId === 0 && ws && ws.readyState === WebSocket.OPEN) {
        console.log(`🌐 Navigation detected to: ${details.url}`);
        ws.send(JSON.stringify({ 
            type: 'image', 
            data: null,
            pageState: { url: details.url, title: "Navigating...", readyState: "loading", domUpdate: null } 
        }));
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start_session') {
        isIntentionalDisconnect = false;
        lastDataUrl = null;
        currentPlan = null;
        connectWebSocket();
        sendResponse({status: 'connecting'});
        return false; 
    } else if (message.action === 'stop_session') {
        isIntentionalDisconnect = true;
        currentPlan = null;
        if (reconnectInterval) {
            clearTimeout(reconnectInterval);
            reconnectInterval = null;
        }
        if (ws) ws.close();
        sendResponse({status: 'disconnected'});
        return false; 
    } else if (message.action === 'send_audio') {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'audio', data: message.data }));
        }
        return false; 
    } else if (message.action === 'capture_screen') {
        if (message.skipImage) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                    type: 'image', 
                    data: null,
                    pageState: message.pageState 
                }));
            }
            return false;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tab = tabs[0];
            if (!tab || !tab.url) return;

            if (tab.url.startsWith('chrome://') || tab.url.startsWith('devtools://') || tab.url.startsWith('view-source:')) return;

            try {
                chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
                    if (chrome.runtime.lastError) return;

                    const imageChanged = dataUrl !== lastDataUrl;
                    const domChanged = !!message.pageState.domUpdate;
                    
                    if (ws && ws.readyState === WebSocket.OPEN && (imageChanged || domChanged)) {
                        ws.send(JSON.stringify({ 
                            type: 'image', 
                            data: imageChanged ? dataUrl : null,
                            pageState: message.pageState 
                        }));
                        lastDataUrl = dataUrl;
                    }
                });
            } catch (e) {}
        });
        return false; 
    } else if (message.type === 'status') {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
        return false;
    } else if (message.type === 'action' && message.action === 'confirm') {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
        return false;
    } else if (message.action === 'query_status') {
        const isConnected = ws && ws.readyState === WebSocket.OPEN;
        sendResponse({ status: isConnected ? 'connected' : 'disconnected', plan: currentPlan });
        if (isConnected) {
            sendMessageToActiveTab({action: 'ws_connected'});
            // Restore plan if it exists
            if (currentPlan) {
                sendMessageToActiveTab({ type: 'command', command: 'update_plan', steps: currentPlan });
            }
        }
        return true; 
    }
});

function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => {
        console.log('✅ WebSocket connected');
        if (reconnectInterval) {
            clearTimeout(reconnectInterval);
            reconnectInterval = null;
        }
        sendMessageToActiveTab({action: 'ws_connected'});
    };

    ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        
        // INTERCEPT PLAN UPDATES to store in background
        if (msg.type === 'command' && msg.command === 'update_plan') {
            currentPlan = msg.steps;
        }

        if (msg.type === 'command' || msg.type === 'audio' || msg.type === 'transcription' || msg.type === 'error') {
            sendMessageToActiveTab(msg);
        }
    };

    ws.onclose = (event) => {
        console.log(`WebSocket disconnected.`);
        sendMessageToActiveTab({action: 'stop'});
        
        if (!isIntentionalDisconnect) {
            reconnectInterval = setTimeout(connectWebSocket, 3000);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
    };
}
