<template>
  <div class="settings-wrap" ref="rootRef">
    <button class="settings-btn" @click="open = !open" aria-haspopup="menu" :aria-expanded="open">
      ⚙️
    </button>
    <div v-if="open" class="settings-menu" role="menu" @click.stop>
      <h4>Settings</h4>

      <!-- Notifications -->
      <section class="section">
        <h5>Notifications</h5>
        <label class="row">
          <span>Daily reminder time</span>
          <input type="time" v-model="dailyTime" @change="saveLocal('dailyTime', dailyTime)" />
        </label>
        <label class="row">
          <span>Month‑end reminder</span>
          <input type="checkbox" v-model="monthEnd" @change="saveLocal('monthEnd', monthEnd)" />
        </label>
      </section>

      <!-- Reporting defaults -->
      <section class="section">
        <h5>Report Recipient</h5>
        <label class="row">
          <span>Number</span>
          <input type="tel" v-model="recipientPhone" @change="saveLocal('recipientPhone', recipientPhone)" placeholder="0244444444" />
        </label>
        <label class="row">
          <span>Via</span>
          <select v-model="shareChannel" @change="saveLocal('shareChannel', shareChannel)">
            <option value="auto">Auto</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </label>
        <label class="row">
          <span>Include hours by default</span>
          <input type="checkbox" v-model="includeHours" @change="saveLocal('includeHours', includeHours)" />
        </label>
      </section>

      <!-- Appearance (last but one) -->
      <section class="section">
        <h5>Appearance</h5>
        <label class="row">
          <span>Theme</span>
          <select v-model="theme" @change="applyTheme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </section>

      <!-- Account (last) -->
      <section class="section">
        <h5>Account</h5>
        <div v-if="user">
          <p class="muted">Backed up to cloud as <strong>{{ user.email }}</strong></p>
          <button class="secondary" @click="signOut" :disabled="loading">Sign out</button>
        </div>
        <div v-else>
          <button class="primary" v-if="!showLoginForm" @click="showLoginForm=true">Backup to cloud</button>
          <form v-else @submit.prevent="submit">
            <input v-model="email" type="email" placeholder="email" autocomplete="email" required />
            <input v-model="password" type="password" placeholder="password" autocomplete="current-password" required />
            <div class="row" style="justify-content:flex-end; gap:0.5rem;">
              <button type="button" class="secondary" @click="showLoginForm=false">Cancel</button>
              <button type="submit" :disabled="loading">{{ loading ? 'Working…' : 'Sign in / Create account' }}</button>
            </div>
            <p class="hint">Optional. Sign in to sync across devices.</p>
          </form>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="message" class="message">{{ message }}</p>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { authService } from '../services/authService.js'

export default {
  name: 'SettingsMenu',
  setup() {
    const open = ref(false)
    const rootRef = ref(null)
    const user = ref(null)
    const email = ref('')
    const password = ref('')
    const loading = ref(false)
    const error = ref('')
    const message = ref('')
    const showLoginForm = ref(false)

    const theme = ref(localStorage.getItem('theme') || 'light')
    const dailyTime = ref(localStorage.getItem('dailyTime') || '')
    const monthEnd = ref(localStorage.getItem('monthEnd') === 'true')
    const recipientPhone = ref(localStorage.getItem('recipientPhone') || '')
    const shareChannel = ref(localStorage.getItem('shareChannel') || 'auto')
    const includeHours = ref(localStorage.getItem('includeHours') === 'true')

    const applyTheme = () => {
      localStorage.setItem('theme', theme.value)
      document.documentElement.setAttribute('data-theme', theme.value)
    }

    const saveLocal = (k, v) => localStorage.setItem(k, String(v))

    const loadUser = async () => {
      user.value = await authService.getUser().catch(() => null)
    }

    const submit = async () => {
      error.value = ''
      message.value = ''
      loading.value = true
      try {
        try {
          await authService.signIn(email.value, password.value)
          message.value = 'Signed in.'
        } catch {
          await authService.signUp(email.value, password.value)
          message.value = 'Account created and signed in.'
        }
        await loadUser()
      } catch (e) {
        error.value = e?.message || 'Failed'
      } finally {
        loading.value = false
      }
    }

    const signOut = async () => {
      loading.value = true
      error.value = ''
      message.value = ''
      try {
        await authService.signOut()
        await loadUser()
        message.value = 'Signed out.'
      } catch (e) {
        error.value = e?.message || 'Failed to sign out'
      } finally {
        loading.value = false
      }
    }

    const onDocClick = (e) => {
      if (!open.value) return
      const r = rootRef.value
      if (r && !r.contains(e.target)) open.value = false
    }

    onMounted(() => {
      document.addEventListener('click', onDocClick)
      loadUser()
      applyTheme()
    })
    onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

    return { open, rootRef, user, email, password, loading, error, message, theme, dailyTime, monthEnd, recipientPhone, shareChannel, includeHours, submit, signOut, applyTheme, saveLocal, showLoginForm }
  }
}
</script>

<style scoped>
.settings-wrap { position: relative; }
.settings-btn { padding: 0.35rem 0.5rem; border: 1px solid var(--border-color,#ddd); background: white; border-radius: 8px; line-height: 1; }
.settings-menu { position: absolute; right: 0; margin-top: 8px; width: 320px; max-width: 86vw; background: #fff; border: 1px solid var(--border-color,#ddd); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.12); padding: 0.75rem; z-index: 2000; }
h4 { margin: 0 0 0.5rem 0; }
.section { border-top: 1px solid var(--border-color,#eee); padding-top: 0.6rem; margin-top: 0.6rem; }
.section:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin: 0.25rem 0; }
input, select { border: 1px solid var(--border-color,#ddd); border-radius: 6px; padding: 0.4rem 0.5rem; }
button.secondary { background: transparent; border: 1px solid var(--border-color,#ddd); color: inherit; }
.muted { color: #666; }
.hint { color: #666; font-size: 0.9rem; }
.error { color: #e74c3c; }
.message { color: #27ae60; }
</style>


