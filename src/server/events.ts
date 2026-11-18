import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { Recurrence, type CommentDto, type EventDto, type EventInput } from '../shared/schemas.ts';
import { transaction } from './db.ts';
import { AppError } from './errors.ts';
import type { Membership } from './families.ts';
import { readNullableString, readNumber, readString } from './rows.ts';

const EVENT_COLUMNS = `e.id, e.title, e.notes, e.location, e.all_day, e.starts_at, e.ends_at,
  e.recurrence, e.recurrence_until, e.created_by, e.updated_at`;
// All-day rows hold local dates and timed rows hold UTC instants; widening the window by two days
// lets one text comparison cover both, and the client trims to the exact range.
const RANGE_SLACK_MS = 2 * 86_400_000;

function toEvent(row: Record<string, unknown>, memberIds: string[]): EventDto {
  return {
    id: readString(row, 'id'),
    title: readString(row, 'title'),
    notes: readString(row, 'notes'),
    location: readString(row, 'location'),
    allDay: readNumber(row, 'all_day') === 1,
    start: readString(row, 'starts_at'),
    end: readString(row, 'ends_at'),
    recurrence: Recurrence.parse(readString(row, 'recurrence')),
    recurrenceUntil: readNullableString(row, 'recurrence_until'),
    memberIds,
    createdBy: readNullableString(row, 'created_by'),
    updatedAt: readString(row, 'updated_at'),
  };
}

function attachMembers(db: DatabaseSync, rows: Record<string, unknown>[]): EventDto[] {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => readString(row, 'id'));
  const byEvent = new Map<string, string[]>(ids.map((id) => [id, []]));
  const links = db
    .prepare(
      `SELECT em.event_id, em.member_id FROM event_members em JOIN members m ON m.id = em.member_id
       WHERE em.event_id IN (${ids.map(() => '?').join(',')}) ORDER BY m.created_at, m.name`,
    )
    .all(...ids);
  for (const link of links) byEvent.get(readString(link, 'event_id'))?.push(readString(link, 'member_id'));
  return rows.map((row) => toEvent(row, byEvent.get(readString(row, 'id')) ?? []));
}

/** Every event of the family that may have an occurrence in [from, to). */
export function listEvents(db: DatabaseSync, familyId: string, range?: { from: Date; to: Date }): EventDto[] {
  if (range === undefined) {
    const rows = db.prepare(`SELECT ${EVENT_COLUMNS} FROM events e WHERE e.family_id = ? ORDER BY e.starts_at`).all(familyId);
    return attachMembers(db, rows);
  }
  const from = new Date(range.from.getTime() - RANGE_SLACK_MS).toISOString();
  const to = new Date(range.to.getTime() + RANGE_SLACK_MS).toISOString();
  const rows = db
    .prepare(
      `SELECT ${EVENT_COLUMNS} FROM events e
       WHERE e.family_id = ? AND e.starts_at < ?
         AND ((e.recurrence = 'none' AND e.ends_at >= ?)
           OR (e.recurrence <> 'none' AND (e.recurrence_until IS NULL OR e.recurrence_until >= ?)))
       ORDER BY e.starts_at`,
    )
    .all(familyId, to, from.slice(0, 10), from.slice(0, 10));
  return attachMembers(db, rows);
}

export function getEvent(db: DatabaseSync, familyId: string, eventId: string): EventDto {
  const row = db.prepare(`SELECT ${EVENT_COLUMNS} FROM events e WHERE e.id = ? AND e.family_id = ?`).get(eventId, familyId);
  if (row === undefined) throw new AppError('not_found', 'Evento não encontrado');
  const [event] = attachMembers(db, [row]);
  if (event === undefined) throw new AppError('not_found', 'Evento não encontrado');
  return event;
}

function assertMembersBelong(db: DatabaseSync, familyId: string, memberIds: readonly string[]): string[] {
  const unique = [...new Set(memberIds)];
  const found = db
    .prepare(`SELECT id FROM members WHERE family_id = ? AND id IN (${unique.map(() => '?').join(',')})`)
    .all(familyId, ...unique);
  if (found.length !== unique.length) {
    throw new AppError('invalid_input', 'Alguém escolhido não faz parte da família', { memberIds: 'Escolha pessoas da família' });
  }
  return unique;
}

