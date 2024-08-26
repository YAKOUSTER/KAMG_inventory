import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue'; // Mise à jour du chemin
import Cart from '../views/Cart.vue'; // Mise à jour du chemin
import CostumeDetail from '../views/CostumeDetail.vue';
import LoanDetails from '../views/LoanDetails.vue'; // Chemin vers le composant LoanDetails


const routes = [
  { path: '/', name: 'HomePage', component: HomePage },
  { path: '/cart', name: 'Cart', component: Cart },
  { path: '/loan-details', name: 'LoanDetails', component: LoanDetails},
  { path: '/costumes/:id', name: 'CostumeDetail', component: CostumeDetail, props: true }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
