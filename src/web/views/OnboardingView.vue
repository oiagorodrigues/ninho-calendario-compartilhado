<script setup lang="ts">
import { onMounted, reactive, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { MeDto } from '../../shared/schemas.ts';
import AuthLayout from '../components/AuthLayout.vue';
import { api, ApiError, errorMessage } from '../lib/api.ts';
import { logout, setSession, useSession } from '../lib/session.ts';

const router = useRouter();
const route = useRoute();
const { me } = useSession();
const form = reactive({ familyName: '', code: typeof route.query.convite === 'string' ? route.query.convite : '' });
const error = shallowRef('');
const isBusy = shallowRef(false);

async function run(action: () => Promise<MeDto>): Promise<void> {
  isBusy.value = true;
  error.value = '';
  try {
    setSession(await action());
    await router.replace('/');
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : errorMessage(e);
  } finally {
    isBusy.value = false;
  }
}

const create = () => run(() => api<MeDto>('POST', '/api/families', { name: form.familyName.trim() || `Família de ${me.value?.user.name ?? ''}` }));
const join = () => run(() => api<MeDto>('POST', '/api/families/join', { code: form.code }));

onMounted(() => {
  if (form.code !== '') void join();
});

async function leave(): Promise<void> {
  await logout();
  await router.replace('/entrar');
}
</script>

<template>
  <AuthLayout :title="`Olá, ${me?.user.name ?? ''}`">
    <form class="block card" @submit.prevent="join">
      <h2 class="display">Entrar numa família</h2>
      <div class="field">
        <label for="ob-code">Código de convite</label>
        <input id="ob-code" v-model="form.code" class="input code" placeholder="K7QM-42XA" autocomplete="off" autocapitalize="characters" />
      </div>
      <button type="submit" class="btn btn-primary" :disabled="isBusy || form.code.trim().length < 4">Entrar</button>
    </form>
    <form class="block card" @submit.prevent="create">
      <h2 class="display">Ou começar a sua</h2>
      <div class="field">
        <label for="ob-family">Nome da família</label>
        <input id="ob-family" v-model="form.familyName" class="input" placeholder="Família Andrade" maxlength="60" />
      </div>
      <button type="submit" class="btn btn-secondary" :disabled="isBusy">Criar família</button>
    </form>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <button type="button" class="btn btn-secondary out" @click="leave">Sair</button>
  </AuthLayout>
</template>

<style scoped>
.block {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
}

.block h2 {
  font-size: 20px;
  font-weight: 700;
}

.code {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.out {
  justify-self: start;
  background: none;
  padding: 0;
  height: auto;
  color: var(--ink-3);
}
</style>
