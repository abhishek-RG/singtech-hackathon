import { API_PREFIX } from '@singtech/shared';

// Empty in dev (Vite proxies /api). Set VITE_API_BASE_URL when the API is hosted elsewhere.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Thin fetch wrapper. Paths are relative to /api, e.g. request('/health').
 * Resolves with the parsed JSON body ({ ok: true, data } by convention).
 * Rejects with ApiError on network failure, non-2xx, or { ok: false }.
 */
export async function request(path, { method = 'GET', body, headers, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('API not reachable', { code: 'NETWORK_ERROR' });
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json || json.ok === false) {
    throw new ApiError(json?.error?.message || `Request failed (${res.status})`, {
      status: res.status,
      code: json?.error?.code || 'HTTP_ERROR',
    });
  }

  return json;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
