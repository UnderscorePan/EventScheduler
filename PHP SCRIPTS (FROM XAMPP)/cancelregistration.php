<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require "db.php";

$studentId = $_POST["student_id"] ?? null;
$eventId   = $_POST["event_id"] ?? null;

if (!$studentId || !$eventId) {
    echo json_encode(["success" => false, "message" => "Missing parameters"]);
    exit;
}

$stmt = $conn->prepare(
    "DELETE FROM registration WHERE StudentID = ? AND EventID = ?"
);
$stmt->bind_param("ss", $studentId, $eventId);
$stmt->execute();

echo json_encode([
    "success" => true
]);