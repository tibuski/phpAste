// script.js

const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const displayArea = document.getElementById('displayArea');
const statusIndicator = document.getElementById('statusIndicator');
const copyBtn = document.getElementById('copyBtn');

// Text Sender
const textInput = document.getElementById('textInput');
const sendTextBtn = document.getElementById('sendTextBtn');

// Image Sender
const fileInput = document.getElementById('fileInput');
const sendImageBtn = document.getElementById('sendImageBtn');

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
        const data = await response.json();

        if (data.timestamp > currentTimestamp) {
            currentTimestamp = data.timestamp;
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

function updateDisplay(data) {
    displayArea.innerHTML = ''; // Clear current

    if (data.type === 'image') {
        const img = document.createElement('img');
        img.src = data.content;
        img.className = 'img-fluid rounded border';
        img.style.maxHeight = '400px';
        displayArea.appendChild(img);
    } else {
        // Text
        const p = document.createElement('p');
        p.className = 'fs-5 text-break';
        p.style.whiteSpace = 'pre-wrap'; // Preserve newlines
        p.textContent = data.content || '(Empty)';
        displayArea.appendChild(p);
    }
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

async function sendImage(file) {
    if (!file) return;

    const room = roomInput.value;
    statusIndicator.textContent = 'Uploading...';

    const formData = new FormData();
    // Ensure the file has a name (pasted blobs often don't)
    let fileName = file.name;
    if (!fileName || fileName === 'image.png') {
        const ext = file.type.split('/')[1] || 'png';
        fileName = `pasted_image.${ext}`;
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

sendImageBtn.addEventListener('click', () => {
    if (fileInput.files.length > 0) {
        sendImage(fileInput.files[0]);
    }
});

// Paste Handler (Global)
document.addEventListener('paste', (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    
    // Prioritize Images
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.includes('image/')) {
            const blob = item.getAsFile();
            sendImage(blob);
            return; // Stop after finding an image
        }
    }

    // Fallback to text if not inside a specific input
    // (If user is typing in the room name or text area, don't hijack)
    if (document.activeElement !== roomInput && document.activeElement !== textInput) {
         const pastedText = (event.clipboardData || window.clipboardData).getData('text');
         if (pastedText) {
             textInput.value = pastedText;
             // Optional: Auto-send text on paste? Let's confirm first.
             // For now just populate the box so they hit send.
             textInput.focus();
         }
    }
});

// Copy to Clipboard
copyBtn.addEventListener('click', () => {
    const img = displayArea.querySelector('img');
    if (img) {
        // Copy Image
        try {
            // Need to fetch blob to copy to clipboard
            fetch(img.src).then(res => res.blob()).then(blob => {
                 navigator.clipboard.write([
                     new ClipboardItem({ [blob.type]: blob })
                 ]).then(() => flashStatus('Copied!', 'info'));
            });
        } catch (e) {
            flashStatus('Copy Failed (Secure Context?)', 'warning');
        }
    } else {
        // Copy Text
        const text = displayArea.innerText;
        navigator.clipboard.writeText(text).then(() => {
            flashStatus('Copied!', 'info');
        });
    }
});

init();
