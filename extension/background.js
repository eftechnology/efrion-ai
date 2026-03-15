let ws = null;
let isIntentionalDisconnect = false;
let reconnectInterval = null;
let lastDataUrl = null;

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start_session') {
        isIntentionalDisconnect = false;
        lastDataUrl = null;
        connectWebSocket();
        sendResponse({status: 'connecting'});
        return false; // Sync response
    } else if (message.action === 'stop_session') {
        isIntentionalDisconnect = true;
        if (reconnectInterval) {
            clearTimeout(reconnectInterval);
            reconnectInterval = null;
        }
        if (ws) ws.close();
        sendResponse({status: 'disconnected'});
        return false; // Sync response
    } else if (message.action === 'send_audio') {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('📤 Sending audio to backend');
            ws.send(JSON.stringify({ type: 'audio', data: message.data }));
        }
        return false; // No response needed
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

            }
            
            const imageChanged = dataUrl !== lastDataUrl;
            const domChanged = message.pageState.domChanged;
            
            if (ws && ws.readyState === WebSocket.OPEN && (imageChanged || domChanged)) {
                console.log('📤 Sending image/DOM to backend');
                ws.send(JSON.stringify({ 
                    type: 'image', 
                    data: imageChanged ? dataUrl : null,
                    pageState: message.pageState 
                }));
                lastDataUrl = dataUrl;
            }
        });
        return false; // Async action, but we don't need to sendResponse back to content script
    } else if (message.action === 'action_completed') {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('📤 Sending status to backend');
            ws.send(JSON.stringify({ 
                type: 'status', 
                message: "Action completed, waiting for network idle...",
                detail: message.detail
            }));
        }
        return false;
    } else if (message.action === 'query_status') {
        const isConnected = ws && ws.readyState === WebSocket.OPEN;
        sendResponse({ status: isConnected ? 'connected' : 'disconnected' });
        if (isConnected) {
            // Echo back to ensure the tab initializes
            sendMessageToActiveTab({action: 'ws_connected'});
        }
        return true; // Keep channel open for async response
    }
});

function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => {
        console.log('✅ WebSocket connected to Python backend at ws://localhost:8000/ws');
        if (reconnectInterval) {
            clearTimeout(reconnectInterval);
            reconnectInterval = null;
        }
        sendMessageToActiveTab({action: 'ws_connected'});
    };

    ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'command' || msg.type === 'audio') {
            sendMessageToActiveTab(msg);
        }
    };

    ws.onclose = (event) => {
        console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
        sendMessageToActiveTab({action: 'stop'});
        
        if (!isIntentionalDisconnect) {
            console.log('Attempting to reconnect in 3 seconds...');
            reconnectInterval = setTimeout(connectWebSocket, 3000);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
    };
}
