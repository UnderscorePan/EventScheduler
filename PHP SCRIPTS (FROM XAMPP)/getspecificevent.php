<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require "db.php";

// Validate input
if (!isset($_POST["event_id"]) || $_POST["event_id"] === "") {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "event_id is required"
    ]);
    exit;
}

$eventId = trim($_POST["event_id"]);

// Fetch event
$sql = "
    SELECT
        EventID,
        EventName,
        EventHost,
        StartTime,
        EndTime,
        VenueID,
        CreatedBy,
        Description,
        EventSize
    FROM event
    WHERE EventID = ?
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

$stmt->bind_param("s", $eventId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Event not found"
    ]);
    exit;
}

$event = $result->fetch_assoc();

echo json_encode([
    "success" => true,
    "data" => [
        "eventId"     => $event["EventID"],
        "eventName"   => $event["EventName"],
        "eventHost"   => $event["EventHost"],
        "startTime"   => $event["StartTime"],
        "endTime"     => $event["EndTime"],
        "venueId"     => $event["VenueID"],
        "createdBy"   => $event["CreatedBy"],
        "description" => $event["Description"],
        "eventSize"   => (int)$event["EventSize"]
    ]
]);