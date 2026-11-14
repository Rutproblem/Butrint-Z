import { API_BASE_URL, isApiConfigured } from './apiConfig';

const API_TIMEOUT_MS = 10000;

function withBookImageUrl(book) {
  const imageBaseUrl = API_BASE_URL.slice(0, API_BASE_URL.lastIndexOf('/') + 1);
  return {
    ...book,
    imageUrl: book.imagePath ? `${imageBaseUrl}${book.imagePath}` : null,
  };
}

function createBookBody(values, image) {
  if (!image) return JSON.stringify(values);

  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });
  if (image.file) {
    formData.append('image', image.file, image.fileName || 'cover.jpg');
  } else {
    const mimeType = image.mimeType || 'image/jpeg';
    const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    formData.append('image', {
      uri: image.uri,
      name: image.fileName || `cover.${extension}`,
      type: mimeType,
    });
  }
  return formData;
}

async function requestApi(resource, options = {}, id, token, action) {
  if (!isApiConfigured) {
    throw new Error('API-ja nuk është konfiguruar. Vendos EXPO_PUBLIC_API_URL në skedarin .env dhe rinis Expo.');
  }
  const query = new URLSearchParams({
    resource,
    ...(id === undefined ? {} : { id: String(id) }),
    ...(action === undefined ? {} : { action }),
  });
  const controller = new AbortController();
  let timeout;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const timeoutMs = isFormData ? 30000 : API_TIMEOUT_MS;
  const request = (async () => {
    const response = await fetch(`${API_BASE_URL}?${query.toString()}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Kërkesa te serveri dështoi.');
    return result;
  })();
  const deadline = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      const error = new Error(`Serveri nuk u përgjigj brenda ${timeoutMs / 1000} sekondash. Kontrollo Wi-Fi dhe lejen e Apache në firewall.`);
      error.name = 'ApiTimeoutError';
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([request, deadline]);
  } catch (error) {
    if (error.name === 'ApiTimeoutError' || error.name === 'AbortError') {
      throw new Error(`Serveri nuk u përgjigj brenda ${timeoutMs / 1000} sekondash. Kontrollo Wi-Fi dhe lejen e Apache në firewall.`);
    }
    if (error instanceof TypeError) {
      throw new Error('Telefoni nuk lidhet me API-në. Hap URL-në e API-së në shfletuesin e telefonit dhe kontrollo Wi-Fi/firewall.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getBooks() {
  const result = await requestApi('books');
  return result.data.map(withBookImageUrl);
}

export async function addBook(values, token, image) {
  const result = await requestApi('books', { method: 'POST', body: createBookBody(values, image) }, undefined, token);
  return withBookImageUrl(result.data);
}

export async function updateBook(id, values, token, image) {
  const result = await requestApi(
    'books',
    { method: image ? 'POST' : 'PUT', body: createBookBody(values, image) },
    id,
    token,
    image ? 'update' : undefined
  );
  return withBookImageUrl(result.data);
}

export async function deleteBook(id, token) {
  await requestApi('books', { method: 'DELETE' }, id, token);
}

export async function createOrder({ bookId, quantity, customer }) {
  const result = await requestApi('orders', {
    method: 'POST',
    body: JSON.stringify({
      book_id: bookId,
      quantity,
      customer_name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    }),
  });
  return {
    ...result,
    book: withBookImageUrl(result.book),
  };
}

export async function loginDeveloper({ username, password }) {
  const result = await requestApi('auth', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }, undefined, undefined, 'login');
  return result.data;
}

export async function logoutDeveloper(token) {
  await requestApi('auth', { method: 'POST' }, undefined, token, 'logout');
}

export async function getDeveloperAccounts(token) {
  const result = await requestApi('auth', {}, undefined, token, 'list');
  return result.data;
}

export async function createDeveloperAccount({ username, password }, token) {
  const result = await requestApi('auth', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }, undefined, token, 'create');
  return result.data;
}

export async function getOrders(token) {
  const result = await requestApi('orders', {}, undefined, token);
  return result.data;
}

export async function updateOrder(id, values, token) {
  const result = await requestApi('orders', {
    method: 'PUT',
    body: JSON.stringify(values),
  }, id, token);
  return result.data;
}

export async function cancelOrder(id, token) {
  const result = await requestApi('orders', {
    method: 'POST',
  }, id, token, 'cancel');
  return result.data;
}