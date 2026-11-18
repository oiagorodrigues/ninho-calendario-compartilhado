<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { MeDto } from '../../shared/schemas.ts';
import AuthLayout from '../components/AuthLayout.vue';
import { api, ApiError, errorMessage } from '../lib/api.ts';
import { setSession } from '../lib/session.ts';

const router = useRouter();
const route = useRoute();
const inviteCode = computed(() => (typeof route.query.convite === 'string' ? route.query.convite : ''));
const invitedTo = shallowRef('');
const form = reactive({ name: '', email: '', password: '', familyName: '' });
const errors = shallowRef<Record<string, string>>({});
const formError = shallowRef('');
const isBusy = shallowRef(false);

onMounted(async () => {
  if (inviteCode.value === '') return;
  try {
    invitedTo.value = (await api<{ familyName: string }>('GET', `/api/invites/${encodeURIComponent(inviteCode.value)}`)).familyName;
  } catch (e) {
    formError.value = e instanceof ApiError ? 'Este convite não vale mais. Peça um novo link para a família.' : errorMessage(e);
  }
});

async function submit(): Promise<void> {
  isBusy.value = true;
  errors.value = {};
  formError.value = '';
  try {
    const body = {
      name: form.name,
      email: form.email,
      password: form.password,
      ...(inviteCode.value !== '' ? { inviteCode: inviteCode.value } : { familyName: form.familyName.trim() || `Família de ${form.name.trim()}` }),
    };
    setSession(await api<MeDto>('POST', '/api/auth/signup', body));
    await router.replace('/');
  } catch (e) {
    if (e instanceof ApiError && Object.keys(e.fields).length > 0) errors.value = e.fields;
    else formError.value = e instanceof ApiError ? e.message : errorMessage(e);
  } finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <AuthLayout :title="invitedTo ? `Entrar na ${invitedTo}` : 'Criar conta'">
    <form class="form" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="su-name">Seu nome</label>
        <input id="su-name" v-model="form.name" class="input" autocomplete="given-name" placeholder="Ana" :aria-invalid="errors.name !== undefined" required />
        <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
      </div>
      <div class="field">
        <label for="su-email">E-mail</label>
        <input id="su-email" v-model="form.email" class="input" type="email" autocomplete="email" placeholder="ana@exemplo.com" :aria-invalid="errors.email !== undefined" required />
        <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
      </div>
      <div class="field">
        <label for="su-password">Senha</label>
        <input id="su-password" v-model="form.password" class="input" type="password" autocomplete="new-password" minlength="8" :aria-invalid="errors.password !== undefined" required />
        <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
      </div>
      <div v-if="!inviteCode" class="field">
        <label for="su-family">Nome da família</label>
        <input id="su-family" v-model="form.familyName" class="input" placeholder="Família Andrade" maxlength="60" />
      </div>
      <p v-if="formError" class="field-error" role="alert">{{ formError }}</p>
      <button type="submit" class="btn btn-primary" :disabled="isBusy" :aria-busy="isBusy">{{ inviteCode ? 'Entrar na família' : 'Criar conta' }}</button>
    </form>
    <p class="alt">Já tem conta? <RouterLink :to="{ path: '/entrar', query: route.query }">Entrar</RouterLink></p>
  </AuthLayout>
</template>

<style scoped>
.form {
  display: grid;
  gap: var(--space-4);
}

.form .btn {
  width: 100%;
  margin-top: var(--space-2);
}

.alt {
  color: var(--ink-2);
}

.alt a {
  color: var(--accent);
  font-weight: 600;
}
</style>
