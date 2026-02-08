<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require "db.php";

// Validate input (matches frontend)
if (!isset($_POST["request_id"]) || !is_string($_POST["request_id"])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "request_id string is required"
    ]);
    exit;
}

$registrationId = trim($_POST["request_id"]);

// Delete ONLY pending registrations (safety check)
$sql = "
    DELETE FROM registration
    WHERE RegistrationID = ?
      AND status = 'pending'
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

$stmt->bind_param("s", $registrationId);
$stmt->execute();

if ($stmt->affected_rows === 0) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "No pending registration found with that ID"
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "registrationid" => $registrationId
]);