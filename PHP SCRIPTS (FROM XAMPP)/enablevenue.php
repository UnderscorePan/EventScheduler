<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require "db.php";

// Validate input
if (!isset($_POST["venue_id"]) || $_POST["venue_id"] === "") {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "venue_id is required"
    ]);
    exit;
}

$venueId = trim($_POST["venue_id"]);

// 1️⃣ Get current state
$selectSql = "SELECT IsEnabled FROM venue WHERE VenueID = ?";
$selectStmt = $conn->prepare($selectSql);

if (!$selectStmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $conn->error
    ]);
    exit;
}

$selectStmt->bind_param("s", $venueId);
$selectStmt->execute();
$result = $selectStmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Venue not found"
    ]);
    exit;
}

$row = $result->fetch_assoc();
$currentState = (int)$row["IsEnabled"];

// 2️⃣ Toggle value
$newState = $currentState === 1 ? 0 : 1;

// 3️⃣ Update venue
$updateSql = "UPDATE venue SET IsEnabled = ? WHERE VenueID = ?";
$updateStmt = $conn->prepare($updateSql);

$updateStmt->bind_param("is", $newState, $venueId);
$updateStmt->execute();

echo json_encode([
    "success" => true,
    "venueId" => $venueId,
    "previousState" => $currentState,
    "newState" => $newState
]);