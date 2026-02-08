<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

require "db.php";

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}


/*
Expected POST data:
- student_id
- event_id
*/

$studentId = $_POST["student_id"] ?? null;
$eventId   = $_POST["event_id"] ?? null;

if (!$studentId || !$eventId) {
    echo json_encode([
        "success" => false,
        "message" => "Missing student_id or event_id"
    ]);
    exit;
}

/* 1. Check if student already registered */
$checkSql = "
    SELECT RegistrationID
    FROM registration
    WHERE StudentID = ? AND EventID = ? AND Status IN ('registered', 'pending')
";
$checkStmt = $conn->prepare($checkSql);
$checkStmt->bind_param("ss", $studentId, $eventId);
$checkStmt->execute();
$checkStmt->store_result();

if ($checkStmt->num_rows > 0) {
    echo json_encode([
        "success" => false,
        "message" => "Already registered or pending for this event"
    ]);
    exit;
}

/* 1.1 Check for schedule clash */
$clashSql = "
    SELECT e.EventID
    FROM registration r
    JOIN event e ON r.EventID = e.EventID
    JOIN event target ON target.EventID = ?
    WHERE r.StudentID = ?
      AND r.Status IN ('registered', 'pending')
      AND e.StartTime < target.EndTime
      AND e.EndTime > target.StartTime
    LIMIT 1
";

$clashStmt = $conn->prepare($clashSql);
$clashStmt->bind_param("ss", $eventId, $studentId);
$clashStmt->execute();
$clashStmt->store_result();

if ($clashStmt->num_rows > 0) {
    echo json_encode([
        "success" => false,
        "message" => "Schedule conflict with another registered or pending event"
    ]);
    exit;
}

$clashStmt->close();

/* 2. Check event capacity */
$capacitySql = "
    SELECT EventSize
    FROM event
    WHERE EventID = ?
";
$capacityStmt = $conn->prepare($capacitySql);
$capacityStmt->bind_param("s", $eventId);
$capacityStmt->execute();
$capacityStmt->bind_result($eventSize);
$capacityStmt->fetch();
$capacityStmt->close();

$countSql = "
    SELECT COUNT(*) 
    FROM registration 
    WHERE EventID = ? AND Status = 'registered'
";
$countStmt = $conn->prepare($countSql);
$countStmt->bind_param("s", $eventId);
$countStmt->execute();
$countStmt->bind_result($currentCount);
$countStmt->fetch();
$countStmt->close();

if ($currentCount >= $eventSize) {
    echo json_encode([
        "success" => false,
        "message" => "Event is full"
    ]);
    exit;
}

/* 3. Insert registration */
$registrationId = uniqid("R");

$insertSql = "
    INSERT INTO registration
    (RegistrationID, StudentID, EventID, RegistrationDate, Status)
    VALUES (?, ?, ?, NOW(), 'pending')
";
$insertStmt = $conn->prepare($insertSql);
$insertStmt->bind_param("sss", $registrationId, $studentId, $eventId);
$insertStmt->execute();

echo json_encode([
    "success" => true,
    "registrationId" => $registrationId
]);