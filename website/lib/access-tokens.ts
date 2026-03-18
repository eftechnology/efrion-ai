import fs from 'fs';
import path from 'path';

export interface AccessToken {
  id: string;
  name: string;
  email: string;       // always lowercase
  company: string;
  role: string;
  erpSystem: string;
  message: string;
  submittedAt: string; // ISO
  status: 'pending' | 'active' | 'expired';
  accessToken: string; // empty until approved
  expiresAt: string | null; // ISO, null until approved
}

const DATA_FILE = path.join(process.cwd(), 'data', 'access-tokens.json');

function readAll(): AccessToken[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as AccessToken[];
  } catch {
    return [];
  }
}

function writeAll(tokens: AccessToken[]) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(tokens, null, 2));
}

function hex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function createPendingEntry(
  data: Omit<AccessToken, 'id' | 'status' | 'accessToken' | 'expiresAt'>
): AccessToken {
  const tokens = readAll();
  const entry: AccessToken = {
    ...data,
    id: `req_${Date.now()}_${hex(4)}`,
    status: 'pending',
    accessToken: '',
    expiresAt: null,
  };
  tokens.push(entry);
  writeAll(tokens);
  return entry;
}

export function approveEntry(
  id: string,
  ttlHours: number
): AccessToken | null {
  const tokens = readAll();
  const idx = tokens.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const accessToken = hex(16); // 32-char hex = 128-bit entropy
  const expiresAt = new Date(Date.now() + ttlHours * 3_600_000).toISOString();
  tokens[idx] = { ...tokens[idx], status: 'active', accessToken, expiresAt };
  writeAll(tokens);
  return tokens[idx];
}

export function findActiveToken(email: string, code: string): AccessToken | null {
  const tokens = readAll();
  return (
    tokens.find(
      (t) =>
        t.email === email.toLowerCase().trim() &&
        t.accessToken === code &&
        t.status === 'active' &&
        t.expiresAt !== null &&
        new Date(t.expiresAt) > new Date()
    ) ?? null
  );
}

export function findById(id: string): AccessToken | null {
  return readAll().find((t) => t.id === id) ?? null;
}
