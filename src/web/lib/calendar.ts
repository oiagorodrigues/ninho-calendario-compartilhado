import { computed, onScopeDispose, shallowRef, watch, type Ref } from 'vue';
import { expandOccurrences, type Occurrence } from '../../shared/recurrence.ts';
import type { EventDto } from '../../shared/schemas.ts';
import { api, errorMessage } from './api.ts';
import { loadSession } from './session.ts';
import { showToast } from './toast.ts';

export interface Range {
  from: Date;
  to: Date;
}

/**
 * Loads the family's events for a visible range, keeps them fresh through the server's change
 * stream, and exposes the expanded occurrences filtered by the selected members.
 */
export function useCalendar(range: Ref<Range>, hiddenMembers: Ref<ReadonlySet<string>>) {
  const events = shallowRef<EventDto[]>([]);
  const isLoading = shallowRef(false);
  let requestId = 0;

  async function refresh(): Promise<void> {
    const id = ++requestId;
    isLoading.value = true;
    try {
      const { from, to } = range.value;
      const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      const result = await api<EventDto[]>('GET', `/api/events?${query}`);
      if (id === requestId) events.value = result;
    } catch (error) {
      if (id === requestId) showToast(errorMessage(error), 'error');
    } finally {
      if (id === requestId) isLoading.value = false;
    }
  }

  watch(() => [range.value.from.getTime(), range.value.to.getTime()], refresh, { immediate: true });

  const stream = new EventSource('/api/stream');
  stream.addEventListener('change', (message: MessageEvent<string>) => {
    const change: unknown = JSON.parse(message.data);
    const kind = typeof change === 'object' && change !== null && 'kind' in change ? change.kind : null;
    if (kind === 'members' || kind === 'family') void loadSession();
    if (kind === 'events' || kind === 'members') void refresh();
  });
  onScopeDispose(() => stream.close());

  const occurrences = computed<Occurrence[]>(() => {
    const all = expandOccurrences(events.value, range.value.from, range.value.to);
    if (hiddenMembers.value.size === 0) return all;
    return all.filter((o) => o.event.memberIds.some((id) => !hiddenMembers.value.has(id)));
  });

  return { events, occurrences, isLoading, refresh };
}

export function occurrencesOnDay(occurrences: readonly Occurrence[], day: Date): Occurrence[] {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return occurrences.filter((o) => o.start < end && o.end > start);
}
