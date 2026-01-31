# Universal Web Clipboard (PHP Edition)

A lightweight, vanilla PHP application for cross-device sharing of text and files via shared rooms. Uses flat-file JSON storage for session history and filesystem storage for uploaded assets.

## Architecture

*   **Frontend:** HTML5, Bootstrap 5, Vanilla JavaScript (Fetch API).
*   **Backend:** Vanilla PHP (`api.php`).
*   **Storage:** 
    *   **Metadata:** JSON arrays in `data/{room_name}.json`.
    *   **Assets:** Physical files in `data/uploads/`.
*   **Synchronization:** Client-side interval polling (2s) tracking item `timestamp` changes.

## Features

*   **Multi-Item History:** Rooms maintain a history of the last 50 entries.
*   **Generic File Support:** Upload and download any non-executable file type.
*   **Image Previews:** Automatic rendering of common image formats.
*   **Auto-Generation:** Random room IDs generated on startup or empty join.
*   **Global Paste:** Intercepts system paste events to auto-upload files or pre-fill text.

## Directory Structure

```
.
├── api.php          # RESTful API handler
├── index.html       # UI Shell
├── script.js        # Polling and DOM synchronization logic
├── style.css        # UI refinements
├── instructions.txt # Development requirements
├── data/            # Room JSON storage (git-ignored)
    └── uploads/     # Uploaded file assets (git-ignored)
```

## Setup

1.  **Requirements:** PHP 7.4+
2.  **Deployment:** Drop all files into a PHP-enabled web directory.
3.  **Permissions:** Ensure the server has write access to the root directory (to create/populate `data/`).

## API Specification

### GET `?action=get&room={name}`
Returns an array of items for the specified room.
*   **Response:** `JSON Array<Object>`
*   **Item Schema:**
    ```json
    {
      "content": "path/to/file or text string",
      "type": "text | file",
      "original_name": "filename.ext (for files)",
      "timestamp": 1706712345
    }
    ```

### POST `?action=post&room={name}`
Appends a text entry to the room history.
*   **Payload:** `JSON { "content": "string", "type": "text" }`

### POST `?action=upload&room={name}`
Appends a file entry to the room history.
*   **Payload:** `multipart/form-data` (Field: `file`).
*   **Security:** Blocks executable extensions (php, exe, sh, etc.).