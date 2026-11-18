<script setup lang="ts">
import { computed } from 'vue';
import type { Occurrence } from '../../shared/recurrence.ts';
import { occurrencesOnDay } from '../lib/calendar.ts';
import { addDays, formatTime, isSameDay, relativeDayLabel } from '../lib/dates.ts';
import { memberColorVar } from '../lib/members.ts';
import { useSession } from '../lib/session.ts';

const props = defineProps<{ from: Date; days: number; today: Date; occurrences: Occurrence[] }>();
const emit = defineEmits<{ openEvent: [occurrence: Occurrence]; newOn: [day: Date] }>();
const { member } = useSession();

const sections = computed(() =>
  Array.from({ length: props.days }, (_, i) => {
    const day = addDays(props.from, i);
    return { day, key: day.toISOString(), items: occurrencesOnDay(props.occurrences, day) };
  }).filter((section, i) => i === 0 || section.items.length > 0),
);

function whenLabel(o: Occurrence, day: Date): string {
  if (o.event.allDay) return 'dia todo';
  if (!isSameDay(o.start, day)) return 'contínuo';
  return formatTime(o.start);
}

function people(o: Occurrence) {
  return o.event.memberIds.flatMap((id) => {
    const m = member(id);
    return m === undefined ? [] : [{ id, name: m.name, color: memberColorVar(m.color) }];
  });
}
</script>

<template>
  <div class="agenda">
    <section v-for="(s, si) in sections" :key="s.key" class="day" :aria-labelledby="`day-${s.key}`">
      <h3 :id="`day-${s.key}`" class="day-title" :class="{ today: isSameDay(s.day, today) }">
        {{ relativeDayLabel(s.day, today) }}
      </h3>
      <p v-if="s.items.length === 0" class="empty">
        Nada marcado.
        <button type="button" class="link" @click="emit('newOn', s.day)">Adicionar evento</button>
      </p>
      <button
        v-for="(o, i) in s.items"
        :key="o.key"
        type="button"
        class="item card"
        :style="{ animationDelay: `${Math.min(si * 3 + i, 12) * 30}ms` }"
        @click="emit('openEvent', o)"
      >
        <span class="bar" :style="{ background: people(o)[0]?.color ?? 'var(--ink-3)' }" />
        <span class="when">
          {{ whenLabel(o, s.day) }}
          <span v-if="!o.event.allDay && isSameDay(o.start, s.day)" class="until">{{ formatTime(o.end) }}</span>
        </span>
        <span class="main">
          <b>{{ o.event.title }}</b>
          <span v-if="o.event.location" class="location">{{ o.event.location }}</span>
          <span class="who">
            <span v-for="p in people(o)" :key="p.id" class="person"><i class="dot" :style="{ background: p.color }" />{{ p.name }}</span>
          </span>
        </span>
      </button>
    </section>
    <p v-if="sections.length === 1 && sections[0]?.items.length === 0" class="empty-range">Nenhum evento nos próximos {{ days }} dias.</p>
  </div>
</template>

<style scoped>
.agenda {
  display: grid;
  gap: var(--space-5);
}

.day {
  display: grid;
  gap: var(--space-2);
}

.day-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-left: 4px;
}

.day-title.today {
  color: var(--accent);
}

.item {
  display: flex;
  gap: 14px;
  padding: 14px;
  text-align: left;
  border-radius: var(--radius-m);
  transition:
    transform var(--dur-fast) var(--ease),
    box-shadow var(--dur) var(--ease);
  animation: item-in var(--dur-slow) var(--ease) backwards;
}

.item:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-2);
}

@keyframes item-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

.bar {
  width: 4px;
  border-radius: 4px;
  flex: none;
}

.when {
  width: 56px;
  flex: none;
  font-size: 13px;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  padding-top: 1px;
  display: flex;
  flex-direction: column;
}

.until {
  color: var(--ink-3);
}

.main {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.main b {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.location {
  color: var(--ink-2);
  font-size: 13px;
}

.who {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.person {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--surface-2);
}

.person .dot {
  width: 7px;
  height: 7px;
}

.empty {
  color: var(--ink-3);
  padding: 4px;
}

.link {
  color: var(--accent);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  padding: 4px 0;
}

.empty-range {
  color: var(--ink-3);
  text-align: center;
  padding: var(--space-6) 0;
}
</style>
