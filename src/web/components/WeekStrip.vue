<script setup lang="ts">
import { computed } from 'vue';
import type { Occurrence } from '../../shared/recurrence.ts';
import { occurrencesOnDay } from '../lib/calendar.ts';
import { addDays, formatFullDate, isSameDay, startOfWeek, WEEKDAYS_SHORT } from '../lib/dates.ts';
import { memberColorVar } from '../lib/members.ts';
import { useSession } from '../lib/session.ts';

const props = defineProps<{ selected: Date; today: Date; occurrences: Occurrence[] }>();
const emit = defineEmits<{ select: [day: Date] }>();
const { member } = useSession();

const days = computed(() => {
  const start = startOfWeek(props.selected);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    const colors = [
      ...new Set(
        occurrencesOnDay(props.occurrences, day).flatMap((o) =>
          o.event.memberIds.flatMap((id) => {
            const m = member(id);
            return m === undefined ? [] : [memberColorVar(m.color)];
          }),
        ),
      ),
    ].slice(0, 3);
    return { day, colors };
  });
});
</script>

<template>
  <div class="strip">
    <button
      v-for="d in days"
      :key="d.day.toISOString()"
      type="button"
      :aria-label="formatFullDate(d.day)"
      :aria-pressed="isSameDay(d.day, selected)"
      :class="{ today: isSameDay(d.day, today) }"
      @click="emit('select', d.day)"
    >
      <span>{{ WEEKDAYS_SHORT[d.day.getDay()] }}</span>
      <b>{{ d.day.getDate() }}</b>
      <span class="pips" aria-hidden="true"><i v-for="c in d.colors" :key="c" :style="{ background: c }" /></span>
    </button>
  </div>
</template>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

button {
  height: 66px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 12px;
  color: var(--ink-3);
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

b {
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.today b {
  color: var(--accent);
}

[aria-pressed='true'] {
  background: var(--ink);
  color: color-mix(in oklab, var(--bg) 70%, transparent);
}

[aria-pressed='true'] b {
  color: var(--bg);
}

.pips {
  display: flex;
  gap: 2px;
  height: 4px;
}

.pips i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
}
</style>
