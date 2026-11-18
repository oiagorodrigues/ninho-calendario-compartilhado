/**
 * Fills a database with a demo family (login ana@exemplo.com / senha-demo-123) and events around today.
 * Usage: node scripts/seed.ts [db path]   (defaults to NINHO_DB or ./data/ninho.db)
 */
import { createUser } from '../src/server/auth.ts';
import { openDatabase, transaction } from '../src/server/db.ts';
import { createEvent } from '../src/server/events.ts';
import { addProfile, createFamily, findMembership, joinFamily, updateMember } from '../src/server/families.ts';
import { EventInput } from '../src/shared/schemas.ts';

const path = process.argv[2] ?? process.env.NINHO_DB ?? './data/ninho.db';
const db = openDatabase(path);

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('ana@exemplo.com');
if (existing !== undefined) {
  console.log(`Demo data already present in ${path}`);
  process.exit(0);
}

transaction(db, () => {
  const ana = createUser(db, { name: 'Ana', email: 'ana@exemplo.com', password: 'senha-demo-123' });
  createFamily(db, { userId: ana.id, userName: ana.name, familyName: 'Família Andrade' });
  const anaMembership = findMembership(db, ana.id);
  if (anaMembership === null) throw new Error('Family was not created');
  const bruno = createUser(db, { name: 'Bruno', email: 'bruno@exemplo.com', password: 'senha-demo-123' });
  joinFamily(db, { userId: bruno.id, userName: bruno.name, code: anaMembership.family.inviteCode });
  const brunoMembership = findMembership(db, bruno.id);
  if (brunoMembership === null) throw new Error('Bruno did not join');
  updateMember(db, anaMembership, brunoMembership.member.id, { color: 'm2' });
  const lia = addProfile(db, anaMembership, { name: 'Lia', color: 'm3' });
  const theo = addProfile(db, anaMembership, { name: 'Theo', color: 'm4' });
  const cida = addProfile(db, anaMembership, { name: 'Vó Cida', color: 'm5' });
  const ids = { ana: anaMembership.member.id, bruno: brunoMembership.member.id, lia: lia.id, theo: theo.id, cida: cida.id };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d;
  };
  const dateOnly = (offset: number) => {
    const d = day(offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const at = (offset: number, hour: number, minute = 0) => {
    const d = day(offset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const nextWeekday = (weekday: number) => (weekday - today.getDay() + 7) % 7;

  const events = [
    { title: 'Almoço de domingo', allDay: false, start: at(nextWeekday(0) - 7, 12, 30), end: at(nextWeekday(0) - 7, 14), recurrence: 'weekly', memberIds: Object.values(ids), location: 'Casa da vó' },
    { title: 'Natação', allDay: false, start: at(nextWeekday(2) - 14, 17), end: at(nextWeekday(2) - 14, 18), recurrence: 'weekly', memberIds: [ids.theo, ids.bruno], location: 'Clube Pinheiros', notes: 'Levar touca e toalha' },
    { title: 'Ballet', allDay: false, start: at(nextWeekday(4) - 14, 19), end: at(nextWeekday(4) - 14, 20), recurrence: 'weekly', memberIds: [ids.lia] },
    { title: 'Academia', allDay: false, start: at(nextWeekday(1) - 7, 7, 30), end: at(nextWeekday(1) - 7, 8, 30), recurrence: 'weekly', memberIds: [ids.bruno] },
    { title: 'Dentista', allDay: false, start: at(1, 14), end: at(1, 15), memberIds: [ids.lia, ids.ana], location: 'Dra. Paula — Rua Harmonia, 120' },
    { title: 'Reunião de pais', allDay: false, start: at(3, 19, 30), end: at(3, 21), memberIds: [ids.ana, ids.bruno], location: 'Escola Viva' },
    { title: 'Inglês', allDay: false, start: at(4, 16), end: at(4, 17), memberIds: [ids.lia] },
    { title: 'Feira', allDay: false, start: at(nextWeekday(6) - 7, 10), end: at(nextWeekday(6) - 7, 12), recurrence: 'weekly', memberIds: [ids.ana, ids.theo] },
    { title: 'Aniversário da Vó Cida', allDay: true, start: dateOnly(7), end: dateOnly(7), recurrence: 'yearly', memberIds: [ids.cida] },
    { title: 'Viagem — São Paulo', allDay: true, start: dateOnly(9), end: dateOnly(11), memberIds: [ids.bruno] },
    { title: 'Apresentação da escola', allDay: false, start: at(12, 18, 30), end: at(12, 20), memberIds: [ids.theo, ids.ana] },
    { title: 'Consulta cardio', allDay: false, start: at(-4, 9), end: at(-4, 10), memberIds: [ids.cida, ids.ana] },
    { title: 'Separar uniforme', allDay: false, start: at(0, 19), end: at(0, 19, 30), memberIds: [ids.ana] },
  ];
  for (const raw of events) createEvent(db, anaMembership, EventInput.parse(raw));
});

console.log(`Seeded demo family into ${path} — login ana@exemplo.com / senha-demo-123`);
