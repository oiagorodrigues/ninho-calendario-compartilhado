<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue';
import { MEMBER_COLORS, type MemberColor } from '../../shared/constants.ts';
import type { MeDto, MemberDto } from '../../shared/schemas.ts';
import AppIcon from '../components/AppIcon.vue';
import AppShell from '../components/AppShell.vue';
import BaseDialog from '../components/BaseDialog.vue';
import { api, ApiError, errorMessage } from '../lib/api.ts';
import { memberColorVar } from '../lib/members.ts';
import { loadSession, setSession, useSession } from '../lib/session.ts';
import { showToast } from '../lib/toast.ts';

const { me, isAdmin } = useSession();

const prettyCode = computed(() => {
  const code = me.value?.family?.inviteCode ?? '';
  return `${code.slice(0, 4)}-${code.slice(4)}`;
});
const inviteLink = computed(() => `${window.location.origin}/convite/${me.value?.family?.inviteCode ?? ''}`);
const webcalLink = computed(() => me.value?.calendarFeedUrl?.replace(/^https?:/, 'webcal:') ?? '');

async function copy(text: string, done: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showToast(done);
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    showToast('Não deu para copiar. Selecione o texto e copie manualmente.', 'error');
  }
}

const isRotating = shallowRef(false);
async function rotate(): Promise<void> {
  isRotating.value = true;
  try {
    await api<{ inviteCode: string }>('POST', '/api/family/invite');
    await loadSession();
    showToast('Código novo gerado. O antigo parou de funcionar.');
  } catch (error) {
    showToast(errorMessage(error), 'error');
  } finally {
    isRotating.value = false;
  }
}

// Family name
const isRenaming = shallowRef(false);
const familyName = shallowRef('');
function startRename(): void {
  familyName.value = me.value?.family?.name ?? '';
  isRenaming.value = true;
}
async function saveName(): Promise<void> {
  try {
    setSession(await api<MeDto>('PATCH', '/api/family', { name: familyName.value }));
    isRenaming.value = false;
  } catch (error) {
    showToast(errorMessage(error), 'error');
  }
}

// Member dialog: add or edit
const dialog = reactive({
  open: false,
  member: null as MemberDto | null,
  name: '',
  color: 'm1' as MemberColor,
  error: '',
  isBusy: false,
  isConfirmingRemove: false,
});

const canEdit = (m: MemberDto) => isAdmin.value || m.id === me.value?.member?.id;
const canRemove = computed(() => dialog.member !== null && isAdmin.value && dialog.member.id !== me.value?.member?.id);

function openMember(m: MemberDto | null): void {
  const used = new Set((me.value?.members ?? []).map((x) => x.color));
  Object.assign(dialog, {
    open: true,
    member: m,
    name: m?.name ?? '',
    color: m?.color ?? MEMBER_COLORS.find((c) => !used.has(c)) ?? 'm1',
    error: '',
    isBusy: false,
    isConfirmingRemove: false,
  });
}

async function saveMember(): Promise<void> {
  dialog.isBusy = true;
  dialog.error = '';
  try {
    const body = { name: dialog.name, color: dialog.color };
    if (dialog.member === null) await api<MemberDto>('POST', '/api/members', body);
    else await api<MemberDto>('PATCH', `/api/members/${dialog.member.id}`, body);
    await loadSession();
    dialog.open = false;
  } catch (error) {
    dialog.error = error instanceof ApiError ? error.message : errorMessage(error);
  } finally {
    dialog.isBusy = false;
  }
}

async function removeMember(): Promise<void> {
  if (dialog.member === null) return;
  if (!dialog.isConfirmingRemove) {
    dialog.isConfirmingRemove = true;
    return;
  }
  dialog.isBusy = true;
  try {
    await api<null>('DELETE', `/api/members/${dialog.member.id}`);
    await loadSession();
    showToast(`${dialog.member.name} saiu da família`);
    dialog.open = false;
  } catch (error) {
    dialog.error = error instanceof ApiError ? error.message : errorMessage(error);
  } finally {
    dialog.isBusy = false;
  }
}

function roleLabel(m: MemberDto): string {
  if (m.role === 'admin') return 'Administra';
  return m.hasAccount ? 'Tem conta' : 'Perfil sem conta';
}
</script>

