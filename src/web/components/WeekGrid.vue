<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';
import type { Occurrence } from '../../shared/recurrence.ts';
import { occurrencesOnDay } from '../lib/calendar.ts';
import { addDays, formatTime, isSameDay, WEEKDAYS_SHORT } from '../lib/dates.ts';
import { memberColorVar } from '../lib/members.ts';
import { useSession } from '../lib/session.ts';

const HOUR_PX = 52;
const FIRST_VISIBLE_HOUR = 7;
const MIN_BLOCK_PX = 24;

const props = defineProps<{ weekStart: Date; today: Date; occurrences: Occurrence[] }>();
const emit = defineEmits<{ openEvent: [occurrence: Occurrence]; newAt: [start: Date]; openDay: [day: Date] }>();
const { member } = useSession();
const scroller = useTemplateRef<HTMLDivElement>('scroller');
const now = shallowRef(new Date());
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  scroller.value?.scrollTo({ top: FIRST_VISIBLE_HOUR * HOUR_PX - 12 });
  timer = setInterval(() => (now.value = new Date()), 60_000);
});
onUnmounted(() => clearInterval(timer));

interface Block {
  occurrence: Occurrence;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

/** Greedy lane layout: overlapping events in one cluster share the column width. */
function layoutDay(day: Date, items: Occurrence[]): Block[] {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = addDays(dayStart, 1);
  const blocks: Block[] = [];
  let cluster: Block[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const block of cluster) block.lanes = laneEnds.length;
    cluster = [];
    laneEnds = [];
  };
  for (const occurrence of items) {
    const start = Math.max(occurrence.start.getTime(), dayStart.getTime());
    const end = Math.min(occurrence.end.getTime(), dayEnd.getTime());
    const top = ((start - dayStart.getTime()) / 3_600_000) * HOUR_PX;
    const height = Math.max(MIN_BLOCK_PX, ((end - start) / 3_600_000) * HOUR_PX - 2);
    if (top >= clusterEnd) flush();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= top);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(top + height);
    } else {
      laneEnds[lane] = top + height;
    }
    clusterEnd = Math.max(clusterEnd, top + height);
    const block = { occurrence, top, height, lane, lanes: 1 };
    cluster.push(block);
    blocks.push(block);
  }
  flush();
  return blocks;
}

const columns = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const day = addDays(props.weekStart, i);
    const items = occurrencesOnDay(props.occurrences, day);
    return {
      day,
      key: day.toISOString(),
      isToday: isSameDay(day, props.today),
      allDay: items.filter((o) => o.event.allDay),
      blocks: layoutDay(day, items.filter((o) => !o.event.allDay)),
    };
  }),
);

const nowTop = computed(() => (now.value.getHours() + now.value.getMinutes() / 60) * HOUR_PX);

function colorOf(occurrence: Occurrence): string {
  const first = occurrence.event.memberIds[0];
  const m = first === undefined ? undefined : member(first);
  return m === undefined ? 'var(--ink-3)' : memberColorVar(m.color);
}

function onColumnClick(event: MouseEvent, day: Date): void {
  if (event.target !== event.currentTarget) return;
  const offset = event.offsetY;
  const minutes = Math.floor(((offset / HOUR_PX) * 60) / 30) * 30;
  const start = new Date(day);
  start.setHours(0, minutes, 0, 0);
  emit('newAt', start);
}
</script>

<template>
  <div class="week card">
    <div class="row head">
      <div />
      <button v-for="c in columns" :key="c.key" type="button" class="day-head" :class="{ today: c.isToday }" @click="emit('openDay', c.day)">
        <span class="label">{{ WEEKDAYS_SHORT[c.day.getDay()] }}</span>
        <b>{{ c.day.getDate() }}</b>
      </button>
    </div>
    <div class="row all-day">
      <div class="label gutter-label">dia</div>
      <div v-for="c in columns" :key="c.key" class="all-day-cell">
        <button v-for="o in c.allDay" :key="o.key" type="button" class="pill" :style="{ background: colorOf(o) }" @click="emit('openEvent', o)">
          {{ o.event.title }}
        </button>
      </div>
    </div>
    <div ref="scroller" class="scroller">
      <div class="row body" :style="{ height: `${24 * HOUR_PX}px` }">
        <div class="hours" aria-hidden="true">
          <span v-for="h in 24" :key="h" :style="{ top: `${(h - 1) * HOUR_PX}px` }">{{ h === 1 ? '' : `${String(h - 1).padStart(2, '0')}:00` }}</span>
        </div>
        <div
          v-for="c in columns"
          :key="c.key"
          class="col"
          :class="{ today: c.isToday }"
          :style="{ backgroundSize: `100% ${HOUR_PX}px` }"
          @click="onColumnClick($event, c.day)"
        >
          <button
            v-for="b in c.blocks"
            :key="b.occurrence.key"
            type="button"
            class="block"
            :style="{
              '--c': colorOf(b.occurrence),
              top: `${b.top}px`,
              height: `${b.height}px`,
              left: `calc(${(b.lane / b.lanes) * 100}% + 3px)`,
              width: `calc(${100 / b.lanes}% - 6px)`,
            }"
            @click="emit('openEvent', b.occurrence)"
          >
            <b>{{ b.occurrence.event.title }}</b>
            <span>{{ formatTime(b.occurrence.start) }}</span>
          </button>
          <div v-if="c.isToday" class="now" :style="{ top: `${nowTop}px` }" aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.week {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: calc(100svh - 120px);
  min-height: 480px;
}

.row {
  display: grid;
  grid-template-columns: 56px repeat(7, minmax(0, 1fr));
}

.head {
  border-bottom: 1px solid var(--line);
}

.day-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 12px;
  text-align: left;
  transition: background var(--dur-fast) var(--ease);
}

.day-head:hover {
  background: var(--surface-hover);
}

.day-head b {
  font: 600 22px/1.1 var(--font-display);
}

.day-head.today b {
  color: var(--accent);
}

.all-day {
  border-bottom: 1px solid var(--line);
  min-height: 34px;
}

.gutter-label {
  padding: 10px 8px;
  text-align: right;
}

.all-day-cell {
  border-left: 1px solid var(--line);
  padding: 4px;
  display: grid;
  gap: 3px;
  align-content: start;
  min-width: 0;
}

.pill {
  font-size: 12px;
  font-weight: 600;
  color: var(--on-member);
  padding: 3px 8px;
  border-radius: 6px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scroller {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.body {
  position: relative;
}

.hours {
  position: relative;
}

.hours span {
  position: absolute;
  right: 8px;
  transform: translateY(-7px);
  font-size: 11px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.col {
  position: relative;
  border-left: 1px solid var(--line);
  background-image: linear-gradient(to bottom, var(--line) 1px, transparent 1px);
  cursor: copy;
}

.col.today {
  background-color: color-mix(in oklab, var(--accent) 4%, transparent);
}

.block {
  position: absolute;
  border-radius: 8px;
  padding: 4px 8px;
  text-align: left;
  font-size: 12.5px;
  line-height: 1.25;
  overflow: hidden;
  background: color-mix(in oklab, var(--c) 16%, var(--surface));
  border-left: 3px solid var(--c);
  color: var(--ink);
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
  animation: block-in var(--dur) var(--ease) backwards;
}

.block:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-1);
}

.block b {
  display: block;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.block span {
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}

@keyframes block-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

.now {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
  pointer-events: none;
  z-index: 2;
}

.now::before {
  content: '';
  position: absolute;
  left: -5px;
  top: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
}
</style>
