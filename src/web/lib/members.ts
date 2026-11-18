import { shallowRef, watch } from 'vue';
import { MEMBER_COLORS, type MemberColor } from '../../shared/constants.ts';

export const memberColorVar = (color: MemberColor) => `var(--${color})`;
export { MEMBER_COLORS };

const STORAGE_KEY = 'ninho:hidden-members';

function readHidden(): Set<string> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []);
  } catch {
    return new Set();
  }
}

const hiddenMembers = shallowRef<ReadonlySet<string>>(readHidden());
watch(hiddenMembers, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...value]));
  } catch {
    // Storage can be unavailable (private mode); the filter then lasts only for this visit.
  }
});

/** Per-viewer filter of whose events show on the calendar, remembered in this browser. */
export function useMemberFilter() {
  return {
    hiddenMembers,
    toggle(id: string) {
      const next = new Set(hiddenMembers.value);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      hiddenMembers.value = next;
    },
  };
}
