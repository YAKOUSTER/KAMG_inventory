import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/connexion', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { permission: 'items.read' } },
  { path: '/inventaire', name: 'inventory', component: () => import('@/views/InventoryView.vue'), meta: { permission: 'items.read' } },
  { path: '/pieces/nouvelle', name: 'item-create', component: () => import('@/views/ItemEditView.vue'), meta: { permission: 'items.create' } },
  { path: '/pieces/:id', name: 'item-detail', component: () => import('@/views/ItemDetailView.vue'), props: true, meta: { permission: 'items.read' } },
  { path: '/pieces/:id/modifier', name: 'item-edit', component: () => import('@/views/ItemEditView.vue'), props: true, meta: { permission: 'items.update' } },
  { path: '/emprunts', name: 'loans', component: () => import('@/views/LoansView.vue'), meta: { permission: 'loans.read' } },
  { path: '/emprunts/:id', name: 'loan-detail', component: () => import('@/views/LoanDetailView.vue'), props: true, meta: { permission: 'loans.read' } },
  { path: '/panier', name: 'cart', component: () => import('@/views/CartView.vue'), meta: { permission: 'loans.write' } },
  { path: '/personnes', name: 'people', component: () => import('@/views/PeopleView.vue'), meta: { permission: 'people.read' } },
  { path: '/personnes/nouvelle', name: 'person-create', component: () => import('@/views/PersonEditView.vue'), meta: { permission: 'people.write' } },
  { path: '/personnes/:id', name: 'person-detail', component: () => import('@/views/PersonDetailView.vue'), props: true, meta: { permission: 'people.read' } },
  { path: '/personnes/:id/modifier', name: 'person-edit', component: () => import('@/views/PersonEditView.vue'), props: true, meta: { permission: 'people.write' } },
  { path: '/utilisateurs', name: 'users', component: () => import('@/views/UsersView.vue'), meta: { permission: 'users.manage' } },
  { path: '/parametres', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { permission: 'settings.manage' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (to.name === 'login') {
      await auth.hydrate()
      if (auth.user) return { path: to.query.redirect || '/' }
    }
    return true
  }
  await auth.hydrate()
  if (!auth.user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
