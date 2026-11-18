<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div class="auth">
    <div class="side" aria-hidden="true">
      <span class="brand display">ninho</span>
      <div class="art">
        <i style="--c: var(--m1); --d: 0ms" />
        <i style="--c: var(--m2); --d: 80ms" />
        <i style="--c: var(--m3); --d: 160ms" />
        <i style="--c: var(--m4); --d: 240ms" />
        <i style="--c: var(--m5); --d: 320ms" />
      </div>
      <p class="display tag">A agenda da casa, num lugar só.</p>
    </div>
    <main class="panel">
      <div class="inner">
        <span class="brand display mobile-brand">ninho</span>
        <h1 class="display">{{ title }}</h1>
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100svh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.side {
  background: var(--ink);
  color: var(--bg);
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.brand {
  font-size: 28px;
  font-weight: 700;
}

.art {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  max-width: 420px;
}

.art i {
  aspect-ratio: 1 / 1.6;
  border-radius: 999px;
  background: var(--c);
  animation: rise 700ms var(--ease) backwards;
  animation-delay: var(--d);
}

.art i:nth-child(even) {
  transform: translateY(28px);
}

@keyframes rise {
  from {
    opacity: 0;
    translate: 0 24px;
  }
}

.tag {
  font-size: 34px;
  line-height: 1.1;
  font-weight: 700;
  max-width: 14ch;
}

.panel {
  display: grid;
  place-items: center;
  padding: 48px 24px;
}

.inner {
  width: min(400px, 100%);
  display: grid;
  gap: var(--space-5);
}

h1 {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.mobile-brand {
  display: none;
}

@media (max-width: 860px) {
  .auth {
    grid-template-columns: 1fr;
  }

  .side {
    display: none;
  }

  .panel {
    place-items: start center;
    padding: 32px 16px;
  }

  .mobile-brand {
    display: block;
    font-size: 24px;
    color: var(--accent);
  }
}
</style>
