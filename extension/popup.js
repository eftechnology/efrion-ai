document.getElementById('startBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'start_session' }, (response) => {
        document.getElementById('status-text').innerText = 'Connected & Listening';
        const indicator = document.getElementById('status-indicator');
        indicator.className = 'indicator listening';
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
    });
});

document.getElementById('stopBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stop_session' });
    
    // Notify the content script to halt recording
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'stop'});
        }
    });

    document.getElementById('status-text').innerText = 'Disconnected';
    const indicator = document.getElementById('status-indicator');
    indicator.className = 'indicator disconnected';
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
});
