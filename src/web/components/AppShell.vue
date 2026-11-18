<script setup lang="ts">
import { useRouter } from 'vue-router';
import { errorMessage } from '../lib/api.ts';
import { logout, useSession } from '../lib/session.ts';
import { showToast } from '../lib/toast.ts';
import AppIcon from './AppIcon.vue';

const { me } = useSession();
const router = useRouter();

async function onLogout(): Promise<void> {
  try {
    await logout();
    await router.push('/entrar');
  } catch (error) {
    showToast(errorMessage(error), 'error');
  }
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <RouterLink to="/" class="brand display" aria-label="Ninho, início">
        <span class="mark" aria-hidden="true"><i /><i /><i /></span>ninho
      </RouterLink>
      <slot name="sidebar" />
      <nav class="nav" aria-label="Seções">
        <RouterLink to="/" class="nav-link" exact-active-class="active"><AppIcon name="calendar" :size="18" />Calendário</RouterLink>
        <RouterLink to="/familia" class="nav-link" active-class="active"><AppIcon name="users" :size="18" />{{ me?.family?.name ?? 'Família' }}</RouterLink>
      </nav>
      <div class="account">
        <span class="who">{{ me?.user.name }}</span>
        <button type="button" class="icon-btn" aria-label="Sair" title="Sair" @click="onLogout"><AppIcon name="logout" :size="18" /></button>
      </div>
    </aside>
    <main class="main">
      <slot />
    </main>
    <nav class="tabbar" aria-label="Seções">
      <RouterLink to="/" class="tab" exact-active-class="active"><AppIcon name="calendar" :size="22" />Calendário</RouterLink>
      <RouterLink to="/familia" class="tab" active-class="active"><AppIcon name="users" :size="22" />Família</RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.shell {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--gutter);
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  gap: var(--space-5);
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100svh;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-5) 0;
  overflow-y: auto;
}

.brand {
  font-size: 26px;
  font-weight: 700;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 4px;
}

.mark {
  position: relative;
  width: 28px;
  height: 24px;
}

.mark i {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.mark i:nth-child(1) {
  left: 0;
  bottom: 0;
  background: var(--m1);
}

.mark i:nth-child(2) {
  left: 13px;
  bottom: 0;
  background: var(--m2);
}

.mark i:nth-child(3) {
  left: 6.5px;
  top: 0;
  background: var(--m3);
}

.nav {
  display: grid;
  gap: 2px;
  margin-top: auto;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 10px;
  border-radius: 10px;
  text-decoration: none;
  color: var(--ink-2);
  font-weight: 500;
  transition: background var(--dur-fast) var(--ease);
}

.nav-link:hover {
  background: var(--surface-2);
}

.nav-link.active {
  color: var(--ink);
  background: var(--surface-2);
  font-weight: 600;
}

.account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--line);
  padding: 12px 0 0 10px;
}

.who {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main {
  min-width: 0;
  padding-bottom: var(--space-6);
}

.tabbar {
  display: none;
}

@media (max-width: 1080px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .main {
    padding-bottom: calc(96px + env(safe-area-inset-bottom));
  }

  .tabbar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    justify-content: space-around;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    background: color-mix(in oklab, var(--surface) 88%, transparent);
    backdrop-filter: blur(14px);
    border-top: 1px solid var(--line);
  }

  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 96px;
    min-height: 52px;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    color: var(--ink-3);
    border-radius: 12px;
    transition: color var(--dur-fast) var(--ease);
  }

  .tab.active {
    color: var(--accent);
  }
}
</style>
