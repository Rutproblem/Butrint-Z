<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestData(): array
{
    $data = json_decode(file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function serializeBook(array $book): array
{
    return [
        'id' => (int) $book['id'],
        'title' => $book['title'],
        'author' => $book['author'],
        'category' => $book['category'],
        'price' => (float) $book['price'],
        'stock' => (int) $book['stock'],
        'description' => $book['description'] ?? '',
        'coverColor' => $book['cover_color'],
    ];
}

function requiredText(array $data, string $key, int $maxLength): string
{
    $value = trim((string) ($data[$key] ?? ''));
    if ($value === '' || mb_strlen($value) > $maxLength) {
        respond(422, ['error' => "Fusha {$key} është e detyrueshme."]);
    }
    return $value;
}

try {
    $configPath = __DIR__ . '/config.php';
    if (!is_file($configPath)) {
        respond(500, ['error' => 'Krijo backend/config.php nga config.example.php dhe plotëso lidhjen MySQL.']);
    }

    $config = require $configPath;
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['database']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $resource = $_GET['resource'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    if ($resource === 'books' && $method === 'GET') {
        $statement = $pdo->query('SELECT * FROM books ORDER BY id DESC');
        respond(200, ['data' => array_map('serializeBook', $statement->fetchAll())]);
    }

    if ($resource === 'books' && $method === 'POST') {
        $data = requestData();
        $title = requiredText($data, 'title', 180);
        $author = requiredText($data, 'author', 140);
        $category = requiredText($data, 'category', 60);
        $price = filter_var($data['price'] ?? null, FILTER_VALIDATE_FLOAT);
        $stock = filter_var($data['stock'] ?? null, FILTER_VALIDATE_INT);
        if ($price === false || $price <= 0 || $stock === false || $stock < 0) {
            respond(422, ['error' => 'Çmimi ose stoku nuk është i vlefshëm.']);
        }

        $statement = $pdo->prepare(
            'INSERT INTO books (title, author, category, price, stock, description, cover_color)
             VALUES (:title, :author, :category, :price, :stock, :description, :cover_color)'
        );
        $statement->execute([
            'title' => $title,
            'author' => $author,
            'category' => $category,
            'price' => $price,
            'stock' => $stock,
            'description' => trim((string) ($data['description'] ?? '')),
            'cover_color' => (string) ($data['coverColor'] ?? '#315f4c'),
        ]);
        $book = $pdo->query('SELECT * FROM books WHERE id = ' . (int) $pdo->lastInsertId())->fetch();
        respond(201, ['data' => serializeBook($book)]);
    }

    if ($resource === 'books' && $method === 'PUT') {
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        $data = requestData();
        $title = requiredText($data, 'title', 180);
        $author = requiredText($data, 'author', 140);
        $category = requiredText($data, 'category', 60);
        $price = filter_var($data['price'] ?? null, FILTER_VALIDATE_FLOAT);
        $stock = filter_var($data['stock'] ?? null, FILTER_VALIDATE_INT);
        if (!$id || $price === false || $price <= 0 || $stock === false || $stock < 0) {
            respond(422, ['error' => 'Të dhënat e librit nuk janë të vlefshme.']);
        }
        $statement = $pdo->prepare(
            'UPDATE books SET title = :title, author = :author, category = :category,
             price = :price, stock = :stock, description = :description WHERE id = :id'
        );
        $statement->execute([
            'title' => $title,
            'author' => $author,
            'category' => $category,
            'price' => $price,
            'stock' => $stock,
            'description' => trim((string) ($data['description'] ?? '')),
            'id' => $id,
        ]);
        $statement = $pdo->prepare('SELECT * FROM books WHERE id = ?');
        $statement->execute([$id]);
        $book = $statement->fetch();
        if (!$book) {
            respond(404, ['error' => 'Libri nuk u gjet.']);
        }
        respond(200, ['data' => serializeBook($book)]);
    }

    if ($resource === 'books' && $method === 'DELETE') {
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) {
            respond(422, ['error' => 'ID e librit nuk është e vlefshme.']);
        }
        $statement = $pdo->prepare('DELETE FROM books WHERE id = ?');
        $statement->execute([$id]);
        if ($statement->rowCount() === 0) {
            respond(404, ['error' => 'Libri nuk u gjet.']);
        }
        respond(200, ['message' => 'Libri u fshi.']);
    }

    if ($resource === 'orders' && $method === 'POST') {
        $data = requestData();
        $bookId = filter_var($data['book_id'] ?? null, FILTER_VALIDATE_INT);
        $quantity = filter_var($data['quantity'] ?? null, FILTER_VALIDATE_INT);
        $customerName = requiredText($data, 'customer_name', 140);
        $email = filter_var(trim((string) ($data['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        $phone = requiredText($data, 'phone', 40);
        $address = requiredText($data, 'address', 255);
        if (!$bookId || !$quantity || $quantity < 1 || !$email) {
            respond(422, ['error' => 'Kontrollo librin, sasinë dhe email-in.']);
        }

        $pdo->beginTransaction();
        $statement = $pdo->prepare('SELECT * FROM books WHERE id = ? FOR UPDATE');
        $statement->execute([$bookId]);
        $book = $statement->fetch();
        if (!$book || (int) $book['stock'] < $quantity) {
            $pdo->rollBack();
            respond(409, ['error' => 'Nuk ka kopje të mjaftueshme në stok. Rifresko katalogun.']);
        }

        $unitPrice = (float) $book['price'];
        $total = round($unitPrice * $quantity, 2);
        $statement = $pdo->prepare(
            'INSERT INTO orders (customer_name, email, phone, address, total)
             VALUES (:customer_name, :email, :phone, :address, :total)'
        );
        $statement->execute([
            'customer_name' => $customerName,
            'email' => $email,
            'phone' => $phone,
            'address' => $address,
            'total' => $total,
        ]);
        $orderId = (int) $pdo->lastInsertId();

        $statement = $pdo->prepare(
            'INSERT INTO order_items (order_id, book_id, book_title, unit_price, quantity, line_total)
             VALUES (:order_id, :book_id, :book_title, :unit_price, :quantity, :line_total)'
        );
        $statement->execute([
            'order_id' => $orderId,
            'book_id' => $bookId,
            'book_title' => $book['title'],
            'unit_price' => $unitPrice,
            'quantity' => $quantity,
            'line_total' => $total,
        ]);
        $statement = $pdo->prepare('UPDATE books SET stock = stock - :quantity WHERE id = :id');
        $statement->execute(['quantity' => $quantity, 'id' => $bookId]);
        $pdo->commit();

        $statement = $pdo->prepare('SELECT * FROM books WHERE id = ?');
        $statement->execute([$bookId]);
        $updatedBook = serializeBook($statement->fetch());
        respond(201, [
            'order' => [
                'id' => $orderId,
                'total' => $total,
                'quantity' => $quantity,
                'status' => 'new',
            ],
            'book' => $updatedBook,
        ]);
    }

    respond(404, ['error' => 'Endpoint-i nuk u gjet.']);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($error->getMessage());
    respond(500, ['error' => 'Gabim i brendshëm i API-së. Kontrollo konfigurimin e PHP/MySQL.']);
}