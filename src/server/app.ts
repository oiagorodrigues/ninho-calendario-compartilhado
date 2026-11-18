import type { IncomingMessage } from 'node:http';
import type { DatabaseSync } from 'node:sqlite';
import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { streamSSE } from 'hono/streaming';
import type { z } from 'zod';
import {
  CommentInput,
  CreateFamilyInput,
  CreateMemberInput,
  EventInput,
  JoinFamilyInput,
  LoginInput,
  RangeQuery,
  SignupInput,
  UpdateFamilyInput,
  UpdateMemberInput,
  type ApiErrorBody,
  type MeDto,
} from '../shared/schemas.ts';
import { authenticate, createRateLimiter, createSession, createUser, deleteSession, findSessionUser, type SessionUser } from './auth.ts';
import { createChangeBus, type ChangeBus, type FamilyChange } from './bus.ts';
import { transaction } from './db.ts';
import { AppError } from './errors.ts';
import { addComment, createEvent, deleteEvent, getEvent, listComments, listEvents, updateEvent } from './events.ts';
import {
  addProfile,
  createFamily,
  findFamilyByCode,
  findFamilyByFeedToken,
  findMembership,
  joinFamily,
  listMembers,
  removeMember,
  renameFamily,
  rotateInviteCode,
  updateMember,
  type Membership,
} from './families.ts';
import { buildFamilyFeed } from './ics.ts';

export const SESSION_COOKIE = 'ninho_session';
const SSE_KEEPALIVE_MS = 25_000;

export interface AppOptions {
  db: DatabaseSync;
  publicUrl: string;
  isSecureCookie: boolean;
  /** Sign-up and login attempts allowed per client or e-mail every 15 minutes. */
  authAttemptLimit?: number;
  bus?: ChangeBus;
}

type AppEnv = {
  Bindings: { incoming?: IncomingMessage };
  Variables: { user: SessionUser | null; sessionToken: string | null };
};
type Ctx = Context<AppEnv>;

async function parseBody<T extends z.ZodType>(c: Ctx, schema: T): Promise<z.output<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch (error) {
    if (error instanceof SyntaxError) throw new AppError('invalid_input', 'Corpo da requisição não é JSON válido');
    throw error;
  }
  return parseWith(schema, raw);
}

function parseWith<T extends z.ZodType>(schema: T, raw: unknown): z.output<T> {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  throw new AppError('invalid_input', Object.values(fields)[0] ?? 'Dados inválidos', fields);
}

function clientKey(c: Ctx): string {
  return c.env?.incoming?.socket.remoteAddress ?? 'local';
}

