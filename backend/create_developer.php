<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    fwrite(STDERR, "Create config.php from config.example.php before creating a developer account.\n");
    exit(1);
}

$config = require $configPath;
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $config['host'],
    $config['port'],
    $config['database']
);

try {
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    fwrite(STDOUT, "Developer username: ");
    $username = trim((string) fgets(STDIN));
    fwrite(STDOUT, "Developer password: ");
    $password = rtrim((string) fgets(STDIN), "\r\n");

    if (!preg_match('/^[a-zA-Z0-9_.-]{3,80}$/', $username)) {
        fwrite(STDERR, "Username must be 3-80 characters and use letters, numbers, dot, underscore or hyphen.\n");
        exit(1);
    }
    if (strlen($password) < 12) {
        fwrite(STDERR, "Password must be at least 12 characters.\n");
        exit(1);
    }

    $statement = $pdo->prepare('INSERT INTO developers (username, password_hash) VALUES (?, ?)');
    $statement->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
    fwrite(STDOUT, "Developer account created.\n");
} catch (PDOException $error) {
    if ($error->getCode() === '42S02') {
        fwrite(STDERR, "Import schema.sql first to create the developer tables.\n");
        exit(1);
    }
    if ($error->getCode() === '23000') {
        fwrite(STDERR, "That developer username already exists.\n");
        exit(1);
    }
    fwrite(STDERR, "Could not create developer account: {$error->getMessage()}\n");
    exit(1);
}
