<script setup lang="ts">
import { dismissToast, useToasts } from '../lib/toast.ts';
import AppIcon from './AppIcon.vue';

const toasts = useToasts();
</script>

<template>
  <div class="stack" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.tone">
        <span>{{ toast.message }}</span>
        <button type="button" class="icon-btn" aria-label="Dispensar" @click="dismissToast(toast.id)">
          <AppIcon name="close" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.stack {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: grid;
  gap: 8px;
  z-index: 50;
  width: min(380px, calc(100vw - 32px));
}

.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 6px 6px 16px;
  border-radius: var(--radius-m);
  background: var(--ink);
  color: var(--bg);
  box-shadow: var(--shadow-2);
  font-weight: 500;
}

.toast.error {
  background: var(--danger);
  color: var(--on-accent);
}

.toast .icon-btn:hover {
  background: color-mix(in oklab, currentColor 15%, transparent);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 720px) {
  .stack {
    left: 16px;
    right: 16px;
    bottom: calc(88px + env(safe-area-inset-bottom));
    width: auto;
  }
}
</style>
