import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AgendaView from '../views/AgendaView.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: {
      title: 'Contact Grid'
    }
  },
  {
    path: '/agenda',
    name: 'Agenda',
    component: AgendaView,
    meta: {
      title: 'Today\'s Agenda'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 