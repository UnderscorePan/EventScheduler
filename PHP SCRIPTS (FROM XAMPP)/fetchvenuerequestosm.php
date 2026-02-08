<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require "db.php";

$sql = "
    SELECT 
        RequestID,
        ManagerID,
        VenueID,
        RequestedTime,
        Status,
        ManagedBy
    FROM request
    WHERE status='pending'
";

$result = $conn->query($sql);

if (!$result) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $conn->error
    ]);
    exit;
}

$requests = [];

while ($row = $result->fetch_assoc()) {
    $requests[] = [
        "requestId"     => $row["RequestID"],
        "managerId"     => $row["ManagerID"],
        "venueId"       => $row["VenueID"],
        "requestedTime" => $row["RequestedTime"], // already datetime
        "status"        => $row["Status"],
        "managedBy"     => $row["ManagedBy"]
    ];
}

echo json_encode([
    "success" => true,
    "data" => $requests
]);