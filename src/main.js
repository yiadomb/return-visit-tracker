import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
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