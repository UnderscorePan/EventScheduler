<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

require __DIR__ . "/dbsecure.php";

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

$email = trim($data["email"] ?? "");
$password = $data["password"] ?? "";

if (!$email || !$password) {
  http_response_code(400);
  echo json_encode(["message" => "Email and password are required"]);
  exit;
}

// find user
$stmt = $pdo->prepare(
  "SELECT UserID, Email, Password, Role FROM users WHERE Email = ?"
);

$stmt->execute([$email]);


$user = $stmt->fetch();

if (!$user || !password_verify($password, $user["Password"])) {
  http_response_code(401);
  echo json_encode(["message" => "Invalid email or password"]);
  exit;
}

// success (basic version)
echo json_encode([
  "role" => $user["Role"],
  "user" => [
    "id" => $user["UserID"],
    "email" => $user["Email"]
  ]
]);
