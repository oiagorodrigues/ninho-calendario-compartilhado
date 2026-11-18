<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Occurrence } from '../../shared/recurrence.ts';
import type { EventDto } from '../../shared/schemas.ts';
import AgendaList from '../components/AgendaList.vue';
import AppIcon from '../components/AppIcon.vue';
import AppShell from '../components/AppShell.vue';
import BaseDialog from '../components/BaseDialog.vue';
import EventDialog from '../components/EventDialog.vue';
import MemberFilter from '../components/MemberFilter.vue';
import MiniMonth from '../components/MiniMonth.vue';
import MonthGrid from '../components/MonthGrid.vue';
import WeekGrid from '../components/WeekGrid.vue';
import WeekStrip from '../components/WeekStrip.vue';
import { occurrencesOnDay, useCalendar, type Range } from '../lib/calendar.ts';
import {
  addDays,
  addMonths,
  formatDayMonth,
  formatFullDate,
  formatMonth,
  isSameDay,
  monthGridDays,
  parseLocalDate,
  startOfDay,
  startOfWeek,
  toLocalDateString,
} from '../lib/dates.ts';
import { memberColorVar, useMemberFilter } from '../lib/members.ts';
import { useSession } from '../lib/session.ts';

type ViewName = 'mes' | 'semana' | 'agenda';
const AGENDA_DAYS = 14;

const route = useRoute();
const router = useRouter();
const { me, member } = useSession();
const { hiddenMembers, toggle } = useMemberFilter();

function useMedia(query: string) {
  const list = window.matchMedia(query);
  const matches = shallowRef(list.matches);
  const update = (event: MediaQueryListEvent) => (matches.value = event.matches);
  list.addEventListener('change', update);
  onScopeDispose(() => list.removeEventListener('change', update));
  return matches;
}
const isPhone = useMedia('(max-width: 720px)');
const isCompact = useMedia('(max-width: 1080px)');

const today = shallowRef(startOfDay(new Date()));
const midnightTimer = setInterval(() => {
  const now = startOfDay(new Date());
  if (!isSameDay(now, today.value)) today.value = now;
}, 60_000);
onScopeDispose(() => clearInterval(midnightTimer));

const view = computed<ViewName>(() => {
  const requested = route.query.v;
  if (requested === 'mes' || requested === 'agenda') return requested;
  if (requested === 'semana') return isPhone.value ? 'agenda' : 'semana';
  return isPhone.value ? 'agenda' : 'mes';
});

const selected = computed<Date>(() => {
  const d = route.query.d;
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? parseLocalDate(d) : today.value;
});

const miniMonth = shallowRef(new Date(selected.value.getFullYear(), selected.value.getMonth(), 1));
watch(selected, (day) => (miniMonth.value = new Date(day.getFullYear(), day.getMonth(), 1)));

function go(next: { v?: ViewName; d?: Date }): void {
  void router.replace({
    query: {
      ...route.query,
      ...(next.v ? { v: next.v } : {}),
      ...(next.d ? { d: toLocalDateString(next.d) } : {}),
    },
  });
}

const range = computed<Range>(() => {
  if (view.value === 'mes') {
    const days = monthGridDays(selected.value);
    const first = days[0] ?? selected.value;
    return { from: first, to: addDays(first, days.length) };
  }
  if (view.value === 'semana') {
    const from = startOfWeek(selected.value);
    return { from, to: addDays(from, 7) };
  }
  const from = startOfWeek(selected.value);
  return { from, to: addDays(selected.value, AGENDA_DAYS) };
});

const { occurrences, isLoading, refresh } = useCalendar(range, hiddenMembers);

const heading = computed(() => {
  if (view.value === 'semana') {
    const from = startOfWeek(selected.value);
    const to = addDays(from, 6);
    return { main: `${formatDayMonth(from)} – ${formatDayMonth(to)}`, sub: String(to.getFullYear()) };
  }
  return { main: formatMonth(selected.value), sub: String(selected.value.getFullYear()) };
});

function step(direction: 1 | -1): void {
  if (view.value === 'mes') go({ d: addMonths(selected.value, direction) });
  else if (view.value === 'semana') go({ d: addDays(selected.value, 7 * direction) });
  else go({ d: addDays(selected.value, 7 * direction) });
}

