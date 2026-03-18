/**
 * JWT session verification using jose (Edge-runtime compatible).
 * Tokens are signed by the FastAPI backend with HS256.
 */

import { jwtVerify } from 'jose';

export interface SessionPayload {
  tokenId: string;
  expiresAt: number; // Unix ms
}

function secret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'
  );
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return {
      tokenId: payload.sub as string,
      expiresAt: (payload.exp as number) * 1000,
    };
  } catch {
    return null;
  }
}
