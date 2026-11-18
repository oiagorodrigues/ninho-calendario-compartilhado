import { createRouter, createWebHistory, type RouteLocationRaw } from 'vue-router';
import { loadSession, useSession } from './lib/session.ts';
import { showToast } from './lib/toast.ts';

type Access = 'guest' | 'no-family' | 'family';

declare module 'vue-router' {
  interface RouteMeta {
    access?: Access;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/CalendarView.vue'), meta: { access: 'family' } },
    { path: '/familia', component: () => import('./views/FamilyView.vue'), meta: { access: 'family' } },
    { path: '/entrar', component: () => import('./views/LoginView.vue'), meta: { access: 'guest' } },
    { path: '/criar-conta', component: () => import('./views/SignupView.vue'), meta: { access: 'guest' } },
    { path: '/comecar', component: () => import('./views/OnboardingView.vue'), meta: { access: 'no-family' } },
    {
      path: '/convite/:code',
      redirect: (to) => {
        const code = String(to.params.code);
        const { me } = useSession();
        if (me.value === null) return { path: '/criar-conta', query: { convite: code } };
        if (me.value.family === null) return { path: '/comecar', query: { convite: code } };
        showToast('Você já faz parte de uma família.');
        return '/';
      },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to): Promise<RouteLocationRaw | true> => {
  const { me, isLoaded } = useSession();
  if (!isLoaded.value) await loadSession();
  const access = to.meta.access;
  if (access === undefined) return true;
  const state: Access = me.value === null ? 'guest' : me.value.family === null ? 'no-family' : 'family';
  if (access === state) return true;
  if (state === 'guest') return { path: '/entrar', query: to.fullPath === '/' ? {} : { next: to.fullPath } };
  if (state === 'no-family') return { path: '/comecar', query: to.query };
  return '/';
});