export function createApp(options: AppOptions) {
  const { db, publicUrl } = options;
  const bus = options.bus ?? createChangeBus();
  const authLimiter = createRateLimiter({ limit: options.authAttemptLimit ?? 10, windowMs: 15 * 60_000 });
  const app = new Hono<AppEnv>();

  app.onError((error, c) => {
    if (error instanceof AppError) {
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } };
      return c.json(body, error.status);
    }
    console.error(JSON.stringify({ level: 'error', msg: 'unhandled', path: c.req.path, method: c.req.method, error: String(error), stack: error instanceof Error ? error.stack : undefined }));
    const body: ApiErrorBody = { error: { code: 'internal', message: 'Algo deu errado. Tente de novo.' } };
    return c.json(body, 500);
  });

  // Cookie auth needs a CSRF guard on top of SameSite=Lax: writes must come from our origin, and any body must be JSON
  // (HTML forms can't send JSON, so a cross-site form post is refused).
  app.use('/api/*', async (c, next) => {
    const method = c.req.method;
    if (method !== 'GET' && method !== 'HEAD') {
      const origin = c.req.header('origin');
      const host = c.req.header('host');
      if (origin !== undefined && host !== undefined && new URL(origin).host !== host && origin !== new URL(publicUrl).origin) {
        throw new AppError('forbidden', 'Origem não permitida');
      }
      const contentType = c.req.header('content-type');
      if (contentType !== undefined && !contentType.startsWith('application/json')) {
        throw new AppError('invalid_input', 'Envie JSON');
      }
    }
    const token = getCookie(c, SESSION_COOKIE) ?? null;
    c.set('sessionToken', token);
    c.set('user', token === null ? null : findSessionUser(db, token));
    await next();
  });

  function requireUser(c: Ctx): SessionUser {
    const user = c.get('user');
    if (user === null) throw new AppError('unauthenticated', 'Entre na sua conta para continuar');
    return user;
  }

  function requireMembership(c: Ctx): Membership {
    const membership = findMembership(db, requireUser(c).id);
    if (membership === null) throw new AppError('no_family', 'Crie ou entre em uma família primeiro');
    return membership;
  }

  function startSession(c: Ctx, userId: string): void {
    const session = createSession(db, userId);
    setCookie(c, SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: options.isSecureCookie,
      path: '/',
      expires: session.expiresAt,
    });
  }

  function publish(familyId: string, change: FamilyChange): void {
    bus.publish(familyId, change);
  }

  function me(user: SessionUser): MeDto {
    const membership = findMembership(db, user.id);
    return {
      user,
      family: membership?.family ?? null,
      member: membership?.member ?? null,
      members: membership === null ? [] : listMembers(db, membership.family.id),
      calendarFeedUrl: membership === null ? null : `${publicUrl}/ics/${membership.feedToken}.ics`,
    };
  }

  app.post('/api/auth/signup', async (c) => {
    authLimiter(`signup:${clientKey(c)}`);
    const input = await parseBody(c, SignupInput);
    const user = transaction(db, () => {
      const created = createUser(db, input);
      if (input.inviteCode !== undefined) {
        joinFamily(db, { userId: created.id, userName: created.name, code: input.inviteCode });
      } else if (input.familyName !== undefined) {
        createFamily(db, { userId: created.id, userName: created.name, familyName: input.familyName });
      }
      return created;
    });
    const membership = findMembership(db, user.id);
    if (membership !== null) publish(membership.family.id, { kind: 'members' });
    startSession(c, user.id);
    return c.json(me(user), 201);
  });

  app.post('/api/auth/login', async (c) => {
    const input = await parseBody(c, LoginInput);
    authLimiter(`login:${clientKey(c)}`);
    authLimiter(`login:${input.email}`);
    const user = authenticate(db, input.email, input.password);
    startSession(c, user.id);
    return c.json(me(user));
  });

  app.post('/api/auth/logout', (c) => {
    const token = c.get('sessionToken');
    if (token !== null) deleteSession(db, token);
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.body(null, 204);
  });

  app.get('/api/me', (c) => c.json(me(requireUser(c))));

  app.get('/api/invites/:code', (c) => {
    const family = findFamilyByCode(db, c.req.param('code'));
    if (family === null) throw new AppError('not_found', 'Código de convite inválido');
    return c.json({ familyName: family.name });
  });

  app.post('/api/families', async (c) => {
    const user = requireUser(c);
    const input = await parseBody(c, CreateFamilyInput);
    createFamily(db, { userId: user.id, userName: user.name, familyName: input.name });
    return c.json(me(user), 201);
  });

  app.post('/api/families/join', async (c) => {
    const user = requireUser(c);
    authLimiter(`join:${user.id}`);
    const input = await parseBody(c, JoinFamilyInput);
    joinFamily(db, { userId: user.id, userName: user.name, code: input.code });
    const membership = findMembership(db, user.id);
    if (membership !== null) publish(membership.family.id, { kind: 'members' });
    return c.json(me(user));
  });

  app.patch('/api/family', async (c) => {
    const actor = requireMembership(c);
    const input = await parseBody(c, UpdateFamilyInput);
    renameFamily(db, actor, input.name);
    publish(actor.family.id, { kind: 'family' });
    return c.json(me(requireUser(c)));
  });

  app.post('/api/family/invite', (c) => {
    const actor = requireMembership(c);
    const inviteCode = rotateInviteCode(db, actor);
    publish(actor.family.id, { kind: 'family' });
    return c.json({ inviteCode });
  });

  app.post('/api/members', async (c) => {
    const actor = requireMembership(c);
    const member = addProfile(db, actor, await parseBody(c, CreateMemberInput));
    publish(actor.family.id, { kind: 'members' });
    return c.json(member, 201);
  });

  app.patch('/api/members/:id', async (c) => {
    const actor = requireMembership(c);
    const member = updateMember(db, actor, c.req.param('id'), await parseBody(c, UpdateMemberInput));
    publish(actor.family.id, { kind: 'members' });
    return c.json(member);
  });

  app.delete('/api/members/:id', (c) => {
    const actor = requireMembership(c);
    removeMember(db, actor, c.req.param('id'));
    publish(actor.family.id, { kind: 'members' });
    return c.body(null, 204);
  });

  app.get('/api/events', (c) => {
    const actor = requireMembership(c);
    const range = parseWith(RangeQuery, c.req.query());
    return c.json(listEvents(db, actor.family.id, { from: new Date(range.from), to: new Date(range.to) }));
  });

  app.get('/api/events/:id', (c) => c.json(getEvent(db, requireMembership(c).family.id, c.req.param('id'))));

  app.post('/api/events', async (c) => {
    const actor = requireMembership(c);
    const event = createEvent(db, actor, await parseBody(c, EventInput));
    publish(actor.family.id, { kind: 'events', eventId: event.id });
    return c.json(event, 201);
  });

  app.patch('/api/events/:id', async (c) => {
    const actor = requireMembership(c);
    const event = updateEvent(db, actor, c.req.param('id'), await parseBody(c, EventInput));
    publish(actor.family.id, { kind: 'events', eventId: event.id });
    return c.json(event);
  });

  app.delete('/api/events/:id', (c) => {
    const actor = requireMembership(c);
    deleteEvent(db, actor, c.req.param('id'));
    publish(actor.family.id, { kind: 'events', eventId: c.req.param('id') });
    return c.body(null, 204);
  });

  app.get('/api/events/:id/comments', (c) => c.json(listComments(db, requireMembership(c).family.id, c.req.param('id'))));

  app.post('/api/events/:id/comments', async (c) => {
    const actor = requireMembership(c);
    const input = await parseBody(c, CommentInput);
    const comment = addComment(db, actor, c.req.param('id'), input.body);
    publish(actor.family.id, { kind: 'comments', eventId: c.req.param('id') });
    return c.json(comment, 201);
  });

  app.get('/api/stream', (c) => {
    const actor = requireMembership(c);
    return streamSSE(c, async (stream) => {
      const queue: FamilyChange[] = [];
      let wake: (() => void) | null = null;
      const unsubscribe = bus.subscribe(actor.family.id, (change) => {
        queue.push(change);
        wake?.();
      });
      stream.onAbort(unsubscribe);
      await stream.writeSSE({ event: 'ready', data: '{}' });
      while (!stream.aborted) {
        const change = queue.shift();
        if (change !== undefined) {
          await stream.writeSSE({ event: 'change', data: JSON.stringify(change) });
          continue;
        }
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, SSE_KEEPALIVE_MS);
          wake = () => {
            clearTimeout(timer);
            resolve();
          };
        });
        wake = null;
        if (queue.length === 0 && !stream.aborted) await stream.writeSSE({ event: 'ping', data: '{}' });
      }
      unsubscribe();
    });
  });

  app.get('/ics/:file', (c) => {
    const token = c.req.param('file').replace(/\.ics$/, '');
    const family = findFamilyByFeedToken(db, token);
    if (family === null) return c.text('Calendário não encontrado', 404);
    const names = new Map(listMembers(db, family.id).map((member) => [member.id, member.name]));
    return c.body(buildFamilyFeed(family, listEvents(db, family.id), names), 200, {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'private, max-age=300',
    });
  });

  return app;
}
