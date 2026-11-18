import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { MEMBER_COLORS } from '../shared/constants.ts';
import { MemberColor, type FamilyDto, type MemberDto } from '../shared/schemas.ts';
import { transaction } from './db.ts';
import { AppError } from './errors.ts';
import { readNullableString, readString } from './rows.ts';

const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITE_LENGTH = 8;

export interface Membership {
  family: FamilyDto;
  member: MemberDto;
  feedToken: string;
}

function newInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_LENGTH; i++) code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  return code;
}

/** Accepts the code as people type or paste it: any case, with or without the dash. */
export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function newFeedToken(): string {
  return randomBytes(24).toString('base64url');
}

function toMember(row: Record<string, unknown>): MemberDto {
  return {
    id: readString(row, 'id'),
    name: readString(row, 'name'),
    color: MemberColor.parse(readString(row, 'color')),
    role: readString(row, 'role') === 'admin' ? 'admin' : 'member',
    hasAccount: readNullableString(row, 'user_id') !== null,
  };
}

function toFamily(row: Record<string, unknown>): FamilyDto {
  return { id: readString(row, 'id'), name: readString(row, 'name'), inviteCode: readString(row, 'invite_code') };
}

export function findMembership(db: DatabaseSync, userId: string): Membership | null {
  const row = db
    .prepare(
      `SELECT m.id, m.name, m.color, m.role, m.user_id, m.feed_token,
              f.id AS family_id, f.name AS family_name, f.invite_code
       FROM members m JOIN families f ON f.id = m.family_id WHERE m.user_id = ?`,
    )
    .get(userId);
  if (row === undefined) return null;
  return {
    member: toMember(row),
    family: { id: readString(row, 'family_id'), name: readString(row, 'family_name'), inviteCode: readString(row, 'invite_code') },
    feedToken: readString(row, 'feed_token'),
  };
}

export function listMembers(db: DatabaseSync, familyId: string): MemberDto[] {
  return db
    .prepare('SELECT id, name, color, role, user_id FROM members WHERE family_id = ? ORDER BY created_at, name')
    .all(familyId)
    .map(toMember);
}

function nextColor(db: DatabaseSync, familyId: string): MemberColor {
  const used = new Set(
    db.prepare('SELECT color FROM members WHERE family_id = ?').all(familyId).map((row) => readString(row, 'color')),
  );
  const count = used.size;
  return MEMBER_COLORS.find((color) => !used.has(color)) ?? MEMBER_COLORS[count % MEMBER_COLORS.length] ?? 'm1';
}

function insertMember(
  db: DatabaseSync,
  input: { familyId: string; userId: string | null; name: string; color: MemberColor; role: 'admin' | 'member' },
): string {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO members (id, family_id, user_id, name, color, role, feed_token, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, input.familyId, input.userId, input.name, input.color, input.role, newFeedToken(), new Date().toISOString());
  return id;
}

function assertNoFamily(db: DatabaseSync, userId: string): void {
  if (findMembership(db, userId) !== null) throw new AppError('conflict', 'Você já faz parte de uma família');
}

export function createFamily(db: DatabaseSync, input: { userId: string; userName: string; familyName: string }): void {
  transaction(db, () => {
    assertNoFamily(db, input.userId);
    const familyId = randomUUID();
    db.prepare('INSERT INTO families (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)').run(
      familyId,
      input.familyName,
      newInviteCode(),
      new Date().toISOString(),
    );
    insertMember(db, { familyId, userId: input.userId, name: input.userName, color: 'm1', role: 'admin' });
  });
}

export function findFamilyByCode(db: DatabaseSync, rawCode: string): FamilyDto | null {
  const row = db.prepare('SELECT id, name, invite_code FROM families WHERE invite_code = ?').get(normalizeInviteCode(rawCode));
  return row === undefined ? null : toFamily(row);
}

export function joinFamily(db: DatabaseSync, input: { userId: string; userName: string; code: string }): void {
  transaction(db, () => {
    assertNoFamily(db, input.userId);
    const family = findFamilyByCode(db, input.code);
    if (family === null) throw new AppError('not_found', 'Código de convite inválido', { code: 'Código de convite inválido' });
    insertMember(db, { familyId: family.id, userId: input.userId, name: input.userName, color: nextColor(db, family.id), role: 'member' });
  });
}

export function renameFamily(db: DatabaseSync, actor: Membership, name: string): void {
  requireAdmin(actor);
  db.prepare('UPDATE families SET name = ? WHERE id = ?').run(name, actor.family.id);
}

export function rotateInviteCode(db: DatabaseSync, actor: Membership): string {
  requireAdmin(actor);
  const code = newInviteCode();
  db.prepare('UPDATE families SET invite_code = ? WHERE id = ?').run(code, actor.family.id);
  return code;
}

/** Adds a profile without an account, e.g. a child, whom events can include. */
export function addProfile(db: DatabaseSync, actor: Membership, input: { name: string; color: MemberColor }): MemberDto {
  requireAdmin(actor);
  const id = insertMember(db, { familyId: actor.family.id, userId: null, name: input.name, color: input.color, role: 'member' });
  return { id, name: input.name, color: input.color, role: 'member', hasAccount: false };
}

function findFamilyMember(db: DatabaseSync, familyId: string, memberId: string): MemberDto {
  const row = db.prepare('SELECT id, name, color, role, user_id FROM members WHERE id = ? AND family_id = ?').get(memberId, familyId);
  if (row === undefined) throw new AppError('not_found', 'Pessoa não encontrada');
  return toMember(row);
}

export function updateMember(
  db: DatabaseSync,
  actor: Membership,
  memberId: string,
  input: { name?: string | undefined; color?: MemberColor | undefined },
): MemberDto {
  const target = findFamilyMember(db, actor.family.id, memberId);
  if (actor.member.role !== 'admin' && target.id !== actor.member.id) {
    throw new AppError('forbidden', 'Só quem administra pode editar outras pessoas');
  }
  const next = { ...target, name: input.name ?? target.name, color: input.color ?? target.color };
  db.prepare('UPDATE members SET name = ?, color = ? WHERE id = ?').run(next.name, next.color, target.id);
  return next;
}

export function removeMember(db: DatabaseSync, actor: Membership, memberId: string): void {
  requireAdmin(actor);
  const target = findFamilyMember(db, actor.family.id, memberId);
  if (target.id === actor.member.id) throw new AppError('invalid_input', 'Você não pode remover a si mesmo');
  db.prepare('DELETE FROM members WHERE id = ?').run(target.id);
}

export function findFamilyByFeedToken(db: DatabaseSync, token: string): FamilyDto | null {
  const row = db
    .prepare('SELECT f.id, f.name, f.invite_code FROM members m JOIN families f ON f.id = m.family_id WHERE m.feed_token = ?')
    .get(token);
  return row === undefined ? null : toFamily(row);
}

function requireAdmin(actor: Membership): void {
  if (actor.member.role !== 'admin') throw new AppError('forbidden', 'Só quem administra a família pode fazer isso');
}
