const API_BASE_URL = 'https://lead-to-deal-crm.onrender.com';

export async function api(path, { method = 'GET', body, token } = {}) {
  let res;

  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new Error('Backend unavailable: Unable to connect to server. Please verify the backend is running.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      data.message ||
      data.error ||
      (res.status === 401
        ? 'Unauthorized: Please log in again.'
        : res.status === 403
        ? 'Forbidden: Access denied.'
        : res.status === 404
        ? 'Resource not found.'
        : `Request failed with status ${res.status}`);

    throw new Error(errorMsg);
  }

  return data;
}