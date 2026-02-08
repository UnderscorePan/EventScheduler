<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require "db.php";

// Validate input
if (!isset($_POST["request_id"]) || $_POST["request_id"] === "") {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "request_id is required"
    ]);
    exit;
}

$requestId = trim($_POST["request_id"]);

// OPTIONAL: who approved (admin ID)
// If you don’t have this yet, you can remove it safely
$approvedBy = $_POST["admin_id"] ?? null;



// Start transaction
$conn->begin_transaction();

try {
    //  Get request details
    $reqSql = "
        SELECT RequestID, VenueID
        FROM request
        WHERE RequestID = ?
          AND Status = 'pending'
    ";

    $reqStmt = $conn->prepare($reqSql);
    $reqStmt->bind_param("s", $requestId);
    $reqStmt->execute();
    $reqResult = $reqStmt->get_result();    

    if ($reqResult->num_rows === 0) {
        throw new Exception("No pending request found");
    }

    $request = $reqResult->fetch_assoc();
    $venueId = $request["VenueID"];




    //get event time range
    $eventTimeSql = "
    SELECT StartTime, EndTime
    FROM event
    WHERE EventID = ?
    ";
    $eventTimeStmt = $conn->prepare($eventTimeSql);
    $eventTimeStmt->bind_param("s", $requestId);
    $eventTimeStmt->execute();
    $eventTimeResult = $eventTimeStmt->get_result();

    if ($eventTimeResult->num_rows === 0) {
        throw new Exception("Event not found");
    }

    $eventTime = $eventTimeResult->fetch_assoc();
    $startTime = $eventTime["StartTime"];
    $endTime   = $eventTime["EndTime"];


    //  Check venue schedule clash (approved events only)
    $venueClashSql = "
        SELECT EventID
        FROM event
        WHERE VenueID = ?
        AND EventID != ?
        AND StartTime < ?
        AND EndTime > ?
        LIMIT 1
    ";

    $venueClashStmt = $conn->prepare($venueClashSql);
    $venueClashStmt->bind_param(
        "ssss",
        $venueId,
        $requestId,
        $endTime,
        $startTime
    );
    $venueClashStmt->execute();
    $venueClashStmt->store_result();

    if ($venueClashStmt->num_rows > 0) {
        throw new Exception("Venue is already booked during this time");
    }



    //  Assign venue to event
    $eventSql = "
        UPDATE event
        SET VenueID = ?
        WHERE EventID = ?
    ";

    $eventStmt = $conn->prepare($eventSql);
    $eventStmt->bind_param("ss", $venueId, $requestId);
    $eventStmt->execute();

    if ($eventStmt->affected_rows === 0) {
        throw new Exception("Event not found or already updated");
    }



    //  Update request status
    if ($approvedBy) {
        $reqUpdateSql = "
            UPDATE request
            SET Status = 'approved',
                ManagedBy = ?
            WHERE RequestID = ?
        ";
        $reqUpdateStmt = $conn->prepare($reqUpdateSql);
        $reqUpdateStmt->bind_param("ss", $approvedBy, $requestId);
    } else {
        $reqUpdateSql = "
            UPDATE request
            SET Status = 'approved'
            WHERE RequestID = ?
        ";
        $reqUpdateStmt = $conn->prepare($reqUpdateSql);
        $reqUpdateStmt->bind_param("s", $requestId);
    }

    $reqUpdateStmt->execute();

    // Commit everything
    $conn->commit();

    echo json_encode([
        "success"   => true,
        "requestId" => $requestId,
        "venueId"   => $venueId,
        "status"    => "approved"
    ]);

} catch (Exception $e) {
    $conn->rollback();

    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}