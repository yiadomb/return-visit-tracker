<template>
  <div class="settings-wrap" ref="rootRef">
    <button v-if="!inline" class="settings-btn" @click="open = !open" aria-haspopup="menu" :aria-expanded="open">
      ⚙️
    </button>
    <div v-if="open" class="settings-menu" :class="{ inline }" role="menu" @click.stop>
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
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { authService } from '../services/authService.js'
import { db, contactService } from '../services/db.js'

export default {
  name: 'SettingsMenu',
  props: { inline: { type: Boolean, default: false } },
  setup(props) {
    const open = ref(props.inline)
    const rootRef = ref(null)
    const user = ref(null)
    const email = ref('')
    const password = ref('')
    const loading = ref(false)
    const error = ref('')
    const message = ref('')
    const showLoginForm = ref(false)
    
    // Archived contacts
    const showArchivedModal = ref(false)
    const archivedContacts = ref([])
    const archivedCount = ref(0)

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
      // Attach outside-click listener only when used as a popover
      if (!props.inline) {
        document.addEventListener('click', onDocClick)
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
      if (!props.inline) {
        document.removeEventListener('click', onDocClick)
      } else if (window.__rv_refreshArchived) {
        window.removeEventListener('rv:refresh', window.__rv_refreshArchived)
        window.removeEventListener('focus', window.__rv_refreshArchived)
        delete window.__rv_refreshArchived
      }
    })

    return { 
      inline: props.inline, open, rootRef, user, email, password, loading, error, message, 
      theme, dailyTime, monthEnd, recipientPhone, shareChannel, includeHours, 
      submit, signOut, applyTheme, saveLocal, showLoginForm,
      // Archived contacts
      showArchivedModal, archivedContacts, archivedCount, restoreContact, openArchivedModal
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
.error { color: #e74c3c; }
.message { color: #27ae60; }

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
</style>


