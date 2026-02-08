<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require "db.php";

// Validate input
if (!isset($_POST["event_id"]) || trim($_POST["event_id"]) === "") {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "event_id is required"
    ]);
    exit;
}

$eventId = trim($_POST["event_id"]);

try {
    // Start transaction
    $conn->begin_transaction();

    /**
     *  Delete requests related to this event
     * Covers:
     * - registration requests
     * - venue requests
     * - delete requests
     */
    $stmt = $conn->prepare(
        "DELETE FROM request WHERE RequestID = ?"
    );
    $stmt->bind_param("s", $eventId);
    $stmt->execute();

    /**
     *  Delete registrations for this event
     */
    $stmt = $conn->prepare(
        "DELETE FROM registration WHERE EventID = ?"
    );
    $stmt->bind_param("s", $eventId);
    $stmt->execute();

    /**
     *  Delete the event itself
     */
    $stmt = $conn->prepare(
        "DELETE FROM event WHERE EventID = ?"
    );
    $stmt->bind_param("s", $eventId);
    $stmt->execute();

    if ($stmt->affected_rows === 0) {
        throw new Exception("Event not found or already deleted");
    }

    // Commit all deletes
    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Event and all related data deleted successfully",
        "event_id" => $eventId
    ]);

} catch (Exception $e) {
    // Rollback everything on failure
    $conn->rollback();

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}