<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue';
import type { CommentDto, EventDto, Recurrence } from '../../shared/schemas.ts';
import { api, ApiError, errorMessage } from '../lib/api.ts';
import { addDays, combineLocal, parseLocalDate, toLocalDateString, toTimeInput } from '../lib/dates.ts';
import { memberColorVar } from '../lib/members.ts';
import { useSession } from '../lib/session.ts';
import { showToast } from '../lib/toast.ts';
import AppIcon from './AppIcon.vue';
import BaseDialog from './BaseDialog.vue';

const props = defineProps<{
  open: boolean;
  /** The series being edited; null creates a new event. */
  event: EventDto | null;
  /** Day pre-filled for a new event. */
  day: Date;
}>();
const emit = defineEmits<{ close: []; saved: [] }>();

const { me, member } = useSession();

const REPEAT_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Não' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

const form = reactive({
  title: '',
  allDay: false,
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '10:00',
  memberIds: [] as string[],
  recurrence: 'none' as Recurrence,
  recurrenceUntil: '',
  location: '',
  notes: '',
});
const errors = shallowRef<Record<string, string>>({});
const isSaving = shallowRef(false);
const isConfirmingDelete = shallowRef(false);
const comments = shallowRef<CommentDto[]>([]);
const newComment = shallowRef('');
const isSendingComment = shallowRef(false);

function defaultStartHour(day: Date): Date {
  const now = new Date();
  const start = new Date(day);
  const isToday = toLocalDateString(day) === toLocalDateString(now);
  start.setHours(isToday ? Math.min(now.getHours() + 1, 23) : 9, 0, 0, 0);
  return start;
}

function fillForm(): void {
  errors.value = {};
  isConfirmingDelete.value = false;
  newComment.value = '';
  comments.value = [];
  const event = props.event;
  if (event === null) {
    const start = defaultStartHour(props.day);
    const end = new Date(start.getTime() + 3_600_000);
    Object.assign(form, {
      title: '',
      allDay: false,
      startDate: toLocalDateString(start),
      startTime: toTimeInput(start),
      endDate: toLocalDateString(end),
      endTime: toTimeInput(end),
      memberIds: me.value?.member ? [me.value.member.id] : [],
      recurrence: 'none',
      recurrenceUntil: '',
      location: '',
      notes: '',
    });
    return;
  }
  const start = event.allDay ? parseLocalDate(event.start) : new Date(event.start);
  const end = event.allDay ? parseLocalDate(event.end) : new Date(event.end);
  Object.assign(form, {
    title: event.title,
    allDay: event.allDay,
    startDate: toLocalDateString(start),
    startTime: event.allDay ? '09:00' : toTimeInput(start),
    endDate: toLocalDateString(end),
    endTime: event.allDay ? '10:00' : toTimeInput(end),
    memberIds: [...event.memberIds],
    recurrence: event.recurrence,
    recurrenceUntil: event.recurrenceUntil ?? '',
    location: event.location,
    notes: event.notes,
  });
  void loadComments(event.id);
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) fillForm();
  },
  { immediate: true },
);

// Moving the start keeps the event's length, so the end follows it.
function onStartDateChange(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return;
  const next = event.target.value;
  if (next !== '' && form.startDate !== '' && form.endDate !== '') {
    const shift = Math.round((parseLocalDate(next).getTime() - parseLocalDate(form.startDate).getTime()) / 86_400_000);
    form.endDate = toLocalDateString(addDays(parseLocalDate(form.endDate), shift));
  }
  form.startDate = next;
}

function onStartTimeChange(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return;
  const next = event.target.value;
  if (next !== '' && form.startTime !== '' && form.endDate !== '' && form.endTime !== '') {
    const shift = combineLocal(form.startDate, next).getTime() - combineLocal(form.startDate, form.startTime).getTime();
    const end = new Date(combineLocal(form.endDate, form.endTime).getTime() + shift);
    form.endDate = toLocalDateString(end);
    form.endTime = toTimeInput(end);
  }
  form.startTime = next;
}

const title = computed(() => (props.event === null ? 'Novo evento' : 'Editar evento'));

function buildInput() {
  const bounds = form.allDay
    ? { start: form.startDate, end: form.endDate }
    : {
        start: combineLocal(form.startDate, form.startTime).toISOString(),
        end: combineLocal(form.endDate, form.endTime).toISOString(),
      };
  return {
    title: form.title,
    allDay: form.allDay,
    ...bounds,
    memberIds: form.memberIds,
    recurrence: form.recurrence,
    recurrenceUntil: form.recurrence === 'none' || form.recurrenceUntil === '' ? null : form.recurrenceUntil,
    location: form.location,
    notes: form.notes,
  };
}

