<template>
  <div class="settings-wrap" ref="rootRef">
    <button v-if="!inline" class="settings-btn" @click="open = !open" aria-haspopup="menu" :aria-expanded="open">
      ⚙️
    </button>
    <div v-if="open || inline" class="settings-menu" :class="{ inline }" role="menu" @click.stop>
      

      <!-- Notifications -->
      <section class="section">
        <h5>Notifications</h5>
        <label class="row">
          <span class="label-with-info">Set daily reminder
            <button 
              type="button" 
              class="info-btn" 
              @click="showReminderHint = !showReminderHint" 
              :aria-expanded="showReminderHint ? 'true' : 'false'" 
              aria-label="Daily reminder info"
            >ⓘ</button>
          </span>
          <input type="checkbox" v-model="dailyReminderEnabled" @change="saveLocal('dailyReminderEnabled', dailyReminderEnabled)" />
        </label>
        <div class="reminder-time-settings always">
          <div class="time-input-wrapper compact">
            <span class="time-icon">⏰</span>
            <input type="time" v-model="dailyTime" @change="saveLocal('dailyTime', dailyTime)" title="Set when you want daily reminders about your ministry work" />
            <span v-if="!dailyTime" class="time-placeholder">Time</span>
          </div>
          <div v-if="showReminderHint" class="hint tiny">Reminders work for preaching days only</div>
        </div>
      </section>

      <!-- Goals Manager (moved up under Notifications) -->
      <section class="section">
        <h5>Goals</h5>
        <div class="row">
          <span>Set monthly goals</span>
          <button class="secondary small" @click="showGoals=true">Open</button>
        </div>
      </section>

      <!-- Reporting defaults -->
      <section class="section">
        <h5>Report Details</h5>
        <label class="row">
          <span>Publisher's Name</span>
          <input type="text" v-model="publisherName" @change="saveLocal('publisherName', publisherName)" placeholder="Your name" class="compact-input" />
        </label>
        <label class="row">
          <span>Recipient's Contact</span>
          <input type="tel" v-model="recipientPhone" @change="saveLocal('recipientPhone', recipientPhone)" placeholder="0555000000" class="compact-input" />
        </label>
        <div class="via-group">
          <label class="row tight">
          <span>Via</span>
            <div class="custom-dropdown" :ref="el => viaDropdownRef = el">
              <button 
                type="button" 
                class="dropdown-trigger"
                @click="showViaDropdown = !showViaDropdown"
              >
                {{ shareChannel === 'whatsapp' ? 'WhatsApp' : 'SMS' }}
                <span class="dropdown-arrow">{{ showViaDropdown ? '▲' : '▼' }}</span>
              </button>
              <div v-if="showViaDropdown" class="dropdown-menu">
                <button 
                  type="button" 
                  class="dropdown-option"
                  :class="{ active: shareChannel === 'whatsapp' }"
                  @click="selectVia('whatsapp')"
                >
                  WhatsApp
                </button>
                <button 
                  type="button" 
                  class="dropdown-option"
                  :class="{ active: shareChannel === 'sms' }"
                  @click="selectVia('sms')"
                >
                  SMS
                </button>
              </div>
            </div>
        </label>
        </div>
        <label class="row">
          <span>Report monthly hours</span>
          <input type="checkbox" v-model="includeHours" @change="saveLocal('includeHours', includeHours)" />
        </label>
        <label class="row">
          <span class="label-with-info">Move leftover minutes to next month
            <button 
              type="button" 
              class="info-btn" 
              @click="showCarryHint = !showCarryHint" 
              :aria-expanded="showCarryHint ? 'true' : 'false'" 
              aria-label="Rounding policy info"
            >ⓘ</button>
          </span>
          <input type="checkbox" v-model="moveLeftoverToNextMonth" @change="saveLocal('moveLeftoverToNextMonth', moveLeftoverToNextMonth)" />
        </label>
        <div v-if="showCarryHint" class="hint tiny">If off: leftover minutes will be rounded to the nearest hour (≥30 up).</div>
        <label class="row">
          <span>Remind to submit report</span>
          <input type="checkbox" v-model="monthEnd" @change="saveLocal('monthEnd', monthEnd)" />
        </label>
      </section>

      <!-- Archived Contacts -->
      <section class="section">
        <h5>Archived Contacts</h5>
        <div class="row">
          <span>{{ archivedCount }} archived contacts</span>
          <button class="secondary small" @click="openArchivedModal">View</button>
        </div>
      </section>

      

      <!-- Appearance (last but one) -->
      <section class="section">
        <h5>Appearance</h5>
        <label class="row">
          <span>Theme</span>
          <div class="custom-dropdown" :ref="el => themeDropdownRef = el">
            <button 
              type="button" 
              class="dropdown-trigger"
              @click="showThemeDropdown = !showThemeDropdown"
            >
              {{ theme === 'light' ? 'Light' : 'Dark' }}
              <span class="dropdown-arrow">{{ showThemeDropdown ? '▲' : '▼' }}</span>
            </button>
            <div v-if="showThemeDropdown" class="dropdown-menu">
              <button 
                type="button" 
                class="dropdown-option"
                :class="{ active: theme === 'light' }"
                @click="selectTheme('light')"
              >
                Light
              </button>
              <button 
                type="button" 
                class="dropdown-option"
                :class="{ active: theme === 'dark' }"
                @click="selectTheme('dark')"
              >
                Dark
              </button>
            </div>
          </div>
        </label>
      </section>

      <!-- Account (last) -->
      <section class="section account-section">
        <h5>Account</h5>
        
        <!-- Signed in state -->
        <div v-if="user" class="account-card signed-in">
          <div class="account-status">
            <div class="user-avatar-section">
              <img v-if="userInfo?.avatar" :src="userInfo.avatar" :alt="userInfo.name" class="user-avatar-img" />
              <div v-else class="user-avatar-fallback">{{ userInfo?.name?.[0]?.toUpperCase() || '👤' }}</div>
            </div>
            <div class="account-info">
              <div class="account-name">{{ userInfo?.name || 'User' }}</div>
              <div class="account-email">{{ userInfo?.email }}</div>
              <div class="account-provider" v-if="userInfo?.provider === 'google'">
                <span class="provider-badge google">Google Account</span>
              </div>
              <div class="account-status-text">Cloud sync enabled</div>
            </div>
          </div>
          <button class="btn-secondary-pro" @click="signOut" :disabled="loading">
            {{ loading ? 'Signing out...' : 'Sign out' }}
          </button>
        </div>
        
        <!-- Not signed in state -->
        <div v-else class="account-card">
          <div v-if="!showLoginForm" class="account-prompt">
            <div class="cloud-icon">☁️</div>
            <div class="prompt-text">
              <div class="prompt-title">Cloud Backup</div>
              <div class="prompt-subtitle">Sync your data across devices</div>
            </div>
            <button class="btn-primary-pro" @click="showLoginForm=true">
              Get started
            </button>
          </div>
          
          <!-- Login options -->
          <div v-else class="login-form">
            <div class="form-header">
              <h6>Sign in to sync your data</h6>
              <p class="form-subtitle">Choose your preferred sign-in method</p>
            </div>
            
            <!-- Google Sign In (Primary) -->
            <button 
              @click="signInWithGoogle" 
              :disabled="loading" 
              class="google-signin-btn"
              type="button"
            >
              <div class="google-icon">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span>{{ loading ? 'Connecting...' : 'Continue with Google' }}</span>
            </button>
            
            <!-- Alternative email/password option -->
            <div class="divider">
              <span>or</span>
            </div>
            
            <button 
              type="button" 
              class="email-signin-btn" 
              @click="showEmailForm = true"
              :disabled="loading"
            >
              📧 Continue with Email
            </button>

            <!-- Email form (collapsed by default) -->
            <form v-if="showEmailForm" @submit.prevent="submitEmailPassword" class="email-form">
              <div class="field-group">
                <input 
                  v-model="email" 
                  type="email" 
                  placeholder="Email address" 
                  autocomplete="email" 
                  class="pro-input"
                  required 
                />
              </div>
              <div class="field-group">
                <div class="password-field">
                  <input 
                    v-model="password" 
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Password" 
                    autocomplete="current-password" 
                    class="pro-input password-input"
                    required 
                  />
                  <button 
                    type="button" 
                    class="password-toggle"
                    @click="showPassword = !showPassword"
                    :title="showPassword ? 'Hide password' : 'Show password'"
                  >
                    {{ showPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn-secondary-pro" @click="showEmailForm=false">
                  Back
                </button>
                <button type="submit" class="btn-primary-pro" :disabled="loading">
                  {{ loading ? 'Connecting...' : 'Continue' }}
                </button>
              </div>
              
              <p class="form-note">
                Don't have an account? We'll create one for you.
              </p>
            </form>
            
            <div class="form-actions" v-if="!showEmailForm">
              <button type="button" class="btn-secondary-pro" @click="showLoginForm=false">
                Cancel
              </button>
            </div>
            
            <p class="form-disclaimer">
              Your data stays private and secure. We only sync your contacts across your devices.
            </p>
          </div>
        </div>
        
        <!-- Status messages -->
        <div v-if="error" class="status-message error-message">
          <span class="status-icon">⚠️</span>
          {{ error }}
        </div>
        <div v-if="message" class="status-message success-message">
          <span class="status-icon">✅</span>
          {{ message }}
        </div>
      </section>
    </div>
    
    <!-- Archived Contacts Modal -->
    <div v-if="showArchivedModal" class="archived-modal-overlay" @click="showArchivedModal = false">
      <div class="archived-modal" @click.stop>
        <div class="modal-header">
          <h3>Archived Contacts</h3>
          <button class="close-btn" @click="showArchivedModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="archivedContacts.length === 0" class="empty-state">
            No archived contacts
          </div>
          <div v-else class="archived-list">
            <div v-for="contact in archivedContacts" :key="contact.id" class="archived-item">
              <div class="contact-info">
                <div class="contact-name">{{ contact.name || 'Unnamed' }}</div>
                <div class="contact-meta">{{ contact.hostel_name }} • {{ contact.bucket }}</div>
              </div>
              <button class="restore-btn" @click="restoreContact(contact.id)">Restore</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <GoalsManager :open="showGoals" @close="showGoals=false" @saved="onGoalsSaved" />
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { authService } from '../services/authService.js'
import GoalsManager from './reports/GoalsManager.vue'
import { db, contactService } from '../services/db.js'
import { notificationService } from '../services/notificationService.js'

export default {
  name: 'SettingsMenu',
  components: { GoalsManager },
  props: { inline: { type: Boolean, default: false } },
  setup(props) {
    const open = ref(props.inline)
    const rootRef = ref(null)
    const user = ref(null)
    const email = ref('')
    const password = ref('')
    const showPassword = ref(false)
    const loading = ref(false)
    const error = ref('')
    const message = ref('')
    const showLoginForm = ref(false)
    const showEmailForm = ref(false)
    const showGoals = ref(false)
    const userInfo = ref(null)
    
    // Archived contacts
    const showArchivedModal = ref(false)
    const archivedContacts = ref([])
    const archivedCount = ref(0)

    const theme = ref(localStorage.getItem('theme') || 'light')
    // Default to enabled if not set, for new users
    const dailyReminderEnabled = ref(localStorage.getItem('dailyReminderEnabled') === null ? true : localStorage.getItem('dailyReminderEnabled') === 'true')
    const dailyTime = ref(localStorage.getItem('dailyTime') || '07:00')
    const monthEnd = ref(localStorage.getItem('monthEnd') === null ? true : localStorage.getItem('monthEnd') === 'true')
    const recipientPhone = ref(localStorage.getItem('recipientPhone') || '')
    const recipientName = ref(localStorage.getItem('recipientName') || '')
    const shareChannel = ref(localStorage.getItem('shareChannel') || 'whatsapp')
    const includeHours = ref(localStorage.getItem('includeHours') === null ? true : localStorage.getItem('includeHours') === 'true')
    const moveLeftoverToNextMonth = ref(localStorage.getItem('moveLeftoverToNextMonth') === 'true')
    const publisherName = ref(localStorage.getItem('publisherName') || '')
    const showCarryHint = ref(false)
    const showReminderHint = ref(false)

    // Custom dropdown states
    const showThemeDropdown = ref(false)
    const showViaDropdown = ref(false)
    const themeDropdownRef = ref(null)
    const viaDropdownRef = ref(null)

    const applyTheme = () => {
      localStorage.setItem('theme', theme.value)
      document.documentElement.setAttribute('data-theme', theme.value)
    }

    // Custom dropdown handlers
    const selectTheme = (newTheme) => {
      theme.value = newTheme
      showThemeDropdown.value = false
      applyTheme()
    }

    const selectVia = (newChannel) => {
      shareChannel.value = newChannel
      showViaDropdown.value = false
      saveLocal('shareChannel', newChannel)
    }

    const saveLocal = (k, v) => {
      localStorage.setItem(k, String(v))
      
      // Refresh daily reminders when daily reminder settings change
      if (k === 'dailyReminderEnabled' || k === 'dailyTime') {
        notificationService.refreshDailyReminders().catch(console.error)
      }
    }

    const loadUser = async () => {
      user.value = await authService.getUser().catch(() => null)
      userInfo.value = user.value ? authService.getUserDisplayInfo(user.value) : null
    }

    const signInWithGoogle = async () => {
      error.value = ''
      message.value = ''
      loading.value = true
      try {
        await authService.signInWithGoogle()
        // Note: Google OAuth will redirect to callback page
        // loadUser will be called from the callback page
      } catch (e) {
        error.value = e?.message || 'Google sign-in failed'
        loading.value = false
      }
    }

    const submitEmailPassword = async () => {
      error.value = ''
      message.value = ''
      loading.value = true
      try {
        try {
          await authService.signIn(email.value, password.value)
          message.value = 'Signed in successfully!'
        } catch {
          await authService.signUp(email.value, password.value)
          message.value = 'Account created and signed in!'
        }
        await loadUser()
        // Hide the form after successful login
        showLoginForm.value = false
        showEmailForm.value = false
        // Clear sensitive data
        email.value = ''
        password.value = ''
      } catch (e) {
        error.value = e?.message || 'Failed to sign in'
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

      // Close custom dropdowns when clicking outside
      if (showThemeDropdown.value) {
        const themeEl = themeDropdownRef.value
        if (!themeEl || !themeEl.contains(e.target)) {
          showThemeDropdown.value = false
        }
      }

      if (showViaDropdown.value) {
        const viaEl = viaDropdownRef.value
        if (!viaEl || !viaEl.contains(e.target)) {
          showViaDropdown.value = false
        }
      }
    }

    const loadArchivedContacts = async () => {
      try {
        // Use a robust filter that does not rely on an index existing.
        // This guarantees results even on devices where the DB wasn't upgraded yet.
        const archived = await db.contacts.filter(c => c.archived === true).toArray()
        archivedContacts.value = archived
        archivedCount.value = archived.length
      } catch (error) {
        console.error('Failed to load archived contacts:', error)
      }
    }
    
    const restoreContact = async (contactId) => {
      try {
        await contactService.update(contactId, { archived: false })
        await loadArchivedContacts()
        // Trigger refresh of main contacts list
        window.dispatchEvent(new CustomEvent('rv:refresh'))
      } catch (error) {
        console.error('Failed to restore contact:', error)
      }
    }
    
    const openArchivedModal = async () => {
      await loadArchivedContacts()
      showArchivedModal.value = true
    }
    
    // Reload archived count when menu becomes visible
    watch(open, async (newVal) => {
      if (newVal) {
        await loadArchivedContacts()
      }
    })
    
    onMounted(async () => {
      // Set defaults if not already saved
      if (localStorage.getItem('dailyReminderEnabled') === null) {
        saveLocal('dailyReminderEnabled', true)
      }
      if (!localStorage.getItem('dailyTime')) {
        saveLocal('dailyTime', '07:00')
      }
      if (!localStorage.getItem('shareChannel')) {
        saveLocal('shareChannel', 'whatsapp')
      }
      if (localStorage.getItem('includeHours') === null) {
        saveLocal('includeHours', true)
      }
      if (localStorage.getItem('monthEnd') === null) {
        saveLocal('monthEnd', true)
      }
      if (localStorage.getItem('moveLeftoverToNextMonth') === null) {
        saveLocal('moveLeftoverToNextMonth', false)
      }

      // Attach outside-click listener for dropdowns always, and for menu close when not inline
      document.addEventListener('click', onDocClick)
      
      // Additional setup for non-inline use
      if (!props.inline) {
        // Already handled by onDocClick above
      }
      loadUser()
      applyTheme()
      await loadArchivedContacts()
      
      // For inline mode (in drawer), listen for refresh events
      if (props.inline) {
        const refreshArchived = () => loadArchivedContacts()
        window.addEventListener('rv:refresh', refreshArchived)
        window.addEventListener('focus', refreshArchived)
        // Store for cleanup
        window.__rv_refreshArchived = refreshArchived
      }
    })

    onBeforeUnmount(() => {
      // Always remove the click listener since we always add it now
        document.removeEventListener('click', onDocClick)
      
      // Clean up refresh listeners for inline mode
      if (props.inline && window.__rv_refreshArchived) {
        window.removeEventListener('rv:refresh', window.__rv_refreshArchived)
        window.removeEventListener('focus', window.__rv_refreshArchived)
        delete window.__rv_refreshArchived
      }
    })

    const onGoalsSaved = () => {
      window.dispatchEvent(new CustomEvent('rv:report:updated'))
    }

    return { 
      inline: props.inline, open, rootRef, user, userInfo, email, password, showPassword, loading, error, message, 
      theme, dailyReminderEnabled, dailyTime, monthEnd, recipientPhone, recipientName, shareChannel, includeHours, moveLeftoverToNextMonth, publisherName, showCarryHint,
      signInWithGoogle, submitEmailPassword, signOut, applyTheme, saveLocal, showLoginForm, showEmailForm,
      // Custom dropdowns
      showThemeDropdown, showViaDropdown, themeDropdownRef, viaDropdownRef, selectTheme, selectVia,
      // Archived contacts
      showArchivedModal, archivedContacts, archivedCount, restoreContact, openArchivedModal,
      // Goals
      showGoals, onGoalsSaved,
      // Hints
      showReminderHint
    }
  }
}
</script>

<style scoped>
.settings-wrap { position: relative; }
.settings-btn { padding: 0.35rem 0.5rem; border: 1px solid var(--border-color,#ddd); background: white; border-radius: 8px; line-height: 1; }
.settings-menu { position: absolute; right: 0; margin-top: 8px; width: 320px; max-width: 86vw; background: #fff; border: 1px solid var(--border-color,#ddd); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.12); padding: 0.75rem; z-index: 2000; }
.settings-menu.inline { position: static; right: auto; margin-top: 0; width: 100%; max-width: none; box-shadow: none; border: none; padding: 0; }
h4 { margin: 0 0 0.5rem 0; }
.section { border-top: 1px solid var(--border-color,#eee); padding-top: 0.6rem; margin-top: 0.6rem; }
.section:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin: 0.25rem 0; }
input, select { border: 1px solid var(--border-color,#ddd); border-radius: 6px; padding: 0.4rem 0.5rem; }
button.secondary { background: transparent; border: 1px solid var(--border-color,#ddd); color: inherit; }
.muted { color: #666; }
.hint { color: #666; font-size: 0.9rem; }
.hint.tiny { font-size: 0.75rem; color: #777; margin-top: 0.25rem; }
.label-with-info { display: inline-flex; align-items: center; gap: 0.35rem; }
.info-btn { background: none; border: none; color: #666; font-size: 0.85rem; cursor: pointer; padding: 0; }
.error { color: #e74c3c; }
.message { color: #27ae60; }

/* Time input with icon */
.time-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color,#ddd);
  border-radius: 6px;
  background: white;
  padding: 0.4rem 0.5rem;
  gap: 0.4rem;
}

.time-input-wrapper.compact {
  max-width: 140px;
  padding: 0.35rem 0.45rem;
}

.time-icon {
  font-size: 0.9rem;
  opacity: 0.7;
}

.time-input-wrapper input[type="time"] {
  border: none;
  padding: 0;
  background: transparent;
  font-size: 0.9rem;
  min-width: 60px;
}

.time-input-wrapper.compact input[type="time"] {
  font-size: 0.85rem;
  min-width: 50px;
}

.time-placeholder {
  color: #999;
  font-size: 0.9rem;
  pointer-events: none;
  position: absolute;
  right: 0.5rem;
}

.time-input-wrapper input[type="time"]:not(:placeholder-shown) + .time-placeholder {
  display: none;
}

/* Reminder time settings */
.reminder-time-settings { margin-left: 1rem; margin-top: 0.5rem; padding: 0.5rem 0; border-left: 2px solid var(--border-color, #eee); padding-left: 0.75rem; }
.reminder-time-settings.always { margin-left: 0; border-left: none; display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; }

/* Compact input */
.compact-input {
  max-width: 144px;
  padding: 0.48rem 0.6rem;
}

/* Via group - tighter spacing */
.via-group {
  margin-top: -0.15rem;
}

.row.tight {
  margin: 0.1rem 0;
}

/* Professional Account Section */
.account-section {
  border-top: 1px solid var(--border-color,#eee);
}

.account-card {
  background: var(--cell-background-color, #f8f9fa);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 0.75rem;
}

.account-card.signed-in {
  background: linear-gradient(135deg, #f0f9f4 0%, #f8fafc 100%);
  border-color: #10b981;
}

/* Account status (signed in) */
.account-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.online {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.account-info {
  flex: 1;
}

.account-email {
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.95rem;
}

.account-status-text {
  font-size: 0.8rem;
  color: #10b981;
  margin-top: 0.15rem;
}

/* Account prompt (not signed in) */
.account-prompt {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-align: left;
}

.cloud-icon {
  font-size: 1.5rem;
  opacity: 0.8;
}

.prompt-text {
  flex: 1;
}

.prompt-title {
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.95rem;
}

.prompt-subtitle {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.15rem;
}

/* Professional buttons */
.btn-primary-pro {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.btn-primary-pro:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.btn-primary-pro:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary-pro {
  background: var(--background-color, white);
  color: var(--text-color);
  border: 1px solid var(--border-color, #d1d5db);
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary-pro:hover:not(:disabled) {
  background: var(--cell-background-color, #f3f4f6);
  border-color: #9ca3af;
  transform: translateY(-1px);
}

.btn-secondary-pro:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Login form */
.login-form {
  margin-top: 0.5rem;
}

.form-header {
  margin-bottom: 1.25rem;
  text-align: center;
}

.form-header h6 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
}

.form-subtitle {
  font-size: 0.85rem;
  color: #666;
  margin: 0.5rem 0 0 0;
}

.form-fields {
  margin-bottom: 1.25rem;
}

.field-group {
  margin-bottom: 0.75rem;
}

.pro-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 8px;
  font-size: 0.9rem;
  background: var(--background-color, white);
  color: var(--text-color);
  transition: all 0.2s ease;
}

.pro-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.pro-input::placeholder {
  color: #9ca3af;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.form-disclaimer {
  font-size: 0.8rem;
  color: #666;
  text-align: center;
  line-height: 1.4;
  margin: 0;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color, #e5e7eb);
}

/* Status messages */
.status-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-top: 0.75rem;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.success-message {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.status-icon {
  font-size: 0.9rem;
}

/* Password field with toggle */
.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  padding-right: 3rem !important;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1rem;
  color: #666;
  transition: opacity 0.2s ease;
  user-select: none;
}

.password-toggle:hover {
  opacity: 0.7;
}

/* Custom dropdowns */
.custom-dropdown {
  position: relative;
  display: inline-block;
  min-width: 100px;
}

.dropdown-trigger {
  background: var(--background-color, white);
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  font-size: 0.85rem;
  color: var(--text-color);
  transition: all 0.2s ease;
}

.dropdown-trigger:hover {
  border-color: #9ca3af;
  background: var(--cell-background-color, #f9fafb);
}

.dropdown-trigger:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.dropdown-arrow {
  font-size: 0.7rem;
  opacity: 0.7;
  transition: transform 0.2s ease;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--background-color, white);
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-option {
  display: block;
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 0.85rem;
  color: var(--text-color);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.dropdown-option:hover {
  background: var(--cell-background-color, #f3f4f6);
}

.dropdown-option.active {
  background: #3b82f6;
  color: white;
}

.dropdown-option.active:hover {
  background: #1d4ed8;
}

/* Archived modal */
.archived-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 1rem;
}

.archived-modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 2rem;
}

.archived-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.archived-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.contact-info {
  flex: 1;
}

.contact-name {
  font-weight: 600;
  color: var(--text-color);
}

.contact-meta {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.25rem;
}

.restore-btn {
  padding: 0.4rem 0.8rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}

.restore-btn:hover {
  opacity: 0.9;
}

button.small {
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
}

/* Google OAuth Styles */
.google-signin-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #dadce0;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #3c4043;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 1rem;
}

.google-signin-btn:hover {
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  background: #f8f9fa;
}

.google-signin-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.divider {
  position: relative;
  text-align: center;
  margin: 1rem 0;
  color: #666;
  font-size: 0.85rem;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e0e0e0;
}

.divider span {
  background: white;
  padding: 0 0.75rem;
}

.email-signin-btn {
  width: 100%;
  padding: 0.6rem 1rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  color: var(--text-color);
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.email-signin-btn:hover {
  background: #eeeeee;
}

.email-signin-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.email-form {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.form-note {
  font-size: 0.8rem;
  color: #666;
  text-align: center;
  margin-top: 0.5rem;
}

/* User avatar improvements */
.user-avatar-section {
  margin-right: 0.75rem;
}

.user-avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar-fallback {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.2rem;
}

.account-name {
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 0.1rem;
}

.provider-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
  border-radius: 12px;
  margin-top: 0.25rem;
  display: inline-block;
}

.provider-badge.google {
  background: #e8f4fd;
  color: #1a73e8;
  border: 1px solid #d2e3fc;
}

.account-status {
  display: flex;
  align-items: center;
  flex: 1;
}

.account-info {
  flex: 1;
}
</style>


