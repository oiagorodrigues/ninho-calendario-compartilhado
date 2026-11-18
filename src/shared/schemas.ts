import { z } from 'zod';
import { MEMBER_COLORS, RECURRENCES } from './constants.ts';

export const MemberColor = z.enum(MEMBER_COLORS);
export type MemberColor = z.infer<typeof MemberColor>;

export const Recurrence = z.enum(RECURRENCES);
export type Recurrence = z.infer<typeof Recurrence>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');
const isoInstant = z.iso.datetime({ offset: true });
const name = z.string().trim().min(1, 'Informe um nome').max(60);
const email = z.email('E-mail inválido').trim().toLowerCase().max(200);
const password = z.string().min(8, 'A senha precisa de pelo menos 8 caracteres').max(200);

export const SignupInput = z.strictObject({
  name,
  email,
  password,
  familyName: z.string().trim().min(1).max(60).optional(),
  inviteCode: z.string().trim().min(4).max(20).optional(),
});
export type SignupInput = z.infer<typeof SignupInput>;

export const LoginInput = z.strictObject({ email, password: z.string().min(1).max(200) });

export const CreateFamilyInput = z.strictObject({ name: z.string().trim().min(1).max(60) });
export const JoinFamilyInput = z.strictObject({ code: z.string().trim().min(4).max(20) });
export const UpdateFamilyInput = z.strictObject({ name: z.string().trim().min(1).max(60) });

export const CreateMemberInput = z.strictObject({ name, color: MemberColor });
export const UpdateMemberInput = z.strictObject({ name: name.optional(), color: MemberColor.optional() });

/**
 * All-day events carry local dates (`YYYY-MM-DD`, end inclusive); timed events carry instants
 * with an offset. Keeping the two shapes apart lets recurrence expansion run in the viewer's zone.
 */
export const EventInput = z
  .strictObject({
    title: z.string().trim().min(1, 'Dê um título ao evento').max(120),
    notes: z.string().trim().max(2000).default(''),
    location: z.string().trim().max(200).default(''),
    allDay: z.boolean(),
    start: z.string(),
    end: z.string(),
    recurrence: Recurrence.default('none'),
    recurrenceUntil: isoDate.nullable().default(null),
    memberIds: z.array(z.string().min(1)).min(1, 'Escolha quem participa').max(50),
  })
  .superRefine((value, ctx) => {
    const shape = value.allDay ? isoDate : isoInstant;
    const isStartValid = shape.safeParse(value.start).success;
    const isEndValid = shape.safeParse(value.end).success;
    if (!isStartValid) ctx.addIssue({ code: 'custom', path: ['start'], message: 'Início inválido' });
    if (!isEndValid) ctx.addIssue({ code: 'custom', path: ['end'], message: 'Fim inválido' });
    if (!isStartValid || !isEndValid) return;
    const ordered = value.allDay
      ? value.end >= value.start
      : Date.parse(value.end) > Date.parse(value.start);
    if (!ordered) ctx.addIssue({ code: 'custom', path: ['end'], message: 'O fim precisa ser depois do início' });
    if (value.recurrenceUntil !== null && value.recurrence === 'none') {
      ctx.addIssue({ code: 'custom', path: ['recurrenceUntil'], message: 'Só eventos que repetem têm data final' });
    }
    if (value.recurrenceUntil !== null && value.recurrenceUntil < value.start.slice(0, 10)) {
      ctx.addIssue({ code: 'custom', path: ['recurrenceUntil'], message: 'A repetição termina antes de começar' });
    }
  });
export type EventInput = z.infer<typeof EventInput>;

export const CommentInput = z.strictObject({ body: z.string().trim().min(1).max(1000) });

export const RangeQuery = z.strictObject({ from: isoInstant, to: isoInstant });

export interface MemberDto {
  id: string;
  name: string;
  color: MemberColor;
  role: 'admin' | 'member';
  hasAccount: boolean;
}

export interface FamilyDto {
  id: string;
  name: string;
  inviteCode: string;
}

export interface MeDto {
  user: { id: string; name: string; email: string };
  family: FamilyDto | null;
  member: MemberDto | null;
  members: MemberDto[];
  calendarFeedUrl: string | null;
}

export interface EventDto {
  id: string;
  title: string;
  notes: string;
  location: string;
  allDay: boolean;
  start: string;
  end: string;
  recurrence: Recurrence;
  recurrenceUntil: string | null;
  memberIds: string[];
  createdBy: string | null;
  updatedAt: string;
}

export interface CommentDto {
  id: string;
  body: string;
  memberId: string | null;
  authorName: string;
  createdAt: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}
