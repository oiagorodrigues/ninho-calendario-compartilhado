import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { AppError } from './errors.ts';
import { readString } from './rows.ts';

const SCRYPT_KEYLEN = 64;
const SESSION_TTL_MS = 30 * 86_400_000;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || salt === undefined || hash === undefined) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = scryptSync(password, Buffer.from(salt, 'base64url'), expected.length);
  return timingSafeEqual(expected, actual);
}

// Verifying against a throwaway hash keeps "unknown e-mail" as slow as "wrong password".
const DUMMY_HASH = hashPassword(randomUUID());

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createUser(db: DatabaseSync, input: { name: string; email: string; password: string }): SessionUser {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email);
  if (existing !== undefined) {
    throw new AppError('conflict', 'Já existe uma conta com esse e-mail', { email: 'Já existe uma conta com esse e-mail' });
  }
  const user = { id: randomUUID(), name: input.name, email: input.email };
  db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(
    user.id,
    user.email,
    user.name,
    hashPassword(input.password),
    new Date().toISOString(),
  );
  return user;
}

export function authenticate(db: DatabaseSync, email: string, password: string): SessionUser {
  const row = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').get(email);
  if (row === undefined) {
    verifyPassword(password, DUMMY_HASH);
    throw new AppError('unauthenticated', 'E-mail ou senha incorretos');
  }
  if (!verifyPassword(password, readString(row, 'password_hash'))) {
    throw new AppError('unauthenticated', 'E-mail ou senha incorretos');
  }
  return { id: readString(row, 'id'), name: readString(row, 'name'), email: readString(row, 'email') };
}

/** Creates a session and returns the raw token for the cookie; only its hash is stored. */
export function createSession(db: DatabaseSync, userId: string, now = new Date()): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString());
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    hashToken(token),
    userId,
    expiresAt.toISOString(),
  );
  return { token, expiresAt };
}

export function findSessionUser(db: DatabaseSync, token: string, now = new Date()): SessionUser | null {
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), now.toISOString());
  if (row === undefined) return null;
  return { id: readString(row, 'id'), name: readString(row, 'name'), email: readString(row, 'email') };
}

export function deleteSession(db: DatabaseSync, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

/** Fixed-window limiter kept in memory; enough for a single-process deploy. */
export function createRateLimiter(options: { limit: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function hit(key: string, now = Date.now()): void {
    const entry = hits.get(key);
    if (entry === undefined || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      return;
    }
    entry.count++;
    if (entry.count > options.limit) {
      throw new AppError('rate_limited', 'Muitas tentativas. Espere alguns minutos e tente de novo.');
    }
  };
}