async function save(): Promise<void> {
  if (form.startDate === '' || form.endDate === '') {
    errors.value = { start: 'Escolha a data' };
    return;
  }
  isSaving.value = true;
  errors.value = {};
  try {
    if (props.event === null) await api<EventDto>('POST', '/api/events', buildInput());
    else await api<EventDto>('PATCH', `/api/events/${props.event.id}`, buildInput());
    showToast(props.event === null ? 'Evento criado' : 'Evento atualizado');
    emit('saved');
    emit('close');
  } catch (error) {
    if (error instanceof ApiError && error.code === 'invalid_input') errors.value = error.fields;
    else showToast(errorMessage(error), 'error');
  } finally {
    isSaving.value = false;
  }
}

async function remove(): Promise<void> {
  if (props.event === null) return;
  if (!isConfirmingDelete.value) {
    isConfirmingDelete.value = true;
    return;
  }
  isSaving.value = true;
  try {
    await api<null>('DELETE', `/api/events/${props.event.id}`);
    showToast('Evento excluído');
    emit('saved');
    emit('close');
  } catch (error) {
    showToast(errorMessage(error), 'error');
  } finally {
    isSaving.value = false;
  }
}

async function loadComments(eventId: string): Promise<void> {
  try {
    comments.value = await api<CommentDto[]>('GET', `/api/events/${eventId}/comments`);
  } catch (error) {
    showToast(errorMessage(error), 'error');
  }
}

async function sendComment(): Promise<void> {
  const event = props.event;
  if (event === null || newComment.value.trim() === '') return;
  isSendingComment.value = true;
  try {
    const comment = await api<CommentDto>('POST', `/api/events/${event.id}/comments`, { body: newComment.value });
    comments.value = [...comments.value, comment];
    newComment.value = '';
  } catch (error) {
    showToast(errorMessage(error), 'error');
  } finally {
    isSendingComment.value = false;
  }
}

function commentColor(comment: CommentDto): string {
  const author = comment.memberId === null ? undefined : member(comment.memberId);
  return author === undefined ? 'var(--ink-3)' : memberColorVar(author.color);
}

const commentTime = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <BaseDialog :open="open" :title="title" @close="emit('close')">
    <form id="event-form" class="form" novalidate @submit.prevent="save">
      <div class="field">
        <label class="visually-hidden" for="ev-title">Título</label>
        <input
          id="ev-title"
          v-model="form.title"
          class="input title-input display"
          placeholder="Natação do Theo"
          maxlength="120"
          autocomplete="off"
          :aria-invalid="errors.title !== undefined"
          aria-describedby="ev-title-error"
          :autofocus="event === null"
        />
        <p v-if="errors.title" id="ev-title-error" class="field-error">{{ errors.title }}</p>
      </div>

      <label class="switch-row">
        <span>Dia inteiro</span>
        <input v-model="form.allDay" type="checkbox" role="switch" class="switch" />
      </label>

      <div class="when" :class="{ 'is-all-day': form.allDay }">
        <div class="field">
          <label for="ev-start-date">{{ form.allDay ? 'De' : 'Início' }}</label>
          <input id="ev-start-date" :value="form.startDate" type="date" class="input" :aria-invalid="errors.start !== undefined" @change="onStartDateChange" />
        </div>
        <div v-if="!form.allDay" class="field">
          <label for="ev-start-time">Hora</label>
          <input id="ev-start-time" :value="form.startTime" type="time" class="input" step="300" @change="onStartTimeChange" />
        </div>
        <div class="field">
          <label for="ev-end-date">{{ form.allDay ? 'Até' : 'Fim' }}</label>
          <input id="ev-end-date" v-model="form.endDate" type="date" class="input" :aria-invalid="errors.end !== undefined" />
        </div>
        <div v-if="!form.allDay" class="field">
          <label for="ev-end-time">Hora</label>
          <input id="ev-end-time" v-model="form.endTime" type="time" class="input" step="300" />
        </div>
      </div>
      <p v-if="errors.start || errors.end" class="field-error">{{ errors.start ?? errors.end }}</p>

      <fieldset class="field">
        <legend class="field-label">Quem</legend>
        <div class="chips">
          <label v-for="m in me?.members ?? []" :key="m.id" class="chip">
            <input v-model="form.memberIds" type="checkbox" :value="m.id" class="visually-hidden" />
            <span class="dot" :style="{ background: memberColorVar(m.color) }" />
            {{ m.name }}
          </label>
        </div>
        <p v-if="errors.memberIds" class="field-error">{{ errors.memberIds }}</p>
      </fieldset>

      <fieldset class="field">
        <legend class="field-label">Repetir</legend>
        <div class="segmented">
          <label v-for="option in REPEAT_OPTIONS" :key="option.value" class="segment">
            <input v-model="form.recurrence" type="radio" name="recurrence" :value="option.value" class="visually-hidden" />
            {{ option.label }}
          </label>
        </div>
      </fieldset>

      <div v-if="form.recurrence !== 'none'" class="field">
        <label for="ev-until">Repetir até</label>
        <input id="ev-until" v-model="form.recurrenceUntil" type="date" class="input" :min="form.startDate" :aria-invalid="errors.recurrenceUntil !== undefined" />
        <p v-if="errors.recurrenceUntil" class="field-error">{{ errors.recurrenceUntil }}</p>
      </div>

      <div class="field">
        <label for="ev-location">Local</label>
        <input id="ev-location" v-model="form.location" class="input" placeholder="Clube Pinheiros" maxlength="200" />
      </div>

      <div class="field">
        <label for="ev-notes">Notas</label>
        <textarea id="ev-notes" v-model="form.notes" class="input" placeholder="Levar touca e toalha" maxlength="2000" />
      </div>
    </form>

    <section v-if="event" class="comments" aria-labelledby="comments-title">
      <h3 id="comments-title" class="label">Comentários</h3>
      <TransitionGroup tag="ul" name="comment" class="comment-list">
        <li v-for="c in comments" :key="c.id" class="comment">
          <span
            class="avatar"
            :style="{ background: commentColor(c) }"
            aria-hidden="true"
            >{{ c.authorName.charAt(0) }}</span
          >
          <div>
            <p class="comment-meta"><b>{{ c.authorName }}</b> · {{ commentTime.format(new Date(c.createdAt)) }}</p>
            <p class="comment-body">{{ c.body }}</p>
          </div>
        </li>
      </TransitionGroup>
      <form class="comment-form" @submit.prevent="sendComment">
        <label class="visually-hidden" for="ev-comment">Novo comentário</label>
        <input id="ev-comment" v-model="newComment" class="input" placeholder="Eu levo as crianças" maxlength="1000" autocomplete="off" />
        <button type="submit" class="icon-btn send" aria-label="Enviar comentário" title="Enviar comentário" :disabled="isSendingComment || newComment.trim() === ''">
          <AppIcon name="send" :size="18" />
        </button>
      </form>
    </section>

    <template #footer>
      <button v-if="event" type="button" class="btn btn-danger delete" :disabled="isSaving" @click="remove">
        <AppIcon name="trash" :size="18" />
        {{ isConfirmingDelete ? 'Confirmar exclusão' : 'Excluir' }}
      </button>
      <button type="button" class="btn btn-secondary" @click="emit('close')">Cancelar</button>
      <button type="submit" form="event-form" class="btn btn-primary" :disabled="isSaving" :aria-busy="isSaving">Salvar</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.form {
  display: grid;
  gap: var(--space-4);
}

