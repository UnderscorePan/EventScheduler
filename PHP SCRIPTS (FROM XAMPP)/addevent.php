<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require "db.php";

// Required fields
$required = [
    "title",
    "description",
    "date",
    "time",
    "endtime",
    "venue",
    "capacity",
    "manager_id"
];

foreach ($required as $field) {
    if (!isset($_POST[$field]) || $_POST[$field] === "") {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "$field is required"
        ]);
        exit;
    }
}

// Inputs
$title       = trim($_POST["title"]);
$description = trim($_POST["description"]);
$date        = $_POST["date"];
$startTimeIn = $_POST["time"];
$endTimeIn   = $_POST["endtime"];
$requestedVenueId = $_POST["venue"];
$capacity    = (int)$_POST["capacity"];
$managerId   = $_POST["manager_id"];

// Datetimes
$startTime = "$date $startTimeIn:00";
$endTime   = "$date $endTimeIn:00";

if (strtotime($endTime) <= strtotime($startTime)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "End time must be after start time"
    ]);
    exit;
}

// Single ID used for BOTH event and request
$eventId = "E" . substr(uniqid(), -6);

//Check venue schedule clash (approved events only)
$venueClashSql = "
    SELECT EventID
    FROM event
    WHERE VenueID = ?
      AND StartTime < ?
      AND EndTime > ?
    LIMIT 1
";

$venueClashStmt = $conn->prepare($venueClashSql);
$venueClashStmt->bind_param(
    "sss",
    $requestedVenueId,
    $endTime,
    $startTime
);
$venueClashStmt->execute();
$venueClashStmt->store_result();

if ($venueClashStmt->num_rows > 0) {
    http_response_code(409);
    echo json_encode([
        "success" => false,
        "message" => "Venue is already booked during this time"
    ]);
    exit;
}

// Transaction
$conn->begin_transaction();

try {
    // Create event WITHOUT venue
    $eventSql = "
        INSERT INTO event (
            EventID,
            EventName,
            StartTime,
            EndTime,
            VenueID,
            Description,
            EventSize,
            CreatedBy
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
    ";

    $eventStmt = $conn->prepare($eventSql);
    $eventStmt->bind_param(
        "sssssis",
        $eventId,
        $title,
        $startTime,
        $endTime,
        $description,
        $capacity,
        $managerId
    );
    $eventStmt->execute();

    // Create venue request USING SAME ID
    $requestSql = "
        INSERT INTO request (
            RequestID,
            ManagerID,
            VenueID,
            RequestedTime,
            Status,
            ManagedBy
        ) VALUES (?, ?, ?, NOW(), 'pending', NULL)
    ";

    $requestStmt = $conn->prepare($requestSql);
    $requestStmt->bind_param(
        "sss",
        $eventId,          
        $managerId,
        $requestedVenueId
    );
    $requestStmt->execute();

    $conn->commit();

    echo json_encode([
        "success" => true,
        "eventId" => $eventId,
        "requestId" => $eventId,
        "status" => "pending"
    ]);

} catch (Exception $e) {
    $conn->rollback();

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to create event request",
        "error" => $e->getMessage()
    ]);
}