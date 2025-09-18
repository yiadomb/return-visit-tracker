<template>
  <div class="auth-callback-view">
    <div class="callback-container">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <h3>Completing sign in...</h3>
        <p>Please wait while we finish setting up your account.</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <div class="error-icon">❌</div>
        <h3>Sign in failed</h3>
        <p>{{ error }}</p>
        <button @click="goHome" class="btn-primary">Try Again</button>
      </div>
      
      <div v-else class="success-state">
        <div class="success-icon">✅</div>
        <h3>Welcome!</h3>
        <p>You're now signed in and your data will sync across devices.</p>
        <button @click="goHome" class="btn-primary">Continue</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/authService'

export default {
  name: 'AuthCallbackView',
  setup() {
    const router = useRouter()
    const loading = ref(true)
    const error = ref('')
    
    const goHome = () => {
      router.push('/')
    }
    
    onMounted(async () => {
      try {
        // Wait a moment for Supabase to process the OAuth callback
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if user is now authenticated
        const user = await authService.getUser()
        if (!user) {
          throw new Error('Authentication was not completed. Please try again.')
        }
        
        // Success! Wait another moment to show success state
        loading.value = false
        setTimeout(() => {
          router.push('/')
        }, 2000)
        
      } catch (e) {
        loading.value = false
        error.value = e.message || 'Something went wrong during sign in'
      }
    })
    
    return {
      loading,
      error,
      goHome
    }
  }
}
</script>

<style scoped>
.auth-callback-view {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background-color);
}

.callback-container {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
}

.loading-state,
.error-state,
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.success-icon {
  font-size: 3rem;
}

.error-state h3 {
  color: #e74c3c;
}

.success-state h3 {
  color: var(--primary-color);
}

.error-state p {
  color: #666;
}

.success-state p {
  color: #666;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>
