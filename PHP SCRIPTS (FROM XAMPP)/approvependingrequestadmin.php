<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require "db.php";

if (!isset($_POST["request_id"]) || !is_string($_POST["request_id"])) {
    http_response_code(400);
    echo json_encode(["message" => "request_id string is required"]);
    exit;
}

$registrationId = trim($_POST["request_id"]);

$sql = "
    UPDATE registration
    SET status = 'registered'
    WHERE RegistrationID = ?
      AND status = 'pending'
";

$stmt = $conn->prepare($sql);
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
    "registrationid" => $registrationId,
    "new_status" => "registered"
]);