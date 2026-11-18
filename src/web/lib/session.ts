import { computed, shallowRef } from 'vue';
import type { MeDto, MemberDto } from '../../shared/schemas.ts';
import { api, ApiError } from './api.ts';

const me = shallowRef<MeDto | null>(null);
const isLoaded = shallowRef(false);

export function useSession() {
  const membersById = computed(() => new Map((me.value?.members ?? []).map((m) => [m.id, m])));
  return {
    me,
    isLoaded,
    membersById,
    isAdmin: computed(() => me.value?.member?.role === 'admin'),
    member: (id: string): MemberDto | undefined => membersById.value.get(id),
  };
}

export async function loadSession(): Promise<MeDto | null> {
  try {
    me.value = await api<MeDto>('GET', '/api/me');
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    me.value = null;
  } finally {
    isLoaded.value = true;
  }
  return me.value;
}

export function setSession(value: MeDto | null): void {
  me.value = value;
  isLoaded.value = true;
}

export async function logout(): Promise<void> {
  await api<null>('POST', '/api/auth/logout');
  me.value = null;
}
