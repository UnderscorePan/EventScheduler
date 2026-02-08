<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require "db.php";

$sql = "
SELECT 
    e.EventID,
    e.EventName,
    e.StartTime,
    e.VenueID,
    e.EventSize,
    e.Description,
    COUNT(r.RegistrationID) AS registered
FROM event e
LEFT JOIN registration r ON e.EventID = r.EventID
GROUP BY e.EventID
";

$result = $conn->query($sql);

$events = [];

while ($row = $result->fetch_assoc()) {

    $startDateTime = new DateTime($row["StartTime"]);

    $events[] = [
        "id" => $row["EventID"],
        "title" => $row["EventName"],
        "date" => $startDateTime->format("Y-m-d"),
        "time" => $startDateTime->format("H:i"),
        "venue" => $row["VenueID"],      // replace with VenueName later
        "capacity" => (int)$row["EventSize"],
        "registered" => (int)$row["registered"],
        "description" => $row["Description"]
    ];
}

echo json_encode($events);