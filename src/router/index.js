import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
  { path: '/inventaire', name: 'inventory', component: () => import('@/views/InventoryView.vue') },
  { path: '/pieces/nouvelle', name: 'item-create', component: () => import('@/views/ItemEditView.vue') },
  { path: '/pieces/:id', name: 'item-detail', component: () => import('@/views/ItemDetailView.vue'), props: true },
  { path: '/pieces/:id/modifier', name: 'item-edit', component: () => import('@/views/ItemEditView.vue'), props: true },
  { path: '/emprunts', name: 'loans', component: () => import('@/views/LoansView.vue') },
  { path: '/panier', name: 'cart', component: () => import('@/views/CartView.vue') },
  { path: '/personnes', name: 'people', component: () => import('@/views/PeopleView.vue') },
  { path: '/parametres', name: 'settings', component: () => import('@/views/SettingsView.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