const viewOptions = computed(() =>
  (isPhone.value ? (['agenda', 'mes'] as const) : (['mes', 'semana', 'agenda'] as const)).map((value) => ({
    value,
    label: value === 'mes' ? 'Mês' : value === 'semana' ? 'Semana' : 'Agenda',
  })),
);

const phoneDayItems = computed(() => occurrencesOnDay(occurrences.value, selected.value));

// Event dialog
const dialog = shallowRef<{ open: boolean; event: EventDto | null; day: Date }>({ open: false, event: null, day: today.value });

function openNew(day: Date = selected.value): void {
  dialog.value = { open: true, event: null, day };
}

function openNewAt(start: Date): void {
  dialog.value = { open: true, event: null, day: start };
}

function openOccurrence(occurrence: Occurrence): void {
  dialog.value = { open: true, event: occurrence.event, day: occurrence.start };
}

function openDay(day: Date): void {
  go({ d: day, v: isPhone.value ? view.value : 'agenda' });
}

// Mobile filter: a draft that only takes effect on "Aplicar".
const isFilterOpen = shallowRef(false);
const draftHidden = shallowRef<ReadonlySet<string>>(new Set());

function openFilter(): void {
  draftHidden.value = new Set(hiddenMembers.value);
  isFilterOpen.value = true;
}

function toggleDraft(id: string): void {
  const next = new Set(draftHidden.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  draftHidden.value = next;
}

function applyFilter(): void {
  hiddenMembers.value = draftHidden.value;
  isFilterOpen.value = false;
}

const hiddenChips = computed(() =>
  [...hiddenMembers.value].flatMap((id) => {
    const m = member(id);
    return m === undefined ? [] : [{ id, name: m.name, color: memberColorVar(m.color) }];
  }),
);
</script>

<template>
  <AppShell>
    <template #sidebar>
      <button type="button" class="btn btn-ink new-event" @click="openNew()"><AppIcon name="plus" :size="18" />Novo evento</button>
      <MiniMonth
        :month="miniMonth"
        :selected="selected"
        :today="today"
        :highlight-week="view === 'semana'"
        @select="(d) => go({ d })"
        @change-month="(m) => (miniMonth = m)"
      />
      <section aria-labelledby="filter-title">
        <h2 id="filter-title" class="label filter-title">{{ me?.family?.name }}</h2>
        <MemberFilter :hidden-members="hiddenMembers" @toggle="toggle" />
      </section>
    </template>

    <header class="bar">
      <h1 class="display title">
        {{ heading.main }} <small>{{ heading.sub }}</small>
      </h1>
      <div class="nav">
        <button type="button" class="icon-btn" :aria-label="view === 'mes' ? 'Mês anterior' : 'Semana anterior'" @click="step(-1)"><AppIcon name="left" /></button>
        <button type="button" class="icon-btn" :aria-label="view === 'mes' ? 'Próximo mês' : 'Próxima semana'" @click="step(1)"><AppIcon name="right" /></button>
        <button v-if="!isSameDay(selected, today)" type="button" class="btn btn-secondary today-btn" @click="go({ d: today })">Hoje</button>
      </div>
      <span class="loading" :class="{ visible: isLoading }" aria-hidden="true" />
      <div class="seg" role="group" aria-label="Visualização">
        <button v-for="o in viewOptions" :key="o.value" type="button" :aria-pressed="view === o.value" @click="go({ v: o.value })">{{ o.label }}</button>
      </div>
      <button v-if="isCompact" type="button" class="icon-btn filter-btn" aria-label="Filtrar pessoas" title="Filtrar pessoas" @click="openFilter">
        <AppIcon name="filter" />
        <span v-if="hiddenMembers.size > 0" class="badge">{{ hiddenMembers.size }}</span>
      </button>
    </header>

    <div v-if="isCompact && hiddenChips.length > 0" class="chips" aria-label="Pessoas ocultas">
      <button v-for="c in hiddenChips" :key="c.id" type="button" class="chip" :aria-label="`Mostrar ${c.name} de novo`" @click="toggle(c.id)">
        <span class="dot" :style="{ background: c.color }" />Sem {{ c.name }} <AppIcon name="close" :size="14" />
      </button>
    </div>

    <Transition name="view" mode="out-in">
      <div :key="view" class="view">
        <template v-if="view === 'mes'">
          <MonthGrid :month="selected" :today="today" :occurrences="occurrences" @open-day="openDay" @open-event="openOccurrence" @new-on="openNew" />
          <section v-if="isPhone" class="phone-day" :aria-label="formatFullDate(selected)">
            <AgendaList :from="selected" :days="1" :today="today" :occurrences="phoneDayItems" @open-event="openOccurrence" @new-on="openNew" />
          </section>
        </template>
        <WeekGrid
          v-else-if="view === 'semana'"
          :week-start="startOfWeek(selected)"
          :today="today"
          :occurrences="occurrences"
          @open-event="openOccurrence"
          @new-at="openNewAt"
          @open-day="openDay"
        />
        <div v-else class="agenda-view">
          <WeekStrip v-if="isPhone" :selected="selected" :today="today" :occurrences="occurrences" @select="(d) => go({ d })" />
          <AgendaList :from="selected" :days="AGENDA_DAYS" :today="today" :occurrences="occurrences" @open-event="openOccurrence" @new-on="openNew" />
        </div>
      </div>
    </Transition>

    <button v-if="isCompact" type="button" class="fab" aria-label="Novo evento" @click="openNew()"><AppIcon name="plus" :size="26" /></button>

    <EventDialog :open="dialog.open" :event="dialog.event" :day="dialog.day" @close="dialog = { ...dialog, open: false }" @saved="refresh" />

    <BaseDialog :open="isFilterOpen" title="Mostrar eventos de" @close="isFilterOpen = false">
      <MemberFilter :hidden-members="draftHidden" @toggle="toggleDraft" />
      <template #footer>
        <button type="button" class="btn btn-secondary" @click="draftHidden = new Set()">Limpar</button>
        <button type="button" class="btn btn-primary" @click="applyFilter">Aplicar</button>
      </template>
    </BaseDialog>
    <span class="visually-hidden" aria-live="polite">{{ isLoading ? 'Carregando eventos' : '' }}</span>
  </AppShell>
</template>

<style scoped>
.new-event {
  width: 100%;
}

.filter-title {
  margin: 0 10px 6px;
}

.bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 84px;
  flex-wrap: wrap;
  padding: var(--space-3) 0;
}

