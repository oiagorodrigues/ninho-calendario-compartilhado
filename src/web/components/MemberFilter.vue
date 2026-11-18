<script setup lang="ts">
import { memberColorVar } from '../lib/members.ts';
import { useSession } from '../lib/session.ts';
import AppIcon from './AppIcon.vue';

defineProps<{ hiddenMembers: ReadonlySet<string> }>();
const emit = defineEmits<{ toggle: [memberId: string] }>();
const { me } = useSession();
</script>

<template>
  <ul class="members">
    <li v-for="m in me?.members ?? []" :key="m.id">
      <button type="button" class="member" :aria-pressed="!hiddenMembers.has(m.id)" @click="emit('toggle', m.id)">
        <span class="dot" :style="{ background: memberColorVar(m.color) }" />
        <span class="name">{{ m.name }}</span>
        <span class="check" :style="{ background: hiddenMembers.has(m.id) ? undefined : memberColorVar(m.color) }">
          <AppIcon v-if="!hiddenMembers.has(m.id)" name="check" :size="12" />
        </span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.members {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 2px;
}

.member {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 0 10px;
  border-radius: 10px;
  text-align: left;
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.member:hover {
  background: var(--surface-2);
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member[aria-pressed='false'] {
  color: var(--ink-3);
}

.check {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: var(--on-member);
  box-shadow: inset 0 0 0 1.5px var(--line);
  transition: background var(--dur-fast) var(--ease);
}
</style>
