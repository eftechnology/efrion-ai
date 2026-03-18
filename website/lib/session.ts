/**
 * Lightweight HMAC-SHA256 session tokens.
 * Works in both Edge (middleware) and Node.js (API routes).
 * Format: base64url(payload) + "." + base64url(hmac)
 */

export interface SessionPayload {
  tokenId: string;
  expiresAt: number; // Unix ms
}

function getSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-secret-change-in-production';
}

async function importKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function b64u(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function fromb64u(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const enc = new TextEncoder();
  const data = b64u(enc.encode(JSON.stringify(payload)));
  const key = await importKey();
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${b64u(new Uint8Array(sig))}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);

  try {
    const key = await importKey();
    const enc = new TextEncoder();
    const sigBytes = fromb64u(sigPart);
    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes.buffer as ArrayBuffer,
      enc.encode(data)
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromb64u(data))
    ) as SessionPayload;

    if (typeof payload.expiresAt !== 'number' || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
