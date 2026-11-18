<script setup lang="ts">
import { reactive, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { MeDto } from '../../shared/schemas.ts';
import AuthLayout from '../components/AuthLayout.vue';
import { api, ApiError, errorMessage } from '../lib/api.ts';
import { setSession } from '../lib/session.ts';

const router = useRouter();
const route = useRoute();
const form = reactive({ email: '', password: '' });
const error = shallowRef('');
const isBusy = shallowRef(false);

async function submit(): Promise<void> {
  isBusy.value = true;
  error.value = '';
  try {
    setSession(await api<MeDto>('POST', '/api/auth/login', form));
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/';
    await router.replace(next);
  } catch (e) {
    if (e instanceof ApiError) error.value = e.message;
    else error.value = errorMessage(e);
  } finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Entrar">
    <form class="form" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="login-email">E-mail</label>
        <input id="login-email" v-model="form.email" class="input" type="email" autocomplete="email" placeholder="ana@exemplo.com" required />
      </div>
      <div class="field">
        <label for="login-password">Senha</label>
        <input id="login-password" v-model="form.password" class="input" type="password" autocomplete="current-password" required />
      </div>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn-primary" :disabled="isBusy" :aria-busy="isBusy">Entrar</button>
    </form>
    <p class="alt">Primeira vez? <RouterLink :to="{ path: '/criar-conta', query: route.query }">Criar conta</RouterLink></p>
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
