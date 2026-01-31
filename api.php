<?php
// api.php - Backend for Universal Web Clipboard

header('Content-Type: application/json');

// Configuration
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

// Helper to sanitize room names
function getRoomFile($room) {
    global $dataDir;
    // Allow only alphanumeric and dashes
    $cleanRoom = preg_replace('/[^a-zA-Z0-9-]/', '', $room);
    if (!$cleanRoom) $cleanRoom = 'default';
    return $dataDir . '/' . $cleanRoom . '.json';
}

$action = $_GET['action'] ?? '';
$room = $_GET['room'] ?? 'default';
$file = getRoomFile($room);

if ($action === 'get') {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        // Backward compatibility: if it's a single object, wrap it in an array
        $data = json_decode($content, true);
        if (isset($data['content'])) {
            echo json_encode([$data]);
        } else {
            echo $content;
        }
    } else {
        echo json_encode([]);
    }
    exit;
}

if ($action === 'post') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $newItem = [
        'content' => $input['content'] ?? '',
        'type' => $input['type'] ?? 'text', // 'text' or 'image'
        'timestamp' => time()
    ];

    $currentData = [];
    if (file_exists($file)) {
        $decoded = json_decode(file_get_contents($file), true);
        if (is_array($decoded)) {
            if (isset($decoded['content'])) { $currentData[] = $decoded; } // Legacy
            else { $currentData = $decoded; }
        }
    }
    
    $currentData[] = $newItem;
    if (count($currentData) > 50) $currentData = array_slice($currentData, -50);

    file_put_contents($file, json_encode($currentData));
    echo json_encode(['status' => 'success']);
    exit;
}

if ($action === 'upload') {
    // Handle file upload (generic files)
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $uploadsDir = $dataDir . '/uploads';
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0777, true);
        }

        $tmpName = $_FILES['file']['tmp_name'];
        $originalName = basename($_FILES['file']['name']);
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        
        // Extended validation: Allow common safe types, block executable scripts
        $blocked = ['php', 'php3', 'php4', 'php5', 'phtml', 'exe', 'pl', 'py', 'cgi', 'sh', 'bat'];
        if (in_array($ext, $blocked)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'File type not allowed for security reasons']);
            exit;
        }

        // Generate unique filename to prevent overwrites
        $filename = uniqid('file_') . '.' . $ext;
        $destination = $uploadsDir . '/' . $filename;

        if (move_uploaded_file($tmpName, $destination)) {
            // Save relative path for the frontend
            $webPath = 'data/uploads/' . $filename;
            
            $newItem = [
                'content' => $webPath,
                'type' => 'file',
                'original_name' => $originalName,
                'timestamp' => time()
            ];
            
            $currentData = [];
            if (file_exists($file)) {
                $decoded = json_decode(file_get_contents($file), true);
                if (is_array($decoded)) {
                    if (isset($decoded['content'])) { $currentData[] = $decoded; } // Legacy
                    else { $currentData = $decoded; }
                }
            }
            
            $currentData[] = $newItem;
            if (count($currentData) > 50) $currentData = array_slice($currentData, -50);
            
            file_put_contents($file, json_encode($currentData));
            echo json_encode(['status' => 'success']);
        } else {
             http_response_code(500);
             echo json_encode(['status' => 'error', 'message' => 'Failed to move uploaded file']);
        }
    } else {
        http_response_code(400);
        $error = $_FILES['file']['error'] ?? 'No file sent';
        $errorMsg = 'Unknown error';
        switch ($error) {
            case UPLOAD_ERR_INI_SIZE: $errorMsg = 'File too large (server limit)'; break;
            case UPLOAD_ERR_FORM_SIZE: $errorMsg = 'File too large (form limit)'; break;
            case UPLOAD_ERR_PARTIAL: $errorMsg = 'File only partially uploaded'; break;
            case UPLOAD_ERR_NO_FILE: $errorMsg = 'No file was uploaded'; break;
            case UPLOAD_ERR_NO_TMP_DIR: $errorMsg = 'Missing temporary folder'; break;
            case UPLOAD_ERR_CANT_WRITE: $errorMsg = 'Failed to write file to disk'; break;
            case UPLOAD_ERR_EXTENSION: $errorMsg = 'File upload stopped by extension'; break;
        }
        echo json_encode(['status' => 'error', 'message' => "Upload failed: $errorMsg ($error)"]);
    }
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
?>
