<script setup lang="ts">
import { computed } from 'vue';
import type { Occurrence } from '../../shared/recurrence.ts';
import { occurrencesOnDay } from '../lib/calendar.ts';
import { formatFullDate, formatTime, isSameDay, monthGridDays, WEEKDAYS_SHORT } from '../lib/dates.ts';
import { memberColorVar } from '../lib/members.ts';
import { useSession } from '../lib/session.ts';

const MAX_VISIBLE = 3;
const props = defineProps<{ month: Date; today: Date; occurrences: Occurrence[] }>();
const emit = defineEmits<{ openDay: [day: Date]; openEvent: [occurrence: Occurrence]; newOn: [day: Date] }>();
const { member } = useSession();

const days = computed(() =>
  monthGridDays(props.month).map((day) => {
    const items = occurrencesOnDay(props.occurrences, day);
    return {
      day,
      key: day.toISOString(),
      isOutside: day.getMonth() !== props.month.getMonth(),
      isToday: isSameDay(day, props.today),
      visible: items.slice(0, MAX_VISIBLE),
      hidden: Math.max(0, items.length - MAX_VISIBLE),
      dayDots: [...new Set(items.flatMap(dotColors))].slice(0, 4),
    };
  }),
);

function colorOf(occurrence: Occurrence): string {
  const first = occurrence.event.memberIds[0];
  const m = first === undefined ? undefined : member(first);
  return m === undefined ? 'var(--ink-3)' : memberColorVar(m.color);
}

function dotColors(occurrence: Occurrence): string[] {
  return occurrence.event.memberIds.flatMap((id) => {
    const m = member(id);
    return m === undefined ? [] : [memberColorVar(m.color)];
  });
}
</script>

<template>
  <div class="month card">
    <div class="head" aria-hidden="true">
      <div v-for="w in WEEKDAYS_SHORT" :key="w" class="label">{{ w }}</div>
    </div>
    <div class="grid" :style="{ gridTemplateRows: `repeat(${days.length / 7}, minmax(118px, 1fr))` }">
      <div
        v-for="cell in days"
        :key="cell.key"
        class="cell"
        :class="{ outside: cell.isOutside, today: cell.isToday }"
        @dblclick.self="emit('newOn', cell.day)"
      >
        <button type="button" class="num" :aria-label="formatFullDate(cell.day)" :aria-current="cell.isToday ? 'date' : undefined" @click="emit('openDay', cell.day)">
          {{ cell.day.getDate() }}
        </button>
        <button
          v-for="o in cell.visible"
          :key="o.key"
          type="button"
          class="ev"
          :class="{ 'all-day': o.event.allDay }"
          :style="o.event.allDay ? { background: colorOf(o) } : undefined"
          @click="emit('openEvent', o)"
        >
          <span v-if="!o.event.allDay" class="time">{{ formatTime(o.start) }}</span>
          <span class="title">{{ o.event.title }}</span>
          <span v-if="!o.event.allDay" class="dots" aria-hidden="true">
            <i v-for="(c, i) in dotColors(o)" :key="i" :style="{ background: c }" />
          </span>
        </button>
        <button v-if="cell.hidden > 0" type="button" class="more" @click="emit('openDay', cell.day)">+{{ cell.hidden }}</button>
        <span v-if="cell.dayDots.length > 0" class="day-dots" aria-hidden="true">
          <i v-for="c in cell.dayDots" :key="c" :style="{ background: c }" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.month {
  overflow: hidden;
}

.head {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-bottom: 1px solid var(--line);
}

.head > div {
  padding: 10px 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.cell {
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  transition: background var(--dur-fast) var(--ease);
  animation: cell-in var(--dur-slow) var(--ease) backwards;
}

.cell:nth-child(7n) {
  border-right: 0;
}

.cell:nth-last-child(-n + 7) {
  border-bottom: 0;
}

.cell:hover {
  background: var(--surface-hover);
}

@keyframes cell-in {
  from {
    opacity: 0;
  }
}

.num {
  font-weight: 600;
  font-size: 14px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin-bottom: 2px;
  transition: background var(--dur-fast) var(--ease);
  font-variant-numeric: tabular-nums;
}

.num:hover {
  background: var(--surface-2);
}

.outside .num {
  color: var(--ink-3);
}

.today .num {
  background: var(--accent);
  color: var(--on-accent);
}

.ev {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  line-height: 1.2;
  padding: 4px 6px;
  border-radius: 6px;
  min-width: 0;
  text-align: left;
  transition:
    background var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}

.ev:hover {
  background: var(--surface-2);
}

.ev .time {
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  flex: none;
}

.ev .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.ev.all-day {
  color: var(--on-member);
  font-weight: 600;
}

.ev.all-day:hover {
  transform: translateY(-1px);
}

.dots {
  display: flex;
  margin-left: auto;
  flex: none;
  padding-left: 2px;
}

.dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-left: -2px;
  box-shadow: 0 0 0 1.5px var(--surface);
}

.more {
  font-size: 12px;
  color: var(--ink-2);
  padding: 2px 6px;
  font-weight: 600;
  text-align: left;
  border-radius: 6px;
}

.more:hover {
  background: var(--surface-2);
}

.day-dots {
  display: none;
}

.outside {
  background: color-mix(in oklab, var(--bg) 45%, var(--surface));
}

@media (max-width: 720px) {
  .head > div {
    padding: 8px 0;
    text-align: center;
  }

  .grid {
    grid-template-rows: none !important;
    grid-auto-rows: 64px;
  }

  .cell {
    padding: 4px 2px;
    align-items: center;
  }

  .ev,
  .more {
    display: none;
  }

  .day-dots {
    display: flex;
    gap: 3px;
  }

  .day-dots i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }
}
</style>