.title {
  font-size: 40px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.title small {
  font-weight: 500;
  color: var(--ink-3);
}

.nav {
  display: flex;
  align-items: center;
  gap: 2px;
}

.today-btn {
  height: 36px;
  padding: 0 14px;
  margin-left: 6px;
  font-size: 14px;
}

.loading {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--line);
  border-top-color: var(--ink-2);
  opacity: 0;
  transition: opacity var(--dur) var(--ease);
  animation: spin 0.8s linear infinite;
}

.loading.visible {
  opacity: 1;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.seg {
  margin-left: auto;
  display: flex;
  background: var(--surface-2);
  padding: 4px;
  border-radius: var(--radius-pill);
}

.seg button {
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  color: var(--ink-2);
  font-size: 14px;
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.seg [aria-pressed='true'] {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-1);
}

.filter-btn {
  position: relative;
}

.badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 10px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: var(--space-3);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  font-size: 13px;
  font-weight: 600;
}

.view-enter-active,
.view-leave-active {
  transition:
    opacity var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}

.view-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.view-leave-to {
  opacity: 0;
}

.agenda-view {
  display: grid;
  gap: var(--space-4);
  max-width: 760px;
}

.phone-day {
  margin-top: var(--space-5);
  display: grid;
  gap: var(--space-3);
}

.fab {
  position: fixed;
  right: var(--gutter);
  bottom: calc(84px + env(safe-area-inset-bottom));
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: var(--accent);
  color: var(--on-accent);
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-2);
  z-index: 15;
  transition: transform var(--dur-fast) var(--ease);
}

.fab:active {
  transform: scale(0.95);
}

@media (max-width: 720px) {
  .bar {
    min-height: 64px;
    gap: 4px;
  }

  .title {
    font-size: 30px;
    width: 100%;
    order: -1;
  }

  .title small {
    display: none;
  }

  .seg {
    margin-left: auto;
  }

  .seg button {
    padding: 0 12px;
  }

  .today-btn {
    margin-left: 2px;
  }
}
</style>
