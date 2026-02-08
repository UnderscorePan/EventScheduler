<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

require __DIR__ . "/dbsecure.php";

function uuidv4(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // version 4
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // variant
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

// ---- PREFLIGHT ----
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

// ---- READ INPUT ONCE ----
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["message" => "Invalid JSON"]);
    exit;
}

// ---- NORMALIZE INPUT ----
$email = trim(strtolower($data["email"] ?? ""));
$password = trim($data["password"] ?? "");
$securityQuestion = trim($data["securityQuestion"] ?? "");
$securityAnswer = trim($data["securityAnswer"] ?? "");
$role = $data["role"] ?? "student";
$userId = uuidv4();
$name = trim($data["name"]);

$allowedRoles = ["student", "event_manager", "admin", "on_site_manager"];

if (!in_array($role, $allowedRoles, true)) {
    $role = "student";
}

if ($securityQuestion === "" || $securityAnswer === "") {
    http_response_code(400);
    echo json_encode(["message" => "Security question and answer required"]);
    exit;
}

$securityAnswerHash = password_hash(
    $securityAnswer,
    PASSWORD_DEFAULT
);

if ($email === "" || $password === "") {
    http_response_code(400);
    echo json_encode(["message" => "Email and password are required"]);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(["message" => "Password must be at least 6 characters"]);
    exit;
}

// ---- CHECK IF USER EXISTS ----
$check = $pdo->prepare("SELECT 1 FROM users WHERE Email = ? LIMIT 1");
$check->execute([$email]);

if ($check->fetch()) {
    http_response_code(409);
    echo json_encode(["message" => "Email already registered"]);
    exit;
}

// ---- HASH PASSWORD ----
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

// ---- INSERT USER ----
$stmt = $pdo->prepare(
  "INSERT INTO users 
   (UserID, Email, Password, Role, SecurityQuestion, SecurityAnswerHash)
   VALUES (?, ?, ?, ?, ?, ?)"
);

$stmt->execute([
    $userId,
    $email,
    $passwordHash,
    $role,
    $securityQuestion,
    $securityAnswerHash
]);

switch ($role) {
    case "student":
        $stmt = $pdo->prepare(
            "INSERT INTO student (StudentID, Name) VALUES (? , ?)"
        );
        $stmt->execute([$userId, $name]);
        break;

    case "admin":
        $stmt = $pdo->prepare(
            "INSERT INTO administrator (AdminID, Name) VALUES (? , ?)"
        );
        $stmt->execute([$userId,$name]);
        break;

    case "event_manager":
        $stmt = $pdo->prepare(
            "INSERT INTO event_manager (StaffID, Name) VALUES (? , ?)"
        );
        $stmt->execute([$userId, $name]);
        break;

    case "on_site_manager":
        $stmt = $pdo->prepare(
            "INSERT INTO on_site_manager (StaffID, Name) VALUES (? , ?)"
        );
        $stmt->execute([$userId, $name]);
        break;
}


// ---- SUCCESS ----
http_response_code(201);
echo json_encode([
    "message" => "Account created successfully"
]);