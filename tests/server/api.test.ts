import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, SESSION_COOKIE } from '../../src/server/app.ts';
import { openDatabase } from '../../src/server/db.ts';
import type { EventDto, MeDto } from '../../src/shared/schemas.ts';

type App = ReturnType<typeof createApp>;
const PUBLIC_URL = 'http://ninho.test';

class Client {
  private cookie: string | null = null;
  private readonly app: App;

  constructor(app: App) {
    this.app = app;
  }

  async request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const init: RequestInit = {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(this.cookie === null ? {} : { cookie: this.cookie }),
        host: 'ninho.test',
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    };
    const response = await this.app.request(path, init);
    const setCookie = response.headers.get('set-cookie');
    if (setCookie !== null) {
      const value = setCookie.split(';')[0] ?? '';
      this.cookie = value.endsWith('=') ? null : value;
    }
    return response;
  }

  async json<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const response = await this.request(method, path, body);
    const text = await response.text();
    return { status: response.status, data: (text === '' ? null : JSON.parse(text)) as T };
  }
}

let app: App;

beforeEach(() => {
  app = createApp({ db: openDatabase(':memory:'), publicUrl: PUBLIC_URL, isSecureCookie: false });
});

async function signupWithFamily(name = 'Ana', email = 'ana@example.com') {
  const client = new Client(app);
  const { status, data } = await client.json<MeDto>('POST', '/api/auth/signup', {
    name,
    email,
    password: 'senha-forte-1',
    familyName: 'Família Andrade',
  });
  expect(status).toBe(201);
  return { client, me: data };
}

function timedEvent(memberIds: string[], overrides: Record<string, unknown> = {}) {
  return {
    title: 'Natação',
    allDay: false,
    start: '2026-11-17T20:00:00.000Z',
    end: '2026-11-17T21:00:00.000Z',
    recurrence: 'weekly',
    memberIds,
    ...overrides,
  };
}