<template>
  <AppShell>
    <header class="bar">
      <h1 v-if="!isRenaming" class="display title">{{ me?.family?.name }}</h1>
      <form v-else class="rename" @submit.prevent="saveName">
        <label class="visually-hidden" for="family-name">Nome da família</label>
        <input id="family-name" v-model="familyName" class="input display" maxlength="60" autofocus />
        <button type="button" class="btn btn-secondary" @click="isRenaming = false">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </form>
      <button v-if="isAdmin && !isRenaming" type="button" class="icon-btn" aria-label="Renomear família" title="Renomear família" @click="startRename">
        <AppIcon name="edit" :size="18" />
      </button>
    </header>

    <div class="layout">
      <section class="card members" aria-labelledby="members-title">
        <div class="section-head">
          <h2 id="members-title" class="display">Pessoas</h2>
          <button v-if="isAdmin" type="button" class="btn btn-ink small" @click="openMember(null)"><AppIcon name="plus" :size="16" />Adicionar</button>
        </div>
        <TransitionGroup tag="ul" name="row" class="list">
          <li v-for="m in me?.members ?? []" :key="m.id" class="row">
            <span class="avatar display" :style="{ background: memberColorVar(m.color) }" aria-hidden="true">{{ m.name.charAt(0) }}</span>
            <span class="meta">
              <b>{{ m.name }}<span v-if="m.id === me?.member?.id" class="you"> · você</span></b>
              <span>{{ roleLabel(m) }}</span>
            </span>
            <button v-if="canEdit(m)" type="button" class="icon-btn" :aria-label="`Editar ${m.name}`" :title="`Editar ${m.name}`" @click="openMember(m)">
              <AppIcon name="edit" :size="18" />
            </button>
          </li>
        </TransitionGroup>
      </section>

      <div class="side">
        <section class="card block" aria-labelledby="invite-title">
          <h2 id="invite-title" class="display">Convidar</h2>
          <p class="muted">Quem entrar com o código vê e edita a agenda da família.</p>
          <output class="code display" aria-label="Código de convite">{{ prettyCode }}</output>
          <div class="actions">
            <button type="button" class="btn btn-primary" @click="copy(inviteLink, 'Link de convite copiado')"><AppIcon name="link" :size="18" />Copiar link</button>
            <button v-if="isAdmin" type="button" class="btn btn-secondary" :disabled="isRotating" :aria-busy="isRotating" @click="rotate">
              <AppIcon name="refresh" :size="18" />Gerar novo código
            </button>
          </div>
        </section>

        <section class="card block" aria-labelledby="feed-title">
          <h2 id="feed-title" class="display">No seu celular</h2>
          <p class="muted">Assine a agenda da família no Google Agenda, Apple Calendário ou Outlook.</p>
          <div class="actions">
            <a class="btn btn-secondary" :href="webcalLink"><AppIcon name="calendar" :size="18" />Assinar agenda</a>
            <button type="button" class="btn btn-secondary" @click="copy(me?.calendarFeedUrl ?? '', 'Endereço da agenda copiado')"><AppIcon name="copy" :size="18" />Copiar endereço</button>
          </div>
        </section>
      </div>
    </div>

    <BaseDialog :open="dialog.open" :title="dialog.member ? `Editar ${dialog.member.name}` : 'Adicionar pessoa'" @close="dialog.open = false">
      <form id="member-form" class="member-form" @submit.prevent="saveMember">
        <div class="field">
          <label for="member-name">Nome</label>
          <input id="member-name" v-model="dialog.name" class="input" maxlength="60" placeholder="Theo" autocomplete="off" />
        </div>
        <fieldset class="field">
          <legend class="field-label">Cor</legend>
          <div class="swatches">
            <label v-for="c in MEMBER_COLORS" :key="c" class="swatch" :style="{ background: memberColorVar(c) }">
              <input v-model="dialog.color" type="radio" name="member-color" :value="c" class="visually-hidden" :aria-label="`Cor ${c.slice(1)}`" />
              <AppIcon v-if="dialog.color === c" name="check" :size="18" />
            </label>
          </div>
        </fieldset>
        <p v-if="dialog.error" class="field-error" role="alert">{{ dialog.error }}</p>
      </form>
      <template #footer>
        <button v-if="canRemove" type="button" class="btn btn-danger remove" :disabled="dialog.isBusy" @click="removeMember">
          <AppIcon name="trash" :size="18" />{{ dialog.isConfirmingRemove ? 'Confirmar remoção' : 'Remover' }}
        </button>
        <button type="button" class="btn btn-secondary" @click="dialog.open = false">Cancelar</button>
        <button type="submit" form="member-form" class="btn btn-primary" :disabled="dialog.isBusy || dialog.name.trim() === ''" :aria-busy="dialog.isBusy">Salvar</button>
      </template>
    </BaseDialog>
  </AppShell>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 84px;
  padding: var(--space-3) 0;
}

.title {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.rename {
  display: flex;
  gap: var(--space-2);
  flex: 1;
  flex-wrap: wrap;
}

.rename .input {
  flex: 1 1 240px;
  font-size: 22px;
  font-weight: 700;
  height: 52px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: var(--space-5);
  align-items: start;
}

.members,
.block {
  padding: var(--space-5);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

h2.display {
  font-size: 22px;
  font-weight: 700;
}

.small {
  height: 38px;
  padding: 0 14px;
  font-size: 14px;
}

.list {
  list-style: none;
  padding: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--on-member);
  font-weight: 700;
  font-size: 17px;
  flex: none;
}

.meta {
  flex: 1;
  min-width: 0;
  display: grid;
}

.meta b {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.meta > span,
.you {
  font-size: 13px;
  color: var(--ink-3);
  font-weight: 400;
}

.side {
  display: grid;
  gap: var(--space-5);
}

.block {
  display: grid;
  gap: var(--space-3);
}

.muted {
  color: var(--ink-2);
}

.code {
  display: block;
  font-size: 38px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-align: center;
  padding: 18px 8px;
  border-radius: var(--radius-m);
  background: var(--bg);
  border: 1px dashed var(--line);
  user-select: all;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

a.btn {
  text-decoration: none;
}

.member-form {
  display: grid;
  gap: var(--space-4);
}

fieldset {
  border: 0;
  padding: 0;
}

legend {
  margin-bottom: 6px;
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.swatch {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--on-member);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease);
}

.swatch:hover {
  transform: scale(1.06);
}

.swatch:has(input:focus-visible) {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}

.remove {
  margin-right: auto;
  padding: 0 14px;
}

.row-enter-active,
.row-leave-active {
  transition:
    opacity var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}

.row-enter-from,
.row-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@media (max-width: 1080px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .title {
    font-size: 30px;
  }

  .members,
  .block {
    padding: var(--space-4);
  }

  .actions {
    flex-direction: column;
  }

  .actions .btn {
    width: 100%;
  }

  .code {
    font-size: 30px;
  }

  .rename .btn {
    flex: 1;
  }

  .remove {
    margin-right: 0;
  }
}
</style>
