// Shared mock data for the design directions (Nov 2026, "today" = 15/11).
window.NINHO = {
  today: new Date(2026, 10, 15),
  members: [
    { id: 'ana', name: 'Ana', color: 'var(--m1)' },
    { id: 'bruno', name: 'Bruno', color: 'var(--m2)' },
    { id: 'lia', name: 'Lia', color: 'var(--m3)' },
    { id: 'theo', name: 'Theo', color: 'var(--m4)' },
    { id: 'cida', name: 'Vó Cida', color: 'var(--m5)' },
  ],
  events: [
    { d: 2, t: '08:00', title: 'Finados — almoço', who: ['ana', 'bruno', 'lia', 'theo'], allDay: true },
    { d: 3, t: '17:00', end: '18:00', title: 'Natação', who: ['theo'] },
    { d: 5, t: '19:00', end: '20:00', title: 'Ballet', who: ['lia'] },
    { d: 7, t: '10:00', end: '12:00', title: 'Feira', who: ['ana', 'theo'] },
    { d: 10, t: '17:00', end: '18:00', title: 'Natação', who: ['theo'] },
    { d: 11, t: '09:00', end: '10:00', title: 'Consulta cardio', who: ['cida', 'ana'] },
    { d: 12, t: '19:00', end: '20:00', title: 'Ballet', who: ['lia'] },
    { d: 14, t: '15:00', end: '18:00', title: 'Festa da Júlia', who: ['lia'] },
    { d: 15, t: '12:30', end: '14:00', title: 'Almoço de domingo', who: ['ana', 'bruno', 'lia', 'theo', 'cida'] },
    { d: 15, t: '19:00', end: '19:30', title: 'Separar uniforme', who: ['ana'] },
    { d: 16, t: '07:30', end: '08:30', title: 'Academia', who: ['bruno'] },
    { d: 16, t: '14:00', end: '15:00', title: 'Dentista', who: ['lia', 'ana'] },
    { d: 17, t: '17:00', end: '18:00', title: 'Natação', who: ['theo', 'bruno'] },
    { d: 18, t: '19:30', end: '21:00', title: 'Reunião de pais', who: ['ana', 'bruno'] },
    { d: 19, t: '16:00', end: '17:00', title: 'Inglês', who: ['lia'] },
    { d: 19, t: '19:00', end: '20:00', title: 'Ballet', who: ['lia'] },
    { d: 20, t: '', title: 'Consciência Negra', who: ['ana', 'bruno', 'lia', 'theo'], allDay: true },
    { d: 21, t: '10:00', end: '12:00', title: 'Feira', who: ['ana', 'theo'] },
    { d: 22, t: '', title: 'Aniversário da Vó Cida', who: ['cida'], allDay: true },
    { d: 22, t: '13:00', end: '17:00', title: 'Almoço na casa da vó', who: ['ana', 'bruno', 'lia', 'theo', 'cida'] },
    { d: 24, t: '', title: 'Viagem — São Paulo', who: ['bruno'], allDay: true, span: 3 },
    { d: 24, t: '17:00', end: '18:00', title: 'Natação', who: ['theo'] },
    { d: 26, t: '19:00', end: '20:00', title: 'Ballet', who: ['lia'] },
    { d: 27, t: '18:30', end: '20:00', title: 'Apresentação escola', who: ['theo', 'ana'] },
    { d: 28, t: '09:00', end: '11:00', title: 'Mutirão do prédio', who: ['bruno'] },
  ],
  weekdays: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  weekdaysLong: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
};
window.NINHO.byDay = (d) =>
  window.NINHO.events
    .filter((e) => e.d === d || (e.span && d > e.d && d < e.d + e.span))
    .sort((a, b) => (a.allDay ? -1 : b.allDay ? 1 : a.t.localeCompare(b.t)));
window.NINHO.member = (id) => window.NINHO.members.find((m) => m.id === id);
