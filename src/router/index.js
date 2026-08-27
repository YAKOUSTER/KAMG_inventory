import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { canUseMemberSpace, homePath } from '@/domain/memberAccount'
import { GESTION, LEGACY_MEMBER_PATH, MEMBER_HOME } from '@/domain/paths'
import DashboardView from '@/views/DashboardView.vue'
import InventoryView from '@/views/InventoryView.vue'
import LoansView from '@/views/LoansView.vue'
import LoanDetailView from '@/views/LoanDetailView.vue'
import PeopleView from '@/views/PeopleView.vue'
import CartView from '@/views/CartView.vue'
import LoginView from '@/views/LoginView.vue'

function keepQuery(to, path) {
  return { path, query: to.query, hash: to.hash }
}

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
    path: MEMBER_HOME,
    name: 'member-space',
    component: () => import('@/views/MemberSpaceView.vue'),
    meta: { member: true, publicLayout: 'member' },
  },
  { path: LEGACY_MEMBER_PATH, redirect: (to) => keepQuery(to, MEMBER_HOME) },
  { path: GESTION.home, name: 'dashboard', component: DashboardView, meta: { permission: 'items.read' } },
  { path: GESTION.inventory, name: 'inventory', component: InventoryView, meta: { permission: 'items.read' } },
  {
    path: GESTION.itemNew,
    name: 'item-create',
    component: () => import('@/views/ItemEditView.vue'),
    meta: { permission: 'items.create' },
  },
  {
    path: '/gestion/pieces/:id',
    name: 'item-detail',
    component: () => import('@/views/ItemDetailView.vue'),
    props: true,
    meta: { permission: 'items.read' },
  },
  {
    path: '/gestion/pieces/:id/modifier',
    name: 'item-edit',
    component: () => import('@/views/ItemEditView.vue'),
    props: true,
    meta: { permission: 'items.update' },
  },
  { path: GESTION.loans, name: 'loans', component: LoansView, meta: { permission: 'loans.read' } },
  {
    path: '/gestion/emprunts/:id',
    name: 'loan-detail',
    component: LoanDetailView,
    props: true,
    meta: { permission: 'loans.read' },
  },
  { path: GESTION.cart, name: 'cart', component: CartView, meta: { permission: 'loans.write' } },
  { path: GESTION.people, name: 'people', component: PeopleView, meta: { permission: 'people.read' } },
  {
    path: GESTION.placement,
    name: 'member-placement',
    component: () => import('@/views/MemberPlacementView.vue'),
    meta: { permission: 'people.write' },
  },
  {
    path: GESTION.personNew,
    name: 'person-create',
    component: () => import('@/views/PersonEditView.vue'),
    meta: { permission: 'people.write' },
  },
  {
    path: '/gestion/personnes/:id',
    name: 'person-detail',
    component: () => import('@/views/PersonDetailView.vue'),
    props: true,
    meta: { permission: 'people.read' },
  },
  {
    path: '/gestion/personnes/:id/modifier',
    name: 'person-edit',
    component: () => import('@/views/PersonEditView.vue'),
    props: true,
    meta: { permission: 'people.write' },
  },
  {
    path: GESTION.agenda,
    name: 'agenda',
    component: () => import('@/views/AgendaView.vue'),
    meta: { permissionAny: ['agenda.read', 'agenda.write', 'agenda.libre'] },
  },
  {
    path: GESTION.eventNew,
    name: 'event-create',
    component: () => import('@/views/EventEditView.vue'),
    meta: { permissionAny: ['agenda.write', 'agenda.libre'] },
  },
  {
    path: '/gestion/agenda/:id/modifier',
    name: 'event-edit',
    component: () => import('@/views/EventEditView.vue'),
    props: true,
    meta: { permissionAny: ['agenda.write', 'agenda.libre'] },
  },
  {
    path: GESTION.contents,
    name: 'contents',
    component: () => import('@/views/ContentsView.vue'),
    meta: { permission: 'content.read' },
  },
  {
    path: GESTION.contentNew,
    name: 'content-create',
    component: () => import('@/views/ContentEditView.vue'),
    meta: { permission: 'content.write' },
  },
  {
    path: '/gestion/contenus/:id/modifier',
    name: 'content-edit',
    component: () => import('@/views/ContentEditView.vue'),
    props: true,
    meta: { permission: 'content.write' },
  },
  {
    path: GESTION.users,
    name: 'users',
    component: () => import('@/views/UsersView.vue'),
    meta: { permission: 'users.manage' },
  },
  {
    path: GESTION.settings,
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { permission: 'settings.manage' },
  },
  {
    path: GESTION.audit,
    name: 'audit',
    component: () => import('@/views/AuditView.vue'),
    meta: { permission: 'audit.read' },
  },
  { path: '/inventaire', redirect: (to) => keepQuery(to, GESTION.inventory) },
  { path: '/pieces/nouvelle', redirect: (to) => keepQuery(to, GESTION.itemNew) },
  { path: '/pieces/:id/modifier', redirect: (to) => keepQuery(to, GESTION.itemEdit(to.params.id)) },
  { path: '/pieces/:id', redirect: (to) => keepQuery(to, GESTION.item(to.params.id)) },
  { path: '/emprunts/:id', redirect: (to) => keepQuery(to, GESTION.loan(to.params.id)) },
  { path: '/emprunts', redirect: (to) => keepQuery(to, GESTION.loans) },
  { path: '/panier', redirect: (to) => keepQuery(to, GESTION.cart) },
  { path: '/a-ranger', redirect: (to) => keepQuery(to, GESTION.placement) },
  { path: '/personnes/nouvelle', redirect: (to) => keepQuery(to, GESTION.personNew) },
  { path: '/personnes/:id/modifier', redirect: (to) => keepQuery(to, GESTION.personEdit(to.params.id)) },
  { path: '/personnes/:id', redirect: (to) => keepQuery(to, GESTION.person(to.params.id)) },
  { path: '/personnes', redirect: (to) => keepQuery(to, GESTION.people) },
  { path: '/agenda/nouveau', redirect: (to) => keepQuery(to, GESTION.eventNew) },
  { path: '/agenda/:id/modifier', redirect: (to) => keepQuery(to, GESTION.eventEdit(to.params.id)) },
  { path: '/agenda', redirect: (to) => keepQuery(to, GESTION.agenda) },
  { path: '/contenus/nouveau', redirect: (to) => keepQuery(to, GESTION.contentNew) },
  { path: '/contenus/:id/modifier', redirect: (to) => keepQuery(to, GESTION.contentEdit(to.params.id)) },
  { path: '/contenus', redirect: (to) => keepQuery(to, GESTION.contents) },
  { path: '/utilisateurs', redirect: (to) => keepQuery(to, GESTION.users) },
  { path: '/parametres', redirect: (to) => keepQuery(to, GESTION.settings) },
  { path: '/journal', redirect: (to) => keepQuery(to, GESTION.audit) },
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
  if (Array.isArray(to.meta.permissionAny) && to.meta.permissionAny.length) {
    if (!to.meta.permissionAny.some((permission) => auth.can(permission))) {
      return { path: homePath(auth.user) }
    }
    return true
  }
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { path: homePath(auth.user) }
  }
  return true
})

export default router
