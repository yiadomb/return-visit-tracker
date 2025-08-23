<template>
  <div class="login-view">
    <h2>Sign in</h2>
    <form @submit.prevent="submit">
      <input v-model="email" type="email" placeholder="email" autocomplete="email" required />
      <input v-model="password" type="password" placeholder="password" autocomplete="current-password" required />
      <button type="submit" :disabled="loading">{{ loading ? 'Signing in...' : 'Sign in' }}</button>
    </form>
    <p class="hint">No account? Enter email & password and we’ll create one.</p>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
import { ref } from 'vue'
import { authService } from '../services/authService.js'

export default {
  name: 'LoginView',
  setup() {
    const email = ref('')
    const password = ref('')
    const loading = ref(false)
    const error = ref('')

    const submit = async () => {
      error.value = ''
      loading.value = true
      try {
        try {
          await authService.signIn(email.value, password.value)
        } catch {
          await authService.signUp(email.value, password.value)
        }
        window.location.replace('/')
      } catch (e) {
        error.value = e?.message || 'Sign in failed'
      } finally {
        loading.value = false
      }
    }

    return { email, password, loading, error, submit }
  }
}
</script>

<style scoped>
.login-view { max-width: 360px; margin: 4rem auto; display: flex; flex-direction: column; gap: 0.75rem; }
input { padding: 0.6rem 0.75rem; border: 1px solid var(--border-color,#ddd); border-radius: 6px; }
button { padding: 0.6rem 0.75rem; border-radius: 6px; border: 1px solid var(--primary-color,#3498db); background: var(--primary-color,#3498db); color: #fff; }
.error { color: #e74c3c; }
.hint { color: #666; font-size: 0.9rem; }
</style>


