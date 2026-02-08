<?php
$conn = new mysqli("localhost", "root", "", "event scheduling");

if ($conn->connect_error) {
    die(json_encode(["error" => "Database connection failed"]));
}
?>