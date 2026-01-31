# Universal Web Clipboard

A lightweight, PHP-based web application for sharing text and images between devices on a local network or public server. It uses a file-based JSON storage mechanism (no database required).

## Architecture

*   **Frontend:** HTML5, Bootstrap 5, Vanilla JavaScript.
*   **Backend:** Single PHP file (`api.php`).
*   **Storage:** Flat JSON files in `data/` and image files in `data/uploads/`.
*   **Communication:** Client polls the server (long-polling/interval) for `timestamp` changes.

## Directory Structure

```
.
├── api.php          # Handles GET/POST requests and file operations
├── index.html       # Client-side UI
├── script.js        # Frontend logic (polling, fetch, DOM manipulation)
├── style.css        # Custom styles
├── instructions.txt # Project requirements
└── data/            # (Created on runtime) Stores session JSONs
    └── uploads/     # Stores uploaded image files
```

## Setup & Deployment

1.  **Requirements:**
    *   PHP 7.4+
    *   Write permissions for the web server on the project directory (to create `data/`).

2.  **Installation:**
    *   Copy all files to your web server's public directory.
    *   Ensure the web server user (e.g., `www-data`) can write to the directory.

3.  **Local Development:**
    Run the built-in PHP server:
    ```bash
    php -S localhost:8000
    ```
    Access via `http://localhost:8000`.

## API Endpoints

**GET** `?action=get&room={name}`
*   Returns the current content of the specified room.
*   Response: JSON `{ "content": "...", "type": "text|image", "timestamp": 123456 }`

**POST** `?action=post&room={name}`
*   Updates the room with text content.
*   Payload: JSON `{ "content": "hello world", "type": "text" }`

**POST** `?action=upload&room={name}`
*   Uploads an image file.
*   Payload: `multipart/form-data` with field `file`.
*   Server saves file to `data/uploads/` and updates room JSON with the relative path.
