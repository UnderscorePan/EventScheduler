<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require "db.php";

/*
Expected POST data:
- student_id
*/

$studentId = $_POST["student_id"] ?? null;

if (!$studentId) {
    echo json_encode([
        "success" => false,
        "message" => "Missing student_id"
    ]);
    exit;
}

$sql = "
    SELECT EventID
    FROM registration
    WHERE StudentID = ? AND Status = 'registered'
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $studentId);
$stmt->execute();

$result = $stmt->get_result();

$eventIds = [];

while ($row = $result->fetch_assoc()) {
    $eventIds[] = $row["EventID"];
}

echo json_encode([
    "success" => true,
    "eventIds" => $eventIds
]);