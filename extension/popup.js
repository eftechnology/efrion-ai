document.getElementById('startBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'start_session' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error starting session:", chrome.runtime.lastError.message);
            // Even if there's an error (e.g., background script waking up), we might still want to update UI
        }
        
        document.getElementById('status-text').innerText = 'Connected & Listening';
        const indicator = document.getElementById('status-indicator');
        indicator.className = 'indicator listening';
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
    });
});

document.getElementById('stopBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stop_session' }, () => {
        if (chrome.runtime.lastError) {
            // Ignore error
        }
    });
    
    // Notify the content script to halt recording
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'stop'}, () => {
                if (chrome.runtime.lastError) {
                    // Ignore error if content script isn't loaded on this tab
                }
            });
        }
    });

    document.getElementById('status-text').innerText = 'Disconnected';
    const indicator = document.getElementById('status-indicator');
    indicator.className = 'indicator disconnected';
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
});
