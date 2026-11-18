import { shallowRef } from 'vue';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

const toasts = shallowRef<Toast[]>([]);
let nextId = 1;

export function useToasts() {
  return toasts;
}

export function showToast(message: string, tone: Toast['tone'] = 'info'): void {
  const toast = { id: nextId++, message, tone };
  toasts.value = [...toasts.value, toast];
  setTimeout(() => dismissToast(toast.id), tone === 'error' ? 6000 : 3500);
}

export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}
