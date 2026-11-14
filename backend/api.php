<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (strpos($contentType, 'multipart/form-data') === 0) {
        return $_POST;
    }

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
        'imagePath' => $book['image_path'] ?? null,
    ];
}

function fetchBook(PDO $pdo, int $id): ?array
{
    $statement = $pdo->prepare(
        'SELECT b.*, bi.image_path FROM books b
         LEFT JOIN book_images bi ON bi.book_id = b.id
         WHERE b.id = ?'
    );
    $statement->execute([$id]);
    $book = $statement->fetch();
    return $book ?: null;
}

function storeBookImageUpload(): ?string
{
    if (!isset($_FILES['image'])) {
        return null;
    }

    $upload = $_FILES['image'];
    $uploadError = (int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($uploadError === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($uploadError !== UPLOAD_ERR_OK) {
        respond(422, ['error' => 'Ngarkimi i imazhit dështoi. Provo një imazh tjetër.']);
    }
    if ((int) ($upload['size'] ?? 0) > 4 * 1024 * 1024) {
        respond(413, ['error' => 'Imazhi duhet të jetë jo më i madh se 4 MB.']);
    }

    $temporaryPath = (string) ($upload['tmp_name'] ?? '');
    if ($temporaryPath === '' || !is_uploaded_file($temporaryPath)) {
        respond(422, ['error' => 'Skedari i imazhit nuk është i vlefshëm.']);
    }
    $imageInfo = @getimagesize($temporaryPath);
    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    $mimeType = is_array($imageInfo) ? ($imageInfo['mime'] ?? '') : '';
    if (!isset($extensions[$mimeType])) {
        respond(422, ['error' => 'Përdor një imazh JPG, PNG ose WebP.']);
    }
    if (($imageInfo[0] * $imageInfo[1]) > 20000000) {
        respond(422, ['error' => 'Përmasat e imazhit janë shumë të mëdha.']);
    }

    $directory = __DIR__ . '/uploads/books';
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException('Could not create book image directory.');
    }
    $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mimeType];
    if (!move_uploaded_file($temporaryPath, $directory . '/' . $filename)) {
        throw new RuntimeException('Could not store uploaded book image.');
    }

    return 'uploads/books/' . $filename;
}

function deleteStoredBookImage(?string $imagePath): void
{
    if ($imagePath === null || $imagePath === '') {
        return;
    }
    if (!preg_match('~\Auploads/books/[a-f0-9]{32}\.(?:jpg|png|webp)\z~', $imagePath)) {
        throw new RuntimeException('Stored book image path is invalid.');
    }

    $filePath = __DIR__ . '/' . str_replace('/', DIRECTORY_SEPARATOR, $imagePath);
    if (is_file($filePath) && !unlink($filePath)) {
        throw new RuntimeException('Could not remove stored book image.');
    }
}

function requiredText(array $data, string $key, int $maxLength): string
{
    $value = trim((string) ($data[$key] ?? ''));
    if ($value === '' || mb_strlen($value) > $maxLength) {
        respond(422, ['error' => "Fusha {$key} është e detyrueshme."]);
    }
    return $value;
}

function requireDeveloper(PDO $pdo): array
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($authorization === '' && function_exists('getallheaders')) {
        $headers = getallheaders();
        $authorization = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!preg_match('/^Bearer\s+([a-f0-9]{64})$/i', $authorization, $matches)) {
        respond(401, ['error' => 'Hyr në panelin e zhvilluesit për të kryer këtë veprim.']);
    }

    $tokenHash = hash('sha256', strtolower($matches[1]));
    $statement = $pdo->prepare(
        'SELECT d.id, d.username FROM developer_tokens t
         INNER JOIN developers d ON d.id = t.developer_id
         WHERE t.token_hash = ? AND t.expires_at > UTC_TIMESTAMP()'
    );
    $statement->execute([$tokenHash]);
    $developer = $statement->fetch();
    if (!$developer) {
        respond(401, ['error' => 'Sesioni i zhvilluesit ka skaduar. Hyr përsëri.']);
    }

    return [
        'id' => (int) $developer['id'],
        'username' => $developer['username'],
        'token_hash' => $tokenHash,
    ];
}

