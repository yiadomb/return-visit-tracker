import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AgendaView from '../views/AgendaView.vue'
import LoginView from '../views/LoginView.vue'
import SettingsView from '../views/SettingsView.vue'

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
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { title: 'Sign in' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: { title: 'Settings' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 