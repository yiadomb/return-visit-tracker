import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { authService } from './services/authService.js'
import { syncService } from './services/syncService.js'
import router from './router'
import App from './App.vue'
import './assets/styles/main.css'

const app = createApp(App)
app.use(router)

// Initialize the app
app.mount('#app')

// Log platform info for debugging
console.log('Platform:', Capacitor.getPlatform())
console.log('Is native platform:', Capacitor.isNativePlatform()) 

// Global: when a user signs in, initialize realtime and run a full sync
try {
  if (syncService.isReady()) {
    authService.onAuthStateChange(async (user) => {
      if (user) {
        try { syncService.init() } catch {}
        try { await syncService.syncAll() } catch {}
      }
    })
  }
} catch {}