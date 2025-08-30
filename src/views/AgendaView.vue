<template>
  <div class="agenda-view" @touchstart.passive="onOuterTouchStart" @touchend.passive="onOuterTouchEnd">
    <div class="agenda-header">
      <h1>Today's Agenda</h1>
      <p class="date-display">{{ todayDisplay }}</p>
    </div>

    <div class="agenda-content">
      <div v-if="loading" class="loading-state">
        Loading today's visits...
      </div>

      <div v-else-if="error" class="error-state">
        {{ error }}
      </div>

      <div v-else-if="todaysVisits.length === 0" class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No visits scheduled for today</h3>
        <p>Enjoy your free day or check back tomorrow!</p>
      </div>

      <div v-else class="visits-list">
        <div 
          v-for="contact in todaysVisits" 
          :key="contact.id"
          class="visit-card"
          @click="openContactDrawer(contact)"
        >
          <div class="visit-header">
            <div class="contact-name">{{ contact.name }}</div>
            <div class="visit-time">{{ formatVisitTime(contact.next_visit_at) }}</div>
          </div>
          
          <div class="visit-details">
            <div class="hostel-info" :style="getHostelStyle(contact.hostel_name)">
              {{ contact.hostel_name || 'No hostel' }}
            </div>
            
            <div v-if="contact.location_detail" class="location-detail">
              📍 {{ contact.location_detail }}
            </div>
            
            <div v-if="contact.notes" class="visit-notes">
              💭 {{ contact.notes }}
            </div>
          </div>

          <div class="visit-actions">
            <button 
              v-if="contact.phone" 
              @click.stop="callContact(contact.phone)"
              class="action-btn call-btn"
            >
              📞 Call
            </button>
            <button 
              v-if="contact.phone" 
              @click.stop="whatsappContact(contact.phone)"
              class="action-btn whatsapp-btn"
            >
              💬 WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Drawer -->
    <ContactDrawer
      v-if="showContactDrawer"
      :contact="selectedContact"
      :is-editing="isEditing"
      :saving="saving"
      @close="closeDrawer"
      @save="handleSaveContact"
      @delete="handleDeleteContact"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import ContactDrawer from '../components/features/ContactDrawer.vue'
import { useContacts } from '../composables/useDb'
import { notificationService } from '../services/notificationService'
import { getHostelColors } from '../utils/hostelColor.js'
import router from '../router'

