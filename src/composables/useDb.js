import { ref, computed, onMounted, onActivated, onUnmounted } from 'vue'
import { liveQuery } from 'dexie'
import { contactService, occurrenceService, BUCKETS, MINISTRY_TAGS, OUTCOMES, db } from '../services/db.js'
import { notificationService } from '../services/notificationService.js'
import { syncService } from '../services/syncService.js'

export function useContacts() {
  const contacts = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Computed properties for organizing contacts
  const contactsByBucket = computed(() => {
    return BUCKETS.reduce((acc, bucket) => {
      acc[bucket] = contacts.value.filter(contact => contact.bucket === bucket)
      return acc
    }, {})
  })

  const todaysVisits = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return contacts.value.filter(contact => contact.next_visit_at === today)
  })

  // Load all contacts
  const loadContacts = async () => {
    loading.value = true
    error.value = null
    try {
      contacts.value = await contactService.getAll()
    } catch (err) {
      error.value = err.message
      console.error('Error loading contacts:', err)
    } finally {
      loading.value = false
    }
  }

  // Add a new contact
  const addContact = async (contactData) => {
    loading.value = true
    error.value = null
    try {
      const newContact = await contactService.create(contactData)
      // Create initial occurrence if next_visit_at provided
      if (contactData.next_visit_at) {
        try {
          await occurrenceService.addOrIgnore({
            contact_id: newContact.id,
            scheduled_at: contactData.next_visit_at,
            reminders: contactData.reminders
          })
        } catch (e) { console.warn('Failed to create initial occurrence', e) }
      }
      // Trigger cloud sync (non-blocking)
      syncService.syncAll().catch(err => console.warn('Sync after add failed:', err))
      
      // Schedule notification if this contact has a future visit (non-blocking)
      notificationService.onContactUpdated(newContact).catch(notifError => {
        console.warn('Notification scheduling failed, but contact creation succeeded:', notifError)
      })
      
      return newContact
    } catch (err) {
      error.value = err.message
      console.error('Error adding contact:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update an existing contact
  const updateContact = async (id, changes) => {
    loading.value = true
    error.value = null
    try {
      const index = contacts.value.findIndex(contact => contact.id === id)
      const oldContact = index !== -1 ? { ...contacts.value[index] } : null
      
      const safeChanges = { ...changes, updated_at: new Date().toISOString() }
      // Prevent accidental occurrence upsert when editing general fields
      if (safeChanges.next_visit_at && !safeChanges.time_explicitly_set) {
        delete safeChanges.next_visit_at
      }
      const updatedContact = await contactService.update(id, safeChanges)
      // Occurrences are created via Set/Add buttons; avoid duplicating here
      // Trigger cloud sync (non-blocking)
      syncService.syncAll().catch(err => console.warn('Sync after update failed:', err))
      if (index !== -1) {
        contacts.value[index] = updatedContact
      }
      
      // Update notifications for this contact (non-blocking)
      notificationService.onContactUpdated(updatedContact, oldContact).catch(notifError => {
        console.warn('Notification update failed, but contact update succeeded:', notifError)
      })
      
      return updatedContact
    } catch (err) {
      error.value = err.message
      console.error('Error updating contact:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete a contact
  const deleteContact = async (id) => {
    loading.value = true
    error.value = null
    try {
      await contactService.delete(id)
      contacts.value = contacts.value.filter(contact => contact.id !== id)
      // Trigger cloud sync (non-blocking)
      syncService.syncAll().catch(err => console.warn('Sync after delete failed:', err))
      
      // Remove any scheduled notifications for this contact
      await notificationService.onContactDeleted(id)
      
      return true
    } catch (err) {
      error.value = err.message
      console.error('Error deleting contact:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Load contacts on mount
  onMounted(() => {
    loadContacts()
    // Live update: subscribe to Dexie changes so UI updates instantly after sync
    try {
      const subscription = liveQuery(() => db.contacts.orderBy('name').toArray()).subscribe({
        next: (rows) => { contacts.value = rows || [] },
        error: (e) => { console.warn('liveQuery error', e) }
      })
      // Clean up on unmount
      onUnmounted(() => { try { subscription.unsubscribe() } catch {} })
    } catch (e) {
      console.warn('Failed to start liveQuery subscription; falling back to manual loads', e)
    }
    // Pull latest on mount
    if (syncService.isReady()) {
      // Ensure sync realtime/polling is initialized
      try { syncService.init() } catch {}
      syncService.pullAll().then(() => loadContacts()).catch(() => {})
    }
    // Listen for explicit refresh events from the app header
    if (!window.__rv_refreshBound) {
      const onRefresh = async () => {
        // Announce refresh start (for global UI like header button)
        try { window.dispatchEvent(new CustomEvent('rv:refresh:start')) } catch {}
        try {
          if (syncService.isReady()) {
            // Ensure realtime/polling is initialized before attempting a sync
            try { syncService.init() } catch {}
            await syncService.syncAll()
          }
        } finally {
          await loadContacts()
          // Announce refresh end regardless of outcome
          try { window.dispatchEvent(new CustomEvent('rv:refresh:end')) } catch {}
        }
      }
      window.addEventListener('rv:refresh', onRefresh)
      window.__rv_onRefresh = onRefresh
      window.__rv_refreshBound = true
    }
  })

  // When the app regains focus (SPA navigation), try a quick pull
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      if (syncService.isReady()) {
        syncService.pullAll().then(() => loadContacts()).catch(() => {})
      }
    })
  }

  return {
    // State
    contacts,
    loading,
    error,
    
    // Computed
    contactsByBucket,
    todaysVisits,
    
    // Methods
    loadContacts,
    addContact,
    updateContact,
    deleteContact,
    
    // Constants
    BUCKETS,
    MINISTRY_TAGS,
    OUTCOMES
  }
} 