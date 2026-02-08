<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require "db.php";

// Validate input
if (!isset($_POST["request_id"]) || $_POST["request_id"] === "") {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "request_id is required"
    ]);
    exit;
}

$requestId = trim($_POST["request_id"]);

// Update status only
$sql = "
    UPDATE request
    SET Status = 'denied'
    WHERE RequestID = ?
      AND Status = 'pending'
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $conn->error
    ]);
    exit;
}

$stmt->bind_param("s", $requestId);
$stmt->execute();

// Check if anything changed
if ($stmt->affected_rows === 0) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "No pending request found with that ID"
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "requestId" => $requestId,
    "status" => "denied"
]);