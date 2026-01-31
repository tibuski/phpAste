// script.js

const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const displayArea = document.getElementById('displayArea');
const statusIndicator = document.getElementById('statusIndicator');
const copyBtn = document.getElementById('copyBtn');

// Text Sender
const textInput = document.getElementById('textInput');
const sendTextBtn = document.getElementById('sendTextBtn');

// File Sender
const fileInput = document.getElementById('fileInput');
const sendFileBtn = document.getElementById('sendFileBtn');

let currentTimestamp = -1;
let pollingInterval = null;

// --- Initialization ---

function generateRandomRoom() {
    return 'room-' + Math.random().toString(36).substring(2, 9);
}

function init() {
    // Load room from URL hash or generate a random one
    const hashRoom = window.location.hash.replace('#', '');
    if (hashRoom) {
        roomInput.value = hashRoom;
    } else {
        // Start with a random empty room as requested
        const newRoom = generateRandomRoom();
        roomInput.value = newRoom;
        window.location.hash = newRoom;
    }

    startPolling();
}

// --- Polling Logic ---

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    fetchContent(); // Initial fetch
    pollingInterval = setInterval(fetchContent, 2000); // Poll every 2 seconds
}

async function fetchContent() {
    const room = roomInput.value;
    try {
        const response = await fetch(`api.php?action=get&room=${room}`);
        const data = await response.json(); // Array of items

        if (!Array.isArray(data) || data.length === 0) {
            if (displayArea.innerHTML.includes('Loading...')) {
                 displayArea.innerHTML = '<p class="text-muted">Room is empty.</p>';
            }
            statusIndicator.textContent = 'Synced';
            statusIndicator.className = 'badge bg-success';
            currentTimestamp = 0;
            return;
        }

        const lastItem = data[data.length - 1];
        if (lastItem.timestamp > currentTimestamp) {
            currentTimestamp = lastItem.timestamp;
            updateDisplay(data);
            flashStatus('Updated', 'success');
        } else {
            statusIndicator.textContent = 'Synced';
            statusIndicator.className = 'badge bg-success';
        }
    } catch (error) {
        console.error('Fetch error:', error);
        statusIndicator.textContent = 'Offline';
        statusIndicator.className = 'badge bg-danger';
    }
}

function updateDisplay(items) {
    displayArea.innerHTML = '';
    
    // Remove centering classes for list view
    displayArea.classList.remove('align-items-center', 'justify-content-center');
    displayArea.classList.add('d-block', 'overflow-auto');
    displayArea.style.maxHeight = '600px';

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'mb-3 border-bottom pb-3';

        const meta = document.createElement('div');
        meta.className = 'text-muted small mb-1 d-flex justify-content-between';
        meta.innerHTML = `<span>${new Date(item.timestamp * 1000).toLocaleTimeString()}</span>`;
        div.appendChild(meta);

        if (item.type === 'image' || item.type === 'file') {
            const container = document.createElement('div');

            // Check if it's an image for preview
            const isImage = item.content.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || item.type === 'image';
            
            if (isImage) {
                const img = document.createElement('img');
                img.src = item.content;
                img.className = 'img-fluid rounded border d-block mb-2';
                img.style.maxHeight = '300px';
                container.appendChild(img);
            }
            
            // Download Link
            const link = document.createElement('a');
            link.href = item.content;
            const displayName = item.original_name || 'Download File';
            link.download = displayName;
            link.className = 'btn btn-outline-dark btn-sm';
            link.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-download me-2" viewBox="0 0 16 16">
  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
</svg> ${displayName}`;
            link.target = '_blank';
            
            container.appendChild(link);
            div.appendChild(container);
        } else {
            const p = document.createElement('p');
            p.className = 'fs-5 text-break mb-0';
            p.style.whiteSpace = 'pre-wrap';
            p.textContent = item.content || '(Empty)';
            div.appendChild(p);
        }
        displayArea.appendChild(div);
    });
    
    // Scroll to bottom
    displayArea.scrollTop = displayArea.scrollHeight;
}

function flashStatus(text, color) {
    statusIndicator.textContent = text;
    statusIndicator.className = `badge bg-${color}`;
    setTimeout(() => {
        statusIndicator.textContent = 'Synced';
        statusIndicator.className = 'badge bg-success';
    }, 1500);
}

// --- Sending Logic ---

async function sendText() {
    const content = textInput.value;
    if (!content) return;

    const room = roomInput.value;
    statusIndicator.textContent = 'Sending...';
    
    try {
        await fetch(`api.php?action=post&room=${room}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content, type: 'text' })
        });
        textInput.value = ''; // Clear input
        fetchContent(); // Update immediately
    } catch (err) {
        console.error(err);
        flashStatus('Error', 'danger');
    }
}

async function sendFile(file) {
    if (!file) return;

    const room = roomInput.value;
    statusIndicator.textContent = 'Uploading...';

    const formData = new FormData();
    // Ensure the file has a name
    let fileName = file.name;
    if (!fileName || fileName === 'image.png') {
        const ext = file.type.split('/')[1] || 'bin';
        fileName = `pasted_file.${ext}`;
    }
    formData.append('file', file, fileName);

    try {
        await fetch(`api.php?action=upload&room=${room}`, {
            method: 'POST',
            body: formData
        });
        fileInput.value = ''; // Clear input
        fetchContent();
    } catch (err) {
        console.error(err);
        flashStatus('Upload Error', 'danger');
    }
}

// --- Event Listeners ---

joinBtn.addEventListener('click', () => {
    if (!roomInput.value.trim()) {
        roomInput.value = generateRandomRoom();
    }
    localStorage.setItem('clipboard_room', roomInput.value);
    window.location.hash = roomInput.value;
    
    // Reset state for the new room
    currentTimestamp = -1; 
    displayArea.innerHTML = '<p class="text-muted">Loading...</p>';
    
    startPolling();
});

sendTextBtn.addEventListener('click', sendText);

sendFileBtn.addEventListener('click', () => {
    if (fileInput.files.length > 0) {
        sendFile(fileInput.files[0]);
    }
});

// Paste Handler (Global)
document.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    
    // Prioritize Files
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            sendFile(blob);
            return; // Stop after finding a file
        }
    }

    // Fallback to text if not inside a specific input
    if (document.activeElement !== roomInput && document.activeElement !== textInput) {
         const pastedText = (event.clipboardData || window.clipboardData).getData('text');
         if (pastedText) {
             textInput.value = pastedText;
             textInput.focus();
         }
    }
});

// Copy to Clipboard (Last Item)
copyBtn.addEventListener('click', () => {
    // Find the last content item
    const lastItemDiv = displayArea.lastElementChild;
    if (!lastItemDiv) return;
    
    const img = lastItemDiv.querySelector('img');
    if (img) {
        try {
             fetch(img.src).then(res => res.blob()).then(blob => {
                 navigator.clipboard.write([
                     new ClipboardItem({ [blob.type]: blob })
                 ]).then(() => flashStatus('Copied Image!', 'info'));
            });
        } catch (e) { flashStatus('Copy Failed', 'warning'); }
    } else {
        const p = lastItemDiv.querySelector('p');
        if (p) {
            navigator.clipboard.writeText(p.innerText).then(() => {
                flashStatus('Copied Text!', 'info');
            });
        }
    }
});

init();