export default {
  name: 'AgendaView',
  components: {
    ContactDrawer
  },
  setup() {
    const { contacts, updateContact, deleteContact } = useContacts()
    
    // State
    const loading = ref(true)
    const error = ref(null)
    const showContactDrawer = ref(false)
    const selectedContact = ref(null)
    const isEditing = ref(false)
    const saving = ref(false)

    // Get today's date
    const today = new Date()
    const todayDateString = today.toISOString().split('T')[0] // YYYY-MM-DD

    // Display today's date nicely
    const todayDisplay = computed(() => {
      return today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    })

    // Filter contacts for today's visits
    const todaysVisits = computed(() => {
      return contacts.value
        .filter(contact => {
          if (!contact.next_visit_at) return false
          const visitDate = new Date(contact.next_visit_at).toISOString().split('T')[0]
          return visitDate === todayDateString
        })
        .sort((a, b) => {
          // Sort by visit time if available, otherwise by name
          if (a.next_visit_at && b.next_visit_at) {
            return new Date(a.next_visit_at) - new Date(b.next_visit_at)
          }
          return a.name.localeCompare(b.name)
        })
    })

    // Format visit time
    const formatVisitTime = (dateString) => {
      if (!dateString) return 'No time set'
      const date = new Date(dateString)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    // Outer swipe navigation between Agenda and Contacts
    const outerStartX = ref(0)
    const outerStartY = ref(0)
    const onOuterTouchStart = (event) => {
      const t = event.touches && event.touches[0]
      if (!t) return
      // Ignore when interacting with inputs or buttons
      const target = event.target
      if (target.closest('input, textarea, button, a')) {
        outerStartX.value = 0
        outerStartY.value = 0
        return
      }
      outerStartX.value = t.clientX
      outerStartY.value = t.clientY
    }
    const onOuterTouchEnd = (event) => {
      if (!outerStartX.value && !outerStartY.value) return
      const t = event.changedTouches && event.changedTouches[0]
      if (!t) return
      const dx = t.clientX - outerStartX.value
      const dy = Math.abs(t.clientY - outerStartY.value)
      outerStartX.value = 0
      outerStartY.value = 0
      if (Math.abs(dx) > 80 && Math.abs(dx) > dy) {
        const current = router.currentRoute.value.name
        if (dx > 0 && current === 'Agenda') {
          router.push({ name: 'Home' })
        } else if (dx < 0 && current === 'Home') {
          router.push({ name: 'Agenda' })
        } else if (dx > 0) {
          router.push({ name: 'Home' })
        }
      }
    }

    const getHostelStyle = (hostelName) => {
      const colors = getHostelColors(hostelName)
      return {
        backgroundColor: colors.background,
        borderLeftColor: colors.border,
        color: colors.text
      }
    }

    // Contact actions
    const callContact = (phone) => {
      if (phone) {
        window.location.href = `tel:${phone}`
      }
    }

    const whatsappContact = (phone) => {
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '')
        window.open(`https://wa.me/${cleanPhone}`, '_blank')
      }
    }

    // Drawer functions
    const openContactDrawer = (contact) => {
      selectedContact.value = contact
      isEditing.value = true
      showContactDrawer.value = true
    }

    const closeDrawer = () => {
      showContactDrawer.value = false
      selectedContact.value = null
      isEditing.value = false
      saving.value = false
    }

    const handleSaveContact = async (contactData) => {
      saving.value = true
      try {
        await updateContact(selectedContact.value.id, contactData)
        closeDrawer()
      } catch (err) {
        error.value = 'Failed to update contact'
      } finally {
        saving.value = false
      }
    }

    const handleDeleteContact = async (contactId) => {
      saving.value = true
      try {
        await deleteContact(contactId)
        closeDrawer()
      } catch (err) {
        error.value = 'Failed to delete contact'
      } finally {
        saving.value = false
      }
    }

    // Lifecycle
    onMounted(async () => {
      loading.value = false
      console.log('AgendaView mounted successfully!')
      
      // Initialize notifications and schedule today's visits
      try {
        await notificationService.init()
        if (todaysVisits.value.length > 0) {
          await notificationService.scheduleTodaysVisits(todaysVisits.value)
        }
        console.log('AgendaView notifications initialized')
      } catch (error) {
        console.warn('Failed to initialize notifications in AgendaView:', error)
      }
    })

    return {
      loading,
      error,
      todayDisplay,
      todaysVisits,
      showContactDrawer,
      selectedContact,
      isEditing,
      saving,
      formatVisitTime,
      getHostelStyle,
      callContact,
      whatsappContact,
      openContactDrawer,
      closeDrawer,
      handleSaveContact,
      handleDeleteContact,
      onOuterTouchStart,
      onOuterTouchEnd
    }
  }
}
</script>

<style scoped>
.agenda-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.agenda-header {
  text-align: center;
  margin-bottom: 2rem;
}

.agenda-header h1 {
  color: var(--text-color);
  margin-bottom: 0.5rem;
  font-size: 2rem;
}

.date-display {
  color: #666;
  font-size: 1.1rem;
  font-weight: 500;
}

.agenda-content {
  flex: 1;
  overflow-y: auto;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error-state {
  color: #e74c3c;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: var(--text-color);
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #666;
}

.visits-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.visit-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.visit-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.visit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.contact-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-color);
}

.visit-time {
  font-size: 1rem;
  font-weight: 500;
  color: var(--primary-color);
  background: #e3f2fd;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
}

.visit-details {
  margin-bottom: 1rem;
}

.hostel-info {
  display: inline-block;
  font-size: 0.9rem;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  border-left: 3px solid;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.location-detail,
.visit-notes {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.visit-notes {
  font-style: italic;
  color: var(--primary-color);
}

.visit-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.call-btn {
  background-color: #4caf50;
  color: white;
}

.call-btn:hover {
  background-color: #45a049;
  transform: translateY(-1px);
}

.whatsapp-btn {
  background-color: #25d366;
  color: white;
}

.whatsapp-btn:hover {
  background-color: #22c55e;
  transform: translateY(-1px);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .agenda-view {
    padding: 0.75rem;
  }
  
  .agenda-header h1 {
    font-size: 1.5rem;
  }
  
  .date-display {
    font-size: 1rem;
  }
  
  .visit-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .contact-name {
    font-size: 1.1rem;
  }
  
  .visit-time {
    font-size: 0.9rem;
    align-self: flex-end;
  }
}
</style> 