function writeMembers(db: DatabaseSync, eventId: string, memberIds: readonly string[]): void {
  db.prepare('DELETE FROM event_members WHERE event_id = ?').run(eventId);
  const insert = db.prepare('INSERT INTO event_members (event_id, member_id) VALUES (?, ?)');
  for (const memberId of memberIds) insert.run(eventId, memberId);
}

export function createEvent(db: DatabaseSync, actor: Membership, input: EventInput): EventDto {
  const id = randomUUID();
  const now = new Date().toISOString();
  transaction(db, () => {
    const memberIds = assertMembersBelong(db, actor.family.id, input.memberIds);
    db.prepare(
      `INSERT INTO events (id, family_id, title, notes, location, all_day, starts_at, ends_at, recurrence,
         recurrence_until, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      actor.family.id,
      input.title,
      input.notes,
      input.location,
      input.allDay ? 1 : 0,
      normalizeBound(input.allDay, input.start),
      normalizeBound(input.allDay, input.end),
      input.recurrence,
      input.recurrenceUntil,
      actor.member.id,
      now,
      now,
    );
    writeMembers(db, id, memberIds);
  });
  return getEvent(db, actor.family.id, id);
}

export function updateEvent(db: DatabaseSync, actor: Membership, eventId: string, input: EventInput): EventDto {
  transaction(db, () => {
    getEvent(db, actor.family.id, eventId);
    const memberIds = assertMembersBelong(db, actor.family.id, input.memberIds);
    db.prepare(
      `UPDATE events SET title = ?, notes = ?, location = ?, all_day = ?, starts_at = ?, ends_at = ?,
         recurrence = ?, recurrence_until = ?, updated_at = ?
       WHERE id = ? AND family_id = ?`,
    ).run(
      input.title,
      input.notes,
      input.location,
      input.allDay ? 1 : 0,
      normalizeBound(input.allDay, input.start),
      normalizeBound(input.allDay, input.end),
      input.recurrence,
      input.recurrenceUntil,
      new Date().toISOString(),
      eventId,
      actor.family.id,
    );
    writeMembers(db, eventId, memberIds);
  });
  return getEvent(db, actor.family.id, eventId);
}

export function deleteEvent(db: DatabaseSync, actor: Membership, eventId: string): void {
  const result = db.prepare('DELETE FROM events WHERE id = ? AND family_id = ?').run(eventId, actor.family.id);
  if (Number(result.changes) === 0) throw new AppError('not_found', 'Evento não encontrado');
}

/** Stores timed bounds in UTC so text comparison in SQL orders them correctly. */
function normalizeBound(allDay: boolean, value: string): string {
  return allDay ? value : new Date(value).toISOString();
}

export function listComments(db: DatabaseSync, familyId: string, eventId: string): CommentDto[] {
  getEvent(db, familyId, eventId);
  return db
    .prepare('SELECT id, body, member_id, author_name, created_at FROM comments WHERE event_id = ? ORDER BY created_at')
    .all(eventId)
    .map((row) => ({
      id: readString(row, 'id'),
      body: readString(row, 'body'),
      memberId: readNullableString(row, 'member_id'),
      authorName: readString(row, 'author_name'),
      createdAt: readString(row, 'created_at'),
    }));
}

export function addComment(db: DatabaseSync, actor: Membership, eventId: string, body: string): CommentDto {
  getEvent(db, actor.family.id, eventId);
  const comment: CommentDto = {
    id: randomUUID(),
    body,
    memberId: actor.member.id,
    authorName: actor.member.name,
    createdAt: new Date().toISOString(),
  };
  db.prepare('INSERT INTO comments (id, event_id, member_id, author_name, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    comment.id,
    eventId,
    comment.memberId,
    comment.authorName,
    comment.body,
    comment.createdAt,
  );
  return comment;
}
