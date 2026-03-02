let ws = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start_session') {
        connectWebSocket();
        sendResponse({status: 'connecting'});
    } else if (message.action === 'stop_session') {
        if (ws) ws.close();
        sendResponse({status: 'disconnected'});
    } else if (message.action === 'send_audio') {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'audio', data: message.data }));
        }
    } else if (message.action === 'capture_screen') {
        // Capture the visible tab and send it over WebSocket as a JPEG
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }
            if (ws && ws.readyState === WebSocket.OPEN && dataUrl) {
                ws.send(JSON.stringify({ 
                    type: 'image', 
                    data: dataUrl,
                    pageState: message.pageState // Include the accessibility tree and other page info
                }));
            }
        });
        return true; 
    }
});

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => {
        console.log('WebSocket connected to Python backend');
        // Notify the content script injected in the active tab to start recording audio
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'ws_connected'});
            }
        });
    };

    ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'command') {
            // Forward UI commands (e.g., highlight_element) to the content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, msg);
                }
            });
        } else if (msg.type === 'audio') {
            // Forward AI voice responses to the content script for playback
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, msg);
                }
            });
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'stop'});
            }
        });
    };
}
