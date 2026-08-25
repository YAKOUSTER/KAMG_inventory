import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { canUseMemberSpace, homePath } from '@/domain/memberAccount'
import DashboardView from '@/views/DashboardView.vue'
import InventoryView from '@/views/InventoryView.vue'
import LoansView from '@/views/LoansView.vue'
import LoanDetailView from '@/views/LoanDetailView.vue'
import PeopleView from '@/views/PeopleView.vue'
import CartView from '@/views/CartView.vue'
import LoginView from '@/views/LoginView.vue'

const routes = [
  { path: '/connexion', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/inscription', name: 'signup', component: () => import('@/views/SignupView.vue'), meta: { public: true } },
  {
    path: '/mot-de-passe-oublie',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/nouveau-mot-de-passe',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/espace-membre',
    name: 'member-space',
    component: () => import('@/views/MemberSpaceView.vue'),
    meta: { member: true, publicLayout: 'member' },
  },
  { path: '/', name: 'dashboard', component: DashboardView, meta: { permission: 'items.read' } },
  { path: '/inventaire', name: 'inventory', component: InventoryView, meta: { permission: 'items.read' } },
  { path: '/pieces/nouvelle', name: 'item-create', component: () => import('@/views/ItemEditView.vue'), meta: { permission: 'items.create' } },
  { path: '/pieces/:id', name: 'item-detail', component: () => import('@/views/ItemDetailView.vue'), props: true, meta: { permission: 'items.read' } },
  { path: '/pieces/:id/modifier', name: 'item-edit', component: () => import('@/views/ItemEditView.vue'), props: true, meta: { permission: 'items.update' } },
  { path: '/emprunts', name: 'loans', component: LoansView, meta: { permission: 'loans.read' } },
  { path: '/emprunts/:id', name: 'loan-detail', component: LoanDetailView, props: true, meta: { permission: 'loans.read' } },
  { path: '/panier', name: 'cart', component: CartView, meta: { permission: 'loans.write' } },
  { path: '/personnes', name: 'people', component: PeopleView, meta: { permission: 'people.read' } },
  {
    path: '/a-ranger',
    name: 'member-placement',
    component: () => import('@/views/MemberPlacementView.vue'),
    meta: { permission: 'people.write' },
  },
  { path: '/personnes/nouvelle', name: 'person-create', component: () => import('@/views/PersonEditView.vue'), meta: { permission: 'people.write' } },
  { path: '/personnes/:id', name: 'person-detail', component: () => import('@/views/PersonDetailView.vue'), props: true, meta: { permission: 'people.read' } },
  { path: '/personnes/:id/modifier', name: 'person-edit', component: () => import('@/views/PersonEditView.vue'), props: true, meta: { permission: 'people.write' } },
  { path: '/agenda', name: 'agenda', component: () => import('@/views/AgendaView.vue'), meta: { permission: 'agenda.read' } },
  { path: '/agenda/nouveau', name: 'event-create', component: () => import('@/views/EventEditView.vue'), meta: { permission: 'agenda.write' } },
  { path: '/agenda/:id/modifier', name: 'event-edit', component: () => import('@/views/EventEditView.vue'), props: true, meta: { permission: 'agenda.write' } },
  { path: '/contenus', name: 'contents', component: () => import('@/views/ContentsView.vue'), meta: { permission: 'content.read' } },
  { path: '/contenus/nouveau', name: 'content-create', component: () => import('@/views/ContentEditView.vue'), meta: { permission: 'content.write' } },
  { path: '/contenus/:id/modifier', name: 'content-edit', component: () => import('@/views/ContentEditView.vue'), props: true, meta: { permission: 'content.write' } },
  { path: '/utilisateurs', name: 'users', component: () => import('@/views/UsersView.vue'), meta: { permission: 'users.manage' } },
  { path: '/parametres', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { permission: 'settings.manage' } },
  { path: '/journal', name: 'audit', component: () => import('@/views/AuditView.vue'), meta: { permission: 'audit.read' } },
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
    if (to.name === 'login' || to.name === 'signup') {
      await auth.hydrate()
      if (auth.user && canUseMemberSpace(auth.user)) {
        return { path: to.query.redirect || homePath(auth.user) }
      }
    }
    return true
  }
  await auth.hydrate()
  if (!auth.user || !canUseMemberSpace(auth.user)) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.member) return true
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { path: homePath(auth.user) }
  }
  return true
})

export default router
