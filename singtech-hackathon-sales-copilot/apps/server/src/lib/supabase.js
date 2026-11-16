import { HttpError } from '../middleware/errorHandler.js';

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}

export async function supabaseRequest(path, { method = 'GET', body, prefer } = {}) {
  const config = getSupabaseConfig();
  if (!config)
    throw new HttpError(
      503,
      'DATABASE_NOT_CONFIGURED',
      'Supabase database credentials are not configured',
    );

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(prefer && { Prefer: prefer }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new HttpError(502, 'DATABASE_REQUEST_FAILED', 'Supabase database request failed');
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function getStorageStatus() {
  if (!getSupabaseConfig())
    return {
      provider: 'local prototype files',
      configured: false,
      connected: false,
      vectorReady: false,
    };
  try {
    await supabaseRequest('accounts?select=id&limit=1');
    await supabaseRequest('document_chunks?select=id&limit=1');
    return {
      provider: 'Supabase Postgres + pgvector',
      configured: true,
      connected: true,
      vectorReady: true,
    };
  } catch {
    return {
      provider: 'Supabase Postgres + pgvector',
      configured: true,
      connected: false,
      vectorReady: false,
    };
  }
}