function fetchOrder(PDO $pdo, int $id): ?array
{
    $statement = $pdo->prepare(
        'SELECT o.id, o.customer_name, o.email, o.phone, o.address, o.total, o.status, o.created_at,
                oi.book_id, oi.book_title, oi.unit_price, oi.quantity, oi.line_total
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
         WHERE o.id = ?
         ORDER BY oi.id
         LIMIT 1'
    );
    $statement->execute([$id]);
    $order = $statement->fetch();
    if (!$order) {
        return null;
    }

    return [
        'id' => (int) $order['id'],
        'customer_name' => $order['customer_name'],
        'email' => $order['email'],
        'phone' => $order['phone'],
        'address' => $order['address'],
        'total' => (float) $order['total'],
        'status' => $order['status'],
        'created_at' => $order['created_at'],
        'book_id' => $order['book_id'] === null ? null : (int) $order['book_id'],
        'book_title' => $order['book_title'] ?? '',
        'unit_price' => (float) ($order['unit_price'] ?? 0),
        'quantity' => (int) ($order['quantity'] ?? 0),
        'line_total' => (float) ($order['line_total'] ?? 0),
    ];
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
    $action = $_GET['action'] ?? '';

    if ($resource === 'auth' && $method === 'POST' && $action === 'login') {
        $data = requestData();
        $username = trim((string) ($data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        if ($username === '' || $password === '') {
            respond(422, ['error' => 'Shkruaj emrin e përdoruesit dhe fjalëkalimin.']);
        }

        $statement = $pdo->prepare('SELECT id, username, password_hash FROM developers WHERE username = ?');
        $statement->execute([$username]);
        $developer = $statement->fetch();
        if (!$developer || !password_verify($password, $developer['password_hash'])) {
            respond(401, ['error' => 'Emri i përdoruesit ose fjalëkalimi nuk është i saktë.']);
        }

        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $pdo->prepare('DELETE FROM developer_tokens WHERE expires_at <= UTC_TIMESTAMP()')->execute();
        $statement = $pdo->prepare(
            'INSERT INTO developer_tokens (token_hash, developer_id, expires_at)
             VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))'
        );
        $statement->execute([$tokenHash, $developer['id']]);
        respond(200, ['data' => [
            'token' => $token,
            'username' => $developer['username'],
            'expires_in' => 28800,
        ]]);
    }

    if ($resource === 'auth' && $method === 'POST' && $action === 'logout') {
        $developer = requireDeveloper($pdo);
        $statement = $pdo->prepare('DELETE FROM developer_tokens WHERE token_hash = ?');
        $statement->execute([$developer['token_hash']]);
        respond(200, ['message' => 'Sesioni u mbyll.']);
    }

    if ($resource === 'auth' && $method === 'GET' && $action === 'list') {
        requireDeveloper($pdo);
        $statement = $pdo->query('SELECT id, username, created_at FROM developers ORDER BY username');
        respond(200, ['data' => $statement->fetchAll()]);
    }

    if ($resource === 'auth' && $method === 'POST' && $action === 'create') {
        requireDeveloper($pdo);
        $data = requestData();
        $username = trim((string) ($data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        if (!preg_match('/^[a-zA-Z0-9_.-]{3,80}$/', $username)) {
            respond(422, ['error' => 'Emri duhet të ketë 3-80 karaktere: shkronja, numra, pikë, vijë ose nënvizë.']);
        }
        if (strlen($password) < 12) {
            respond(422, ['error' => 'Fjalëkalimi duhet të ketë të paktën 12 karaktere.']);
        }

        try {
            $statement = $pdo->prepare('INSERT INTO developers (username, password_hash) VALUES (?, ?)');
            $statement->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') {
                respond(409, ['error' => 'Ky emër përdoruesi ekziston. Zgjidh një tjetër.']);
            }
            throw $error;
        }

        $statement = $pdo->prepare('SELECT id, username, created_at FROM developers WHERE id = ?');
        $statement->execute([(int) $pdo->lastInsertId()]);
        respond(201, ['data' => $statement->fetch()]);
    }

    if ($resource === 'books' && $method === 'GET') {
        $statement = $pdo->query(
            'SELECT b.*, bi.image_path FROM books b
             LEFT JOIN book_images bi ON bi.book_id = b.id
             ORDER BY b.id DESC'
        );
        respond(200, ['data' => array_map('serializeBook', $statement->fetchAll())]);
    }

    if ($resource === 'orders' && $method === 'POST' && !isset($_GET['id']) && $action === '') {
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

        $updatedBook = serializeBook(fetchBook($pdo, (int) $bookId));
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

    if ($resource === 'orders' && $method === 'GET') {
        requireDeveloper($pdo);
        $statement = $pdo->query(
            'SELECT o.id, o.customer_name, o.email, o.phone, o.address, o.total, o.status, o.created_at,
                    oi.book_id, oi.book_title, oi.unit_price, oi.quantity, oi.line_total
             FROM orders o
             LEFT JOIN order_items oi ON oi.order_id = o.id
             ORDER BY o.id DESC, oi.id'
        );
        $orders = [];
        foreach ($statement->fetchAll() as $row) {
            $orders[] = [
                'id' => (int) $row['id'],
                'customer_name' => $row['customer_name'],
                'email' => $row['email'],
                'phone' => $row['phone'],
                'address' => $row['address'],
                'total' => (float) $row['total'],
                'status' => $row['status'],
                'created_at' => $row['created_at'],
                'book_id' => $row['book_id'] === null ? null : (int) $row['book_id'],
                'book_title' => $row['book_title'] ?? '',
                'unit_price' => (float) ($row['unit_price'] ?? 0),
                'quantity' => (int) ($row['quantity'] ?? 0),
                'line_total' => (float) ($row['line_total'] ?? 0),
            ];
        }
        respond(200, ['data' => $orders]);
    }

    if ($resource === 'books' && $method === 'POST' && $action === '') {
        requireDeveloper($pdo);
        $data = requestData();
        $title = requiredText($data, 'title', 180);
        $author = requiredText($data, 'author', 140);
        $category = requiredText($data, 'category', 60);
        $price = filter_var($data['price'] ?? null, FILTER_VALIDATE_FLOAT);
        $stock = filter_var($data['stock'] ?? null, FILTER_VALIDATE_INT);
        if ($price === false || $price <= 0 || $stock === false || $stock < 0) {
            respond(422, ['error' => 'Çmimi ose stoku nuk është i vlefshëm.']);
        }

        $imagePath = storeBookImageUpload();
        try {
            $pdo->beginTransaction();
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
            $bookId = (int) $pdo->lastInsertId();
            if ($imagePath !== null) {
                $statement = $pdo->prepare('INSERT INTO book_images (book_id, image_path) VALUES (?, ?)');
                $statement->execute([$bookId, $imagePath]);
            }
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            if ($imagePath !== null) {
                try {
                    deleteStoredBookImage($imagePath);
                } catch (Throwable $cleanupError) {
                    error_log($cleanupError->getMessage());
                }
            }
            throw $error;
        }

        $book = fetchBook($pdo, $bookId);
        respond(201, ['data' => serializeBook($book)]);
    }

    if ($resource === 'books' && (
        ($method === 'PUT' && $action === '')
        || ($method === 'POST' && $action === 'update')
    )) {
        requireDeveloper($pdo);
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
        $existingBook = fetchBook($pdo, (int) $id);
        if (!$existingBook) {
            respond(404, ['error' => 'Libri nuk u gjet.']);
        }
        $imagePath = storeBookImageUpload();
        try {
            $pdo->beginTransaction();
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
            if ($imagePath !== null) {
                $statement = $pdo->prepare(
                    'INSERT INTO book_images (book_id, image_path) VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE image_path = ?'
                );
                $statement->execute([$id, $imagePath, $imagePath]);
            }
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            if ($imagePath !== null) {
                try {
                    deleteStoredBookImage($imagePath);
                } catch (Throwable $cleanupError) {
                    error_log($cleanupError->getMessage());
                }
            }
            throw $error;
        }
        if ($imagePath !== null && $existingBook['image_path'] !== $imagePath) {
            deleteStoredBookImage($existingBook['image_path']);
        }
        $book = fetchBook($pdo, (int) $id);
        respond(200, ['data' => serializeBook($book)]);
    }

    if ($resource === 'books' && $method === 'DELETE') {
        requireDeveloper($pdo);
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) {
            respond(422, ['error' => 'ID e librit nuk është e vlefshme.']);
        }
        $book = fetchBook($pdo, (int) $id);
        if (!$book) {
            respond(404, ['error' => 'Libri nuk u gjet.']);
        }
        $statement = $pdo->prepare('DELETE FROM books WHERE id = ?');
        $statement->execute([$id]);
        if ($statement->rowCount() === 0) {
            respond(404, ['error' => 'Libri nuk u gjet.']);
        }
        deleteStoredBookImage($book['image_path']);
        respond(200, ['message' => 'Libri u fshi.']);
    }

    if ($resource === 'orders' && $method === 'PUT') {
        requireDeveloper($pdo);
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        $data = requestData();
        $bookId = filter_var($data['book_id'] ?? null, FILTER_VALIDATE_INT);
        $quantity = filter_var($data['quantity'] ?? null, FILTER_VALIDATE_INT);
        $customerName = requiredText($data, 'customer_name', 140);
        $email = filter_var(trim((string) ($data['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        $phone = requiredText($data, 'phone', 40);
        $address = requiredText($data, 'address', 255);
        $status = (string) ($data['status'] ?? '');
        if (!$id || !$bookId || !$quantity || $quantity < 1 || !$email
            || !in_array($status, ['new', 'processing', 'completed'], true)) {
            respond(422, ['error' => 'Të dhënat e porosisë nuk janë të vlefshme.']);
        }

        $pdo->beginTransaction();
        $statement = $pdo->prepare('SELECT id, status FROM orders WHERE id = ? FOR UPDATE');
        $statement->execute([$id]);
        $order = $statement->fetch();
        if (!$order) {
            $pdo->rollBack();
            respond(404, ['error' => 'Porosia nuk u gjet.']);
        }
        if (!in_array($order['status'], ['new', 'processing'], true)) {
            $pdo->rollBack();
            respond(409, ['error' => 'Porositë e përfunduara ose të anuluara nuk mund të ndryshohen.']);
        }

        $statement = $pdo->prepare('SELECT id, book_id, quantity FROM order_items WHERE order_id = ? FOR UPDATE');
        $statement->execute([$id]);
        $items = $statement->fetchAll();
        if (count($items) !== 1) {
            $pdo->rollBack();
            respond(409, ['error' => 'Mund të ndryshohen vetëm porositë me një libër.']);
        }

        $item = $items[0];
        $oldBookId = $item['book_id'] === null ? null : (int) $item['book_id'];
        $oldQuantity = (int) $item['quantity'];
        $bookIds = array_values(array_unique(array_filter([$oldBookId, (int) $bookId])));
        sort($bookIds, SORT_NUMERIC);
        $placeholders = implode(',', array_fill(0, count($bookIds), '?'));
        $statement = $pdo->prepare(
            "SELECT id, title, price, stock FROM books WHERE id IN ({$placeholders}) ORDER BY id FOR UPDATE"
        );
        $statement->execute($bookIds);
        $lockedBooks = [];
        foreach ($statement->fetchAll() as $lockedBook) {
            $lockedBooks[(int) $lockedBook['id']] = $lockedBook;
        }
        if (!isset($lockedBooks[(int) $bookId])) {
            $pdo->rollBack();
            respond(404, ['error' => 'Libri i zgjedhur nuk u gjet.']);
        }

        $book = $lockedBooks[(int) $bookId];
        $available = (int) $book['stock'] + ($oldBookId === (int) $bookId ? $oldQuantity : 0);
        if ($available < $quantity) {
            $pdo->rollBack();
            respond(409, ['error' => 'Nuk ka kopje të mjaftueshme për sasinë e zgjedhur.']);
        }

        if ($oldBookId === (int) $bookId) {
            $statement = $pdo->prepare('UPDATE books SET stock = ? WHERE id = ?');
            $statement->execute([$available - $quantity, $bookId]);
        } else {
            if ($oldBookId !== null && isset($lockedBooks[$oldBookId])) {
                $statement = $pdo->prepare('UPDATE books SET stock = stock + ? WHERE id = ?');
                $statement->execute([$oldQuantity, $oldBookId]);
            }
            $statement = $pdo->prepare('UPDATE books SET stock = stock - ? WHERE id = ?');
            $statement->execute([$quantity, $bookId]);
        }

        $unitPrice = (float) $book['price'];
        $total = round($unitPrice * $quantity, 2);
        $statement = $pdo->prepare(
            'UPDATE order_items
             SET book_id = ?, book_title = ?, unit_price = ?, quantity = ?, line_total = ?
             WHERE id = ?'
        );
        $statement->execute([$bookId, $book['title'], $unitPrice, $quantity, $total, $item['id']]);
        $statement = $pdo->prepare(
            'UPDATE orders SET customer_name = ?, email = ?, phone = ?, address = ?, total = ?, status = ?
             WHERE id = ?'
        );
        $statement->execute([$customerName, $email, $phone, $address, $total, $status, $id]);
        $pdo->commit();
        respond(200, ['data' => fetchOrder($pdo, (int) $id)]);
    }

    if ($resource === 'orders' && $method === 'POST' && $action === 'cancel') {
        requireDeveloper($pdo);
        $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) {
            respond(422, ['error' => 'ID e porosisë nuk është e vlefshme.']);
        }

        $pdo->beginTransaction();
        $statement = $pdo->prepare('SELECT status FROM orders WHERE id = ? FOR UPDATE');
        $statement->execute([$id]);
        $order = $statement->fetch();
        if (!$order) {
            $pdo->rollBack();
            respond(404, ['error' => 'Porosia nuk u gjet.']);
        }
        if (!in_array($order['status'], ['new', 'processing'], true)) {
            $pdo->rollBack();
            respond(409, ['error' => 'Porositë e përfunduara ose të anuluara nuk mund të anulohen.']);
        }

        $statement = $pdo->prepare('SELECT book_id, quantity FROM order_items WHERE order_id = ? FOR UPDATE');
        $statement->execute([$id]);
        foreach ($statement->fetchAll() as $item) {
            if ($item['book_id'] !== null) {
                $restore = $pdo->prepare('UPDATE books SET stock = stock + ? WHERE id = ?');
                $restore->execute([(int) $item['quantity'], (int) $item['book_id']]);
            }
        }
        $statement = $pdo->prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?");
        $statement->execute([$id]);
        $pdo->commit();
        respond(200, ['data' => fetchOrder($pdo, (int) $id)]);
    }

    respond(404, ['error' => 'Endpoint-i nuk u gjet.']);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($error->getMessage());
    respond(500, ['error' => 'Gabim i brendshëm i API-së. Kontrollo konfigurimin e PHP/MySQL.']);
}