fieldset {
  border: 0;
  padding: 0;
  min-width: 0;
}

legend {
  margin-bottom: 6px;
  padding: 0;
}

.title-input {
  height: 52px;
  font-size: 20px;
  font-weight: 600;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  cursor: pointer;
  font-weight: 500;
}

.switch {
  appearance: none;
  width: 42px;
  height: 26px;
  border-radius: var(--radius-pill);
  background: var(--line);
  position: relative;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease);
  flex: none;
}

.switch::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--ink-2);
  transition:
    transform var(--dur) var(--ease),
    background var(--dur-fast) var(--ease);
}

.switch:checked {
  background: var(--ink);
}

.switch:checked::after {
  transform: translateX(16px);
  background: var(--bg);
}

.when {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
}

.when.is-all-day {
  grid-template-columns: 1fr 1fr;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px 0 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}

.chip:hover {
  border-color: var(--ink-3);
}

.chip:has(input:checked) {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
}

.chip:has(input:focus-visible),
.segment:has(input:focus-visible) {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  background: var(--surface-2);
  padding: 4px;
  border-radius: 12px;
}

.segment {
  flex: 1 1 auto;
  text-align: center;
  min-height: 36px;
  display: grid;
  place-items: center;
  padding: 0 12px;
  border-radius: 9px;
  font-weight: 600;
  font-size: 14px;
  color: var(--ink-2);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.segment:has(input:checked) {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-1);
}

.comments {
  border-top: 1px solid var(--line);
  padding-top: var(--space-4);
  display: grid;
  gap: var(--space-3);
}

.comment-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: var(--space-3);
}

.comment {
  display: flex;
  gap: 10px;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: var(--on-member);
  display: grid;
  place-items: center;
  font: 700 13px var(--font-display);
  flex: none;
}

.comment-meta {
  font-size: 13px;
  color: var(--ink-3);
}

.comment-meta b {
  color: var(--ink);
  font-weight: 600;
}

.comment-body {
  overflow-wrap: anywhere;
}

.comment-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.send {
  background: var(--ink);
  color: var(--bg);
  width: 44px;
  height: 44px;
}

.send:hover:not(:disabled) {
  background: var(--ink-2);
}

.delete {
  margin-right: auto;
  padding: 0 14px;
}

.comment-enter-active {
  transition:
    opacity var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}

.comment-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 720px) {
  .delete {
    margin-right: 0;
  }
}
</style>
