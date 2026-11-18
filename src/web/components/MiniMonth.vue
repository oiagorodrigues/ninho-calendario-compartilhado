<script setup lang="ts">
import { computed } from 'vue';
import { addMonths, formatFullDate, formatMonth, isSameDay, monthGridDays } from '../lib/dates.ts';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ month: Date; selected: Date; today: Date; highlightWeek: boolean }>();
const emit = defineEmits<{ select: [day: Date]; changeMonth: [month: Date] }>();

const days = computed(() => monthGridDays(props.month));

function isInSelectedWeek(day: Date): boolean {
  if (!props.highlightWeek) return false;
  const start = new Date(props.selected);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return day >= start && day < end;
}
</script>

<template>
  <div class="mini card">
    <div class="head">
      <span class="name">{{ formatMonth(month) }} <span class="label">{{ month.getFullYear() }}</span></span>
      <span class="nav">
        <button type="button" class="icon-btn small" aria-label="Mês anterior" @click="emit('changeMonth', addMonths(month, -1))"><AppIcon name="left" :size="16" /></button>
        <button type="button" class="icon-btn small" aria-label="Próximo mês" @click="emit('changeMonth', addMonths(month, 1))"><AppIcon name="right" :size="16" /></button>
      </span>
    </div>
    <div class="grid">
      <span v-for="(w, i) in ['d', 's', 't', 'q', 'q', 's', 's']" :key="i" class="wd" aria-hidden="true">{{ w }}</span>
      <button
        v-for="day in days"
        :key="day.toISOString()"
        type="button"
        class="day"
        :class="{
          outside: day.getMonth() !== month.getMonth(),
          today: isSameDay(day, today),
          selected: isSameDay(day, selected),
          week: isInSelectedWeek(day),
        }"
        :aria-label="formatFullDate(day)"
        :aria-pressed="isSameDay(day, selected)"
        @click="emit('select', day)"
      >
        {{ day.getDate() }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.mini {
  padding: 12px;
  border-radius: var(--radius-m);
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding-left: 4px;
}

.name {
  font-weight: 600;
}

.nav {
  display: flex;
}

.small {
  width: 30px;
  height: 30px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  text-align: center;
  font-size: 12px;
}

.wd {
  color: var(--ink-3);
  font-size: 11px;
  height: 20px;
  line-height: 20px;
}

.day {
  height: 30px;
  border-radius: 50%;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  transition: background var(--dur-fast) var(--ease);
}

.day:hover {
  background: var(--surface-2);
}

.day.outside {
  color: var(--ink-3);
  opacity: 0.6;
}

.day.week {
  background: var(--surface-2);
  border-radius: 0;
}

.day.selected {
  box-shadow: inset 0 0 0 1.5px var(--ink);
  border-radius: 50%;
}

.day.today {
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
  border-radius: 50%;
}
</style>
