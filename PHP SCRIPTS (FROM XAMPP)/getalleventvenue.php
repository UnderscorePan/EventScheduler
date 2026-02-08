<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require "db.php";

$sql = "SELECT VenueID, VenueName, VenueCapacity, IsEnabled FROM venue";
$result = $conn->query($sql);

if (!$result) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $conn->error
    ]);
    exit;
}

$venues = [];

while ($row = $result->fetch_assoc()) {
    $venues[] = [
        "venueId"       => $row["VenueID"],
        "venueName"     => $row["VenueName"],
        "venueCapacity" => (int)$row["VenueCapacity"],
        "isEnabled"     => (bool)$row["IsEnabled"]
    ];
}

echo json_encode([
    "success" => true,
    "data" => $venues
]);