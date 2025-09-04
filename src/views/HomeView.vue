<template>
  <div class="home-view">
    <!-- Add Contact button moved into ContactGrid controls panel -->
    
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <p>Loading contacts...</p>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <p>Error: {{ error }}</p>
    </div>
    
    <!-- Main Grid -->
    <ContactGrid v-else />

    <!-- Drawer for adding / editing contact -->
    <ContactDrawer
      v-if="showContactDrawer"
      :contact="selectedContact"
      :isEditing="isEditing"
      :loading="saving"
      @close="closeDrawer"
      @save="handleSaveContact"
    />
  </div>
</template>

<script>
import { useContacts } from '../composables/useDb.js'
import { notificationService } from '../services/notificationService.js'
import { syncService } from '../services/syncService.js'
import { authService } from '../services/authService.js'
import ContactGrid from '../components/features/ContactGrid.vue'
import ContactDrawer from '../components/features/ContactDrawer.vue'
import { onMounted, ref, onMounted as onMountedAlias, nextTick } from 'vue'
import { usePullToRefresh } from '../composables/usePullToRefresh.js'

export default {
  name: 'HomeView',
  components: {
    ContactGrid,
    ContactDrawer
  },
  setup() {
    const { 
      contacts, 
      loading, 
      error, 
      contactsByBucket, 
      addContact,
      BUCKETS 
    } = useContacts()
    

    
    // Drawer state
    const showContactDrawer = ref(false)
    const selectedContact = ref(null)
    const isEditing = ref(false)
    const saving = ref(false)

    const openAddContactDrawer = () => {
      selectedContact.value = { bucket: 'Others' }
      isEditing.value = false
      showContactDrawer.value = true
    }

    const closeDrawer = () => {
      showContactDrawer.value = false
      selectedContact.value = null
      isEditing.value = false
    }

    const handleSaveContact = async (contactData) => {
      saving.value = true
      try {
        await addContact(contactData)
        closeDrawer()
      } catch (err) {
        console.error('Failed to save contact:', err)
      } finally {
        saving.value = false
      }
    }
    

    
    // Initialize notifications on component mount
    onMounted(async () => {
      console.log('HomeView mounted successfully!')
      
      // Initialize notification service
      try {
        await notificationService.init()
        console.log('Notification service initialized:', notificationService.getStatus())
      } catch (error) {
        console.warn('Failed to initialize notifications:', error)
      }

      // If not logged in (once auth enabled), redirect to /login
      try {
        const user = await authService.getUser().catch(() => null)
        if (!user) {
          // For now, we allow anonymous usage; uncomment to enforce login later:
          // return router.push('/login')
        }
      } catch {}

      // Kick off initial cloud sync if configured
      try {
        if (syncService.isReady()) {
          syncService.init()
          const result = await syncService.syncAll()
          console.log('Initial sync completed', result)
        } else {
          console.log('Supabase not configured; skipping sync')
        }
      } catch (e) {
        console.warn('Initial sync failed', e)
      }

      // Pull-to-refresh on main scroll area
      await nextTick()
      const getScrollableEl = () => document.querySelector('.grid-container') || document.querySelector('.home-view')
      usePullToRefresh(getScrollableEl, async () => {
        try { window.dispatchEvent(new CustomEvent('rv:refresh')) } catch {}
      })
    })
    
    return {
      contacts,
      loading,
      error,
      contactsByBucket,
      openAddContactDrawer,
      closeDrawer,
      handleSaveContact,
      showContactDrawer,
      selectedContact,
      isEditing,
      saving,
      BUCKETS
    }
  }
}
</script>

<style scoped>
.home-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}
.toolbar.centered { justify-content: center; }

.btn-small { padding: 0.4rem 0.7rem; border: 1px solid var(--primary-color); background: var(--primary-color); color: #fff; border-radius: 6px; font-size: 0.9rem; }



.loading-state, .error-state {
  text-align: center;
  padding: 2rem;
  color: #666;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-state {
  color: #e74c3c;
}

.loading-state {
  color: var(--primary-color);
}
</style> 