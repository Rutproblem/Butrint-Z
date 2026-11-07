import { API_BASE_URL, isApiConfigured } from './apiConfig';

const API_TIMEOUT_MS = 10000;

async function requestApi(resource, options = {}, id) {
  if (!isApiConfigured) {
    throw new Error('API-ja nuk është konfiguruar. Vendos EXPO_PUBLIC_API_URL në skedarin .env dhe rinis Expo.');
  }
  const query = new URLSearchParams({ resource, ...(id === undefined ? {} : { id: String(id) }) });
  const controller = new AbortController();
  let timeout;
  const request = (async () => {
    const response = await fetch(`${API_BASE_URL}?${query.toString()}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
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
      const error = new Error('Serveri nuk u përgjigj brenda 10 sekondash. Kontrollo Wi-Fi dhe lejen e Apache në firewall.');
      error.name = 'ApiTimeoutError';
      reject(error);
    }, API_TIMEOUT_MS);
  });

  try {
    return await Promise.race([request, deadline]);
  } catch (error) {
    if (error.name === 'ApiTimeoutError' || error.name === 'AbortError') {
      throw new Error('Serveri nuk u përgjigj brenda 10 sekondash. Kontrollo Wi-Fi dhe lejen e Apache në firewall.');
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
  return result.data;
}

export async function addBook(values) {
  const result = await requestApi('books', { method: 'POST', body: JSON.stringify(values) });
  return result.data;
}

export async function updateBook(id, values) {
  const result = await requestApi('books', { method: 'PUT', body: JSON.stringify(values) }, id);
  return result.data;
}

export async function deleteBook(id) {
  await requestApi('books', { method: 'DELETE' }, id);
}

export async function createOrder({ bookId, quantity, customer }) {
  return requestApi('orders', {
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
}