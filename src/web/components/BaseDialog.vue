<script setup lang="ts">
import { nextTick, useId, useTemplateRef, watch } from 'vue';
import AppIcon from './AppIcon.vue';

const { open, title } = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const titleId = useId();
let returnFocusTo: HTMLElement | null = null;

watch(
  () => open,
  async (isOpen) => {
    await nextTick();
    const el = dialog.value;
    if (el === null) return;
    if (isOpen && !el.open) {
      returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      el.showModal();
    } else if (!isOpen && el.open) {
      el.close();
      returnFocusTo?.focus();
      returnFocusTo = null;
    }
  },
  { immediate: true },
);

function onCancel(event: Event): void {
  event.preventDefault();
  emit('close');
}

function onBackdropClick(event: MouseEvent): void {
  if (event.target === dialog.value) emit('close');
}
</script>

<template>
  <dialog ref="dialog" class="dialog" :aria-labelledby="titleId" @cancel="onCancel" @click="onBackdropClick">
    <div v-if="open" class="panel">
      <header class="head">
        <h2 :id="titleId" class="display">{{ title }}</h2>
        <button type="button" class="icon-btn" aria-label="Fechar" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>
      <div class="body">
        <slot />
      </div>
      <footer v-if="$slots.footer" class="foot">
        <slot name="footer" />
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  margin: auto;
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100svh - 48px);
  overflow: visible;
}

.dialog::backdrop {
  background: var(--scrim);
  backdrop-filter: blur(2px);
}

.dialog[open] {
  animation: dialog-in var(--dur) var(--ease);
}

.dialog[open]::backdrop {
  animation: fade-in var(--dur) var(--ease);
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

.panel {
  background: var(--surface);
  border-radius: var(--radius-l);
  box-shadow: var(--shadow-2);
  display: flex;
  flex-direction: column;
  max-height: calc(100svh - 48px);
  overflow: hidden;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 20px 24px 0;
}

.head h2 {
  font-size: 22px;
  font-weight: 700;
}

.body {
  padding: 20px 24px;
  overflow-y: auto;
  display: grid;
  gap: var(--space-4);
}

.foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--line);
  background: var(--bg);
}

@media (max-width: 720px) {
  .dialog {
    width: 100vw;
    max-width: 100vw;
    height: 100svh;
    max-height: 100svh;
    margin: 0;
  }

  .dialog[open] {
    animation-name: sheet-in;
  }

  @keyframes sheet-in {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
  }

  .panel {
    border-radius: 0;
    height: 100svh;
    max-height: 100svh;
  }

  .head {
    padding: 12px 16px 0;
  }

  .body {
    flex: 1;
    padding: 16px;
  }

  .foot {
    flex-direction: column-reverse;
    align-items: stretch;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  }

  .foot :deep(.btn) {
    width: 100%;
  }
}
</style>