describe('auth', () => {
  it('signs up, creates the family as admin and keeps the session in a cookie', async () => {
    const { client, me } = await signupWithFamily();
    expect(me.family?.name).toBe('Família Andrade');
    expect(me.member?.role).toBe('admin');
    expect(me.calendarFeedUrl).toMatch(/^http:\/\/ninho\.test\/ics\/.+\.ics$/);
    const again = await client.json<MeDto>('GET', '/api/me');
    expect(again.status).toBe(200);
    expect(again.data.user.email).toBe('ana@example.com');
  });

  it('rejects a duplicate e-mail regardless of case', async () => {
    await signupWithFamily();
    const other = new Client(app);
    const { status, data } = await other.json<{ error: { code: string } }>('POST', '/api/auth/signup', {
      name: 'Outra',
      email: 'ANA@example.com',
      password: 'senha-forte-1',
    });
    expect(status).toBe(409);
    expect(data.error.code).toBe('conflict');
  });

  it('does not create the account when the invite code is wrong', async () => {
    const client = new Client(app);
    const bad = await client.json('POST', '/api/auth/signup', { name: 'Bruno', email: 'b@example.com', password: 'senha-forte-1', inviteCode: 'XXXX-XXXX' });
    expect(bad.status).toBe(404);
    const retry = await client.json('POST', '/api/auth/signup', { name: 'Bruno', email: 'b@example.com', password: 'senha-forte-1' });
    expect(retry.status).toBe(201);
  });

  it('logs in with the right password only, and logout ends the session', async () => {
    await signupWithFamily();
    const client = new Client(app);
    expect((await client.json('POST', '/api/auth/login', { email: 'ana@example.com', password: 'errada-123' })).status).toBe(401);
    expect((await client.json('POST', '/api/auth/login', { email: 'ana@example.com', password: 'senha-forte-1' })).status).toBe(200);
    expect((await client.json('GET', '/api/me')).status).toBe(200);
    expect((await client.request('POST', '/api/auth/logout')).status).toBe(204);
    expect((await client.json('GET', '/api/me')).status).toBe(401);
  });

  it('rate-limits repeated logins for one e-mail', async () => {
    await signupWithFamily();
    const client = new Client(app);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await client.json('POST', '/api/auth/login', { email: 'ana@example.com', password: 'errada-123' })).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it('sets an HttpOnly, SameSite=Lax session cookie', async () => {
    const client = new Client(app);
    const response = await client.request('POST', '/api/auth/signup', { name: 'Ana', email: 'a@example.com', password: 'senha-forte-1' });
    const header = response.headers.get('set-cookie') ?? '';
    expect(header).toContain(`${SESSION_COOKIE}=`);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
  });
});

describe('csrf guard', () => {
  it('rejects writes from another origin and non-JSON bodies', async () => {
    const { client, me } = await signupWithFamily();
    const crossOrigin = await client.request('POST', '/api/events', timedEvent([me.member?.id ?? '']), { origin: 'https://evil.example' });
    expect(crossOrigin.status).toBe(403);
    const form = await client.request('POST', '/api/events', undefined, { 'content-type': 'application/x-www-form-urlencoded' });
    expect(form.status).toBe(400);
  });
});

describe('family', () => {
  it('lets a second person join with the code in any format and see the same members', async () => {
    const { me } = await signupWithFamily();
    const code = me.family?.inviteCode ?? '';
    const typed = `${code.slice(0, 4).toLowerCase()}-${code.slice(4)}`;
    const bruno = new Client(app);
    const preview = await bruno.json<{ familyName: string }>('GET', `/api/invites/${typed}`);
    expect(preview.data.familyName).toBe('Família Andrade');
    const joined = await bruno.json<MeDto>('POST', '/api/auth/signup', { name: 'Bruno', email: 'bruno@example.com', password: 'senha-forte-1', inviteCode: typed });
    expect(joined.status).toBe(201);
    expect(joined.data.member?.role).toBe('member');
    expect(joined.data.members.map((m) => m.name)).toEqual(['Ana', 'Bruno']);
    expect(new Set(joined.data.members.map((m) => m.color)).size).toBe(2);
  });

  it('old invite code stops working after rotation', async () => {
    const { client, me } = await signupWithFamily();
    const oldCode = me.family?.inviteCode ?? '';
    const rotated = await client.json<{ inviteCode: string }>('POST', '/api/family/invite');
    expect(rotated.data.inviteCode).not.toBe(oldCode);
    expect((await new Client(app).json('GET', `/api/invites/${oldCode}`)).status).toBe(404);
  });

  it('only admins add profiles, and nobody removes themselves', async () => {
    const { client: ana, me } = await signupWithFamily();
    const kid = await ana.json<{ id: string; hasAccount: boolean }>('POST', '/api/members', { name: 'Theo', color: 'm4' });
    expect(kid.status).toBe(201);
    expect(kid.data.hasAccount).toBe(false);

    const bruno = new Client(app);
    await bruno.json('POST', '/api/auth/signup', { name: 'Bruno', email: 'bruno@example.com', password: 'senha-forte-1', inviteCode: me.family?.inviteCode });
    expect((await bruno.json('POST', '/api/members', { name: 'Lia', color: 'm3' })).status).toBe(403);
    expect((await bruno.json('DELETE', `/api/members/${kid.data.id}`)).status).toBe(403);
    expect((await ana.json('DELETE', `/api/members/${me.member?.id}`)).status).toBe(400);
    expect((await ana.json('DELETE', `/api/members/${kid.data.id}`)).status).toBe(204);
  });

  it('members edit themselves but not others', async () => {
    const { client: ana, me } = await signupWithFamily();
    const bruno = new Client(app);
    const joined = await bruno.json<MeDto>('POST', '/api/auth/signup', { name: 'Bruno', email: 'bruno@example.com', password: 'senha-forte-1', inviteCode: me.family?.inviteCode });
    expect((await bruno.json('PATCH', `/api/members/${joined.data.member?.id}`, { color: 'm7' })).status).toBe(200);
    expect((await bruno.json('PATCH', `/api/members/${me.member?.id}`, { name: 'X' })).status).toBe(403);
    const after = await ana.json<MeDto>('GET', '/api/me');
    expect(after.data.members.find((m) => m.name === 'Bruno')?.color).toBe('m7');
  });

  it('a user without family is told to create or join one', async () => {
    const client = new Client(app);
    await client.json('POST', '/api/auth/signup', { name: 'Solo', email: 'solo@example.com', password: 'senha-forte-1' });
    const events = await client.json<{ error: { code: string } }>('GET', '/api/events?from=2026-11-01T00:00:00.000Z&to=2026-12-01T00:00:00.000Z');
    expect(events.data.error.code).toBe('no_family');
    expect((await client.json('POST', '/api/families', { name: 'Casa' })).status).toBe(201);
  });
});

describe('events', () => {
  it('creates, lists in range, updates and deletes an event', async () => {
    const { client, me } = await signupWithFamily();
    const memberId = me.member?.id ?? '';
    const created = await client.json<EventDto>('POST', '/api/events', timedEvent([memberId]));
    expect(created.status).toBe(201);
    expect(created.data.memberIds).toEqual([memberId]);

    const inRange = await client.json<EventDto[]>('GET', '/api/events?from=2026-12-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z');
    expect(inRange.data.map((e) => e.id)).toEqual([created.data.id]);

    const updated = await client.json<EventDto>('PATCH', `/api/events/${created.data.id}`, timedEvent([memberId], { title: 'Natação do Theo', recurrence: 'none' }));
    expect(updated.data.title).toBe('Natação do Theo');
    const outOfRange = await client.json<EventDto[]>('GET', '/api/events?from=2026-12-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z');
    expect(outOfRange.data).toEqual([]);

    expect((await client.request('DELETE', `/api/events/${created.data.id}`)).status).toBe(204);
    expect((await client.json('GET', `/api/events/${created.data.id}`)).status).toBe(404);
  });

  it('returns participants in family order, whatever order they were sent', async () => {
    const { client, me } = await signupWithFamily();
    const kid = await client.json<{ id: string }>('POST', '/api/members', { name: 'Theo', color: 'm4' });
    const created = await client.json<EventDto>('POST', '/api/events', timedEvent([kid.data.id, me.member?.id ?? '']));
    expect(created.data.memberIds).toEqual([me.member?.id, kid.data.id]);
  });

  it('validates time order and participants', async () => {
    const { client, me } = await signupWithFamily();
    const backwards = await client.json<{ error: { fields: Record<string, string> } }>(
      'POST',
      '/api/events',
      timedEvent([me.member?.id ?? ''], { end: '2026-11-17T19:00:00.000Z' }),
    );
    expect(backwards.status).toBe(400);
    expect(backwards.data.error.fields.end).toBeDefined();
    expect((await client.json('POST', '/api/events', timedEvent([]))).status).toBe(400);
  });

  it('never exposes or accepts another family’s data', async () => {
    const ana = await signupWithFamily();
    const event = await ana.client.json<EventDto>('POST', '/api/events', timedEvent([ana.me.member?.id ?? '']));
    const other = await signupWithFamily('Carla', 'carla@example.com');

    expect((await other.client.json('GET', `/api/events/${event.data.id}`)).status).toBe(404);
    expect((await other.client.json('PATCH', `/api/events/${event.data.id}`, timedEvent([other.me.member?.id ?? '']))).status).toBe(404);
    expect((await other.client.json('DELETE', `/api/events/${event.data.id}`)).status).toBe(404);
    expect((await other.client.json('GET', `/api/events/${event.data.id}/comments`)).status).toBe(404);
    expect((await other.client.json('POST', '/api/events', timedEvent([ana.me.member?.id ?? '']))).status).toBe(400);
    expect((await other.client.json('PATCH', `/api/members/${ana.me.member?.id}`, { name: 'X' })).status).toBe(404);
    const list = await other.client.json<EventDto[]>('GET', '/api/events?from=2026-11-01T00:00:00.000Z&to=2026-12-01T00:00:00.000Z');
    expect(list.data).toEqual([]);
  });

  it('stores comments with the author name', async () => {
    const { client, me } = await signupWithFamily();
    const event = await client.json<EventDto>('POST', '/api/events', timedEvent([me.member?.id ?? '']));
    await client.json('POST', `/api/events/${event.data.id}/comments`, { body: 'Levar touca' });
    const comments = await client.json<{ body: string; authorName: string }[]>('GET', `/api/events/${event.data.id}/comments`);
    expect(comments.data).toEqual([expect.objectContaining({ body: 'Levar touca', authorName: 'Ana' })]);
  });

  it('requires a session', async () => {
    const anon = new Client(app);
    expect((await anon.json('GET', '/api/events?from=2026-11-01T00:00:00.000Z&to=2026-12-01T00:00:00.000Z')).status).toBe(401);
  });
});

describe('calendar feed', () => {
  it('serves the family events as iCalendar with RRULE and all-day dates', async () => {
    const { client, me } = await signupWithFamily();
    const memberId = me.member?.id ?? '';
    await client.json('POST', '/api/events', timedEvent([memberId], { recurrenceUntil: '2026-12-15', notes: 'Touca, óculos; toalha' }));
    await client.json('POST', '/api/events', { title: 'Aniversário', allDay: true, start: '2026-11-22', end: '2026-11-22', memberIds: [memberId] });
    const path = new URL(me.calendarFeedUrl ?? '').pathname;
    const response = await new Client(app).request('GET', path);
    expect(response.headers.get('content-type')).toContain('text/calendar');
    const body = await response.text();
    expect(body).toContain('RRULE:FREQ=WEEKLY;UNTIL=20261215T235959Z');
    expect(body).toContain('DTSTART:20261117T200000Z');
    expect(body).toContain('DTSTART;VALUE=DATE:20261122');
    expect(body).toContain('DTEND;VALUE=DATE:20261123');
    expect(body).toContain('Touca\\, óculos\\; toalha');
    expect(body.split('\r\n').every((line) => Buffer.byteLength(line, 'utf8') <= 75)).toBe(true);
  });

  it('returns 404 for an unknown token', async () => {
    expect((await new Client(app).request('GET', '/ics/nao-existe.ics')).status).toBe(404);
  });
});
