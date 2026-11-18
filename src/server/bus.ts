export type FamilyChange = { kind: 'events' | 'members' | 'family' | 'comments'; eventId?: string };
type Listener = (change: FamilyChange) => void;

/** In-process fan-out of family changes to open SSE streams; a single-process deploy needs nothing more. */
export function createChangeBus() {
  const listeners = new Map<string, Set<Listener>>();
  return {
    subscribe(familyId: string, listener: Listener): () => void {
      const set = listeners.get(familyId) ?? new Set<Listener>();
      set.add(listener);
      listeners.set(familyId, set);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(familyId);
      };
    },
    publish(familyId: string, change: FamilyChange): void {
      for (const listener of listeners.get(familyId) ?? []) listener(change);
    },
  };
}
export type ChangeBus = ReturnType<typeof createChangeBus>;
