<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require "db.php";

/*
Expected POST fields:
event_id (required)
name
start_time (YYYY-MM-DD HH:MM:SS)
end_time   (YYYY-MM-DD HH:MM:SS)
description
size
venue (optional – if present & different, triggers new request)
manager_id (required if venue is changed)
*/

// Validate event_id
if (!isset($_POST["event_id"]) || $_POST["event_id"] === "") {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "event_id is required"
    ]);
    exit;
}

$eventId = trim($_POST["event_id"]);

// Fetch current event
$getEventSql = "SELECT VenueID FROM event WHERE EventID = ?";
$getEventStmt = $conn->prepare($getEventSql);
$getEventStmt->bind_param("s", $eventId);
$getEventStmt->execute();
$eventResult = $getEventStmt->get_result();

if ($eventResult->num_rows === 0) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Event not found"
    ]);
    exit;
}

$currentEvent = $eventResult->fetch_assoc();
$currentVenue = $currentEvent["VenueID"];

// Build dynamic update fields
$fields = [];
$params = [];
$types  = "";

if (isset($_POST["title"]) && !isset($_POST["name"])) {
    $_POST["name"] = $_POST["title"];
}

// capacity → size
if (isset($_POST["capacity"]) && !isset($_POST["size"])) {
    $_POST["size"] = (int)$_POST["capacity"];
}

// date + time → start_time
if (isset($_POST["date"], $_POST["time"]) && !isset($_POST["start_time"])) {
    $_POST["start_time"] = $_POST["date"] . " " . $_POST["time"] . ":00";
}

// date + endtime → end_time
if (isset($_POST["date"], $_POST["endtime"]) && !isset($_POST["end_time"])) {
    $_POST["end_time"] = $_POST["date"] . " " . $_POST["endtime"] . ":00";
}

// Editable fields
if (isset($_POST["name"])) {
    $fields[] = "EventName = ?";
    $params[] = trim($_POST["name"]);
    $types   .= "s";
}

if (isset($_POST["start_time"])) {
    $fields[] = "StartTime = ?";
    $params[] = $_POST["start_time"];
    $types   .= "s";
}

if (isset($_POST["end_time"])) {
    $fields[] = "EndTime = ?";
    $params[] = $_POST["end_time"];
    $types   .= "s";
}

if (isset($_POST["description"])) {
    $fields[] = "Description = ?";
    $params[] = trim($_POST["description"]);
    $types   .= "s";
}

if (isset($_POST["size"])) {
    $fields[] = "EventSize = ?";
    $params[] = (int)$_POST["size"];
    $types   .= "i";
}

// Venue handling
$newVenue = $_POST["venue"] ?? null;
$venueChanged = $newVenue !== null && $newVenue !== $currentVenue;

$conn->begin_transaction();

try {
    // If venue changed → null venue
    if ($venueChanged) {
        $fields[] = "VenueID = NULL";
    }

    if (!empty($fields)) {
        $sql = "UPDATE event SET " . implode(", ", $fields) . " WHERE EventID = ?";
        $params[] = $eventId;
        $types   .= "s";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
    }

    // Handle venue request
    if ($venueChanged) {
        if (!isset($_POST["manager_id"])) {
            throw new Exception("manager_id required when changing venue");
        }

        $managerId = $_POST["manager_id"];

        // Check if request exists
        $checkReqSql = "SELECT RequestID FROM request WHERE RequestID = ?";
        $checkReqStmt = $conn->prepare($checkReqSql);
        $checkReqStmt->bind_param("s", $eventId);
        $checkReqStmt->execute();
        $reqResult = $checkReqStmt->get_result();

        if ($reqResult->num_rows > 0) {
            // Update existing request
            $updateReqSql = "
                UPDATE request
                SET VenueID = ?, Status = 'pending', ManagedBy = NULL
                WHERE RequestID = ?
            ";
            $updateReqStmt = $conn->prepare($updateReqSql);
            $updateReqStmt->bind_param("ss", $newVenue, $eventId);
            $updateReqStmt->execute();
        } else {
            // Create new request
            $insertReqSql = "
                INSERT INTO request (RequestID, ManagerID, VenueID, RequestedTime, Status)
                VALUES (?, ?, ?, NOW(), 'pending')
            ";
            $insertReqStmt = $conn->prepare($insertReqSql);
            $insertReqStmt->bind_param("sss", $eventId, $managerId, $newVenue);
            $insertReqStmt->execute();
        }
    }

    $conn->commit();

    echo json_encode([
        "success" => true,
        "eventId" => $eventId,
        "venueReset" => $venueChanged
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}