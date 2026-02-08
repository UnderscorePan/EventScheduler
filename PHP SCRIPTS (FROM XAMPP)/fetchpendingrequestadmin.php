<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require "db.php";

$sql = "SELECT * FROM registration WHERE status = 'pending'";
$result = $conn->query($sql);

if (!$result) {
    http_response_code(500);
    echo json_encode(["error" => $conn->error]);
    exit;
}

$events = [];

while ($row = $result->fetch_assoc()) {
    $RegistrationDate = $row["RegistrationDate"]
        ? new DateTime($row["RegistrationDate"])
        : null;

    $events[] = [
        "registrationid"   => $row["RegistrationID"],
        "studentid"        => $row["StudentID"],
        "eventid"          => $row["EventID"],
        "date" => $RegistrationDate->format("Y-m-d"),
        "time" => $RegistrationDate?->format("H:i"),
        "status"           => $row["Status"],
    ];
}

echo json_encode($events);