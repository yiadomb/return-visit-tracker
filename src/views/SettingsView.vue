<template>
  <div class="settings-view">
    <h2>Settings</h2>

    <section class="card">
      <h3>Account</h3>
      <div v-if="user">
        <p>Signed in as <strong>{{ user.email }}</strong></p>
        <button @click="signOut" :disabled="loading">Sign out</button>
      </div>
      <div v-else>
        <form @submit.prevent="submit">
          <input v-model="email" type="email" placeholder="email" autocomplete="email" required />
          <input v-model="password" type="password" placeholder="password" autocomplete="current-password" required />
          <button type="submit" :disabled="loading">{{ loading ? 'Working...' : 'Sign in / Create account' }}</button>
        </form>
        <p class="hint">Optional. Sign in to sync your data across devices.</p>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="message" class="message">{{ message }}</p>
    </section>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { authService } from '../services/authService.js'

export default {
  name: 'SettingsView',
  setup() {
    const user = ref(null)
    const email = ref('')
    const password = ref('')
    const loading = ref(false)
    const error = ref('')
    const message = ref('')

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
          message.value = 'Signed in successfully.'
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

    onMounted(loadUser)

    return { user, email, password, loading, error, message, submit, signOut }
  }
}
</script>

<style scoped>
.settings-view { max-width: 640px; margin: 1rem auto; display: flex; flex-direction: column; gap: 1rem; }
.card { border: 1px solid var(--border-color,#ddd); border-radius: 8px; padding: 1rem; background: var(--background-color,#fff); }
input { display:block; width:100%; margin:0.3rem 0; padding:0.6rem 0.75rem; border:1px solid var(--border-color,#ddd); border-radius:6px; }
button { padding:0.6rem 0.75rem; border-radius:6px; border:1px solid var(--primary-color,#3498db); background:var(--primary-color,#3498db); color:#fff; }
.hint { color:#666; font-size:0.9rem; }
.error { color:#e74c3c; }
.message { color:#27ae60; }
</style>


