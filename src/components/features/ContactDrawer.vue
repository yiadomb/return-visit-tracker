<template>
  <div class="drawer-overlay" @click="handleOverlayClick">
    <div class="drawer-content" @click.stop>
      <div class="drawer-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="$emit('close')" aria-label="Close">
          ×
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="contact-form">
        <!-- Name (optional) -->
        <div class="form-group">
          <label for="name">Name (of householder)</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            placeholder="Enter Name Here"
            autocomplete="off"
            :class="{ 'error': errors.name }"
            :readonly="mode === 'view'"
            :disabled="mode === 'view'"
          />
          <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
        </div>

        <!-- Location -->
        <div class="form-group">
          <label for="hostel_name">Location (Hostel name)</label>
          <input
            id="hostel_name"
            v-model="formData.hostel_name"
            type="text"
            placeholder="Garden View Hostel"
            :readonly="mode === 'view'"
            :disabled="mode === 'view'"
          />
        </div>

        <!-- Location Detail -->
        <div class="form-group">
          <label for="location_detail">Location Details</label>
          <input
            id="location_detail"
            v-model="formData.location_detail"
            type="text"
            placeholder="1st Floor, Room 7"
            :readonly="mode === 'view'"
            :disabled="mode === 'view'"
          />
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea
            id="notes"
            v-model="formData.notes"
            placeholder="Any additional note..."
            rows="3"
            :readonly="mode === 'view'"
            :disabled="mode === 'view'"
          ></textarea>
        </div>

        <!-- Divider -->
        <div class="form-divider"></div>

        <!-- Phone + Ministry Context inline -->
        <div class="form-group">
          <label>Phone & Ministry Context</label>
          <div class="phone-ministry-row">
            <div class="phone-wrapper">
              <input
                id="phone"
                v-model="formData.phone"
                type="tel"
                placeholder="0555000000"
                pattern="[0-9]{10}"
                autocomplete="off"
                :class="{ 'error': errors.phone }"
                :readonly="mode === 'view'"
                :disabled="mode === 'view'"
              />
            </div>
            <div class="mini-select" ref="tagSelectRef">
              <button type="button" class="mini-trigger" @click="showTagMenu = !showTagMenu">
                {{ formData.tags || 'Select context...' }}
                <span class="caret">▾</span>
              </button>
              <div v-if="showTagMenu && mode !== 'view'" class="mini-menu" @click.stop>
                <button class="mini-option" @click="chooseTag('')">Select context...</button>
                <button v-for="tag in MINISTRY_TAGS" :key="tag" class="mini-option" @click="chooseTag(tag)">
                  {{ tag }}
                </button>
              </div>
            </div>
          </div>
          <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
        </div>

        <!-- Bucket (custom small dropdown) + Day Time inline -->
        <div class="form-group">
          <label>Day Available</label>
          <div class="day-row">
            <div class="mini-select" ref="bucketSelectRef">
              <button type="button" class="mini-trigger" @click="showBucketMenu = !showBucketMenu">
                {{ formData.bucket || 'Select day' }}
                <span class="caret">▾</span>
              </button>
              <div v-if="showBucketMenu && mode !== 'view'" class="mini-menu" @click.stop>
                <button v-for="bucket in BUCKETS" :key="bucket" class="mini-option" @click="chooseBucket(bucket)">
                {{ bucket }}
                </button>
              </div>
            </div>
            <div class="time-wrapper day-time-wrapper">
              <input
                id="bucket_time"
                v-model="formData.bucket_time"
                type="time"
                class="time-input day-time-input"
                :readonly="mode === 'view'"
                :disabled="mode === 'view'"
                title="Choose time for this day"
                @change="onBucketTimeChange"
              />
              <span v-if="!formData.bucket_time" class="time-placeholder">🕐 Time</span>
            </div>
          </div>
        </div>

        <!-- Next Visit Date & Time -->
        <div class="form-group">
          <label for="next_visit_at">Next Visit</label>
          <div class="datetime-inputs">
            <div class="date-wrapper">
              <input
                id="next_visit_at"
                v-model="formData.next_visit_date"
                type="date"
                :min="today"
                class="date-input"
                :readonly="mode === 'view'"
                :disabled="mode === 'view'"
                title="Choose return visit date"
                ref="dateInputRef"
              />
              <span v-if="!formData.next_visit_date" class="date-placeholder">📅 Date</span>
            </div>
            <div class="time-wrapper">
              <input
                id="next_visit_time"
                v-model="formData.next_visit_time"
                type="time"
                class="time-input"
                :class="{ glow: highlightTime }"
                :readonly="mode === 'view'"
                :disabled="mode === 'view'"
                title="Choose return visit time"
                @focus="onTimeFocus"
                @blur="onTimeBlur"
                ref="timeInputRef"
              />
              <span v-if="!formData.next_visit_time" class="time-placeholder">🕐 Time</span>
            </div>
            <button type="button" class="set-visit-btn" :class="{ glow: highlightSet }" :disabled="!formData.next_visit_date" @click="setCurrentVisit">
              ✓ Set
            </button>
          </div>
          <div class="reminder-select">
            <span class="chip-label">Remind me</span>
            <button type="button" class="reminder-dropdown" @click="showReminderMenu = !showReminderMenu">
              {{ reminderLabel }} <span class="caret">▾</span>
            </button>
            <div v-if="showReminderMenu" class="reminder-menu" @click.stop>
              <button class="reminder-option" :class="{ active: selectedReminder === '0' }" @click="selectedReminder = '0'; showReminderMenu=false">On time</button>
              <button class="reminder-option" :class="{ active: selectedReminder === '-180' }" @click="selectedReminder = '-180'; showReminderMenu=false">3 hrs early</button>
              <div class="reminder-custom">
                <label class="custom-title">Custom</label>
                <div class="custom-inputs">
                  <input type="number" min="0" max="72" v-model.number="customHours" class="num-input" placeholder="0" aria-label="Hours" />
                  <span class="colon">h</span>
                  <input type="number" min="0" max="59" v-model.number="customMinutes" class="num-input" placeholder="0" aria-label="Minutes" />
                  <span class="colon">m</span>
                  <button type="button" class="apply-btn" @click="selectedReminder='custom'; showReminderMenu=false">Apply</button>
                </div>
              </div>
            </div>
          </div>
          <div class="add-occurrence-row">
            <button 
              type="button" 
              class="btn-secondary" 
              @click="addAnotherDate" 
              :disabled="mode === 'view'"
            >
              ＋ Add other days
            </button>
          </div>
        </div>

        

        <!-- Scheduled dates list -->
        <div class="form-group">
          <label>Scheduled Visits</label>
          <!-- Add mode: show staged occurrences -->
          <div v-if="mode === 'add'">
            <div v-if="stagedOccurrences.length === 0" class="occ-empty">No extra dates yet</div>
            <ul v-else class="occ-list">
              <li v-for="(occ, idx) in stagedOccurrences" :key="occ.scheduled_at + '-' + idx" class="occ-item">
                <span class="occ-date">{{ formatOccurrence(occ.scheduled_at) }}</span>
                <button type="button" class="occ-remove" @click="removeStaged(idx)">Remove</button>
              </li>
            </ul>
          </div>
          <!-- Edit/View mode: show persisted occurrences -->
          <div v-else>
            <div v-if="occurrences.length === 0" class="occ-empty">No extra dates yet</div>
            <ul v-else class="occ-list">
              <li v-for="occ in occurrences" :key="occ.id" class="occ-item">
                <span class="occ-date">{{ formatOccurrence(occ.scheduled_at) }}</span>
                <button type="button" class="occ-remove" @click="removeOccurrence(occ)">Remove</button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Quick Actions (for editing only, hidden for mirrored contacts) -->
        <div v-if="mode !== 'add' && !isMirrored" class="quick-actions">
          <h4>Quick Actions</h4>
          <div class="action-buttons">
            <a 
              v-if="formData.phone" 
              :href="`tel:${formData.phone}`" 
              class="action-btn call"
            >
              📞 Call
            </a>
            <a 
              v-if="formData.phone" 
              :href="`https://wa.me/${formData.phone.replace(/\D/g, '')}`" 
              target="_blank"
              class="action-btn whatsapp"
            >
              💬 WhatsApp
            </a>
            <button 
              type="button" 
              @click="$emit('archive', contact.id)"
              class="action-btn archive"
              v-if="contact.id"
            >
              📥 Archive
            </button>
            <button 
              type="button" 
              @click="$emit('delete', contact.id)"
              class="action-btn delete"
              v-if="contact.id"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </form>

      <!-- Footer actions outside the scroll area to stay visible with keyboard -->
      <div class="sheet-footer">
        <template v-if="mode === 'view'">
          <button type="button" class="btn-primary action-primary" @click="$emit('toggle-edit')">
            Edit
          </button>
          <button type="button" @click="$emit('close')" class="btn-secondary action-cancel">
            Close
          </button>
        </template>
        <template v-else>
          <button type="button" class="btn-primary action-primary" :disabled="loading" @click="handleSubmit">
            {{ loading ? 'Saving...' : (mode === 'edit' ? 'Update Contact' : 'Save Contact') }}
          </button>
          <button type="button" @click="$emit('close')" class="btn-secondary action-cancel">
            Cancel
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch, onUnmounted, nextTick } from 'vue'
import { BUCKETS, MINISTRY_TAGS, db, occurrenceService } from '../../services/db.js'
import { liveQuery } from 'dexie'

export default {
  name: 'ContactDrawer',
  props: {
    contact: {
      type: Object,
      default: () => ({})
    },
    isEditing: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'save', 'delete', 'archive', 'add-occurrence', 'update-field'],
  setup(props, { emit }) {
    const mode = computed(() => {
      if (props.isEditing) return 'edit'
      return props.contact && props.contact.id ? 'view' : 'add'
    })
    const title = computed(() => {
      if (mode.value === 'view') return 'Contact'
      if (mode.value === 'edit') return 'Edit Contact'
      return 'Add Contact'
    })
    const isMirrored = computed(() => {
      const c = props.contact || {}
      return c.__mirrored === true
    })

    const formData = reactive({
      name: '',
      phone: '',
      bucket: 'Saturday',
      bucket_time: '',
      hostel_name: '',
      location_detail: '',
      next_visit_date: '',
      next_visit_time: '',
      tags: '',
      notes: '',
      reminders: ['-30']
    })
    // Reminder selection (single choice with custom H/M)
    const selectedReminder = ref('-180') // '0' on time, '-180' 3 hours early, 'custom'
    const customHours = ref(1)
    const customMinutes = ref(0)
    const showBucketMenu = ref(false)
    const showTagMenu = ref(false)
    const showReminderMenu = ref(false)
    const bucketSelectRef = ref(null)
    const tagSelectRef = ref(null)
    const dateInputRef = ref(null)
    const timeInputRef = ref(null)
    const highlightTime = ref(false)
    const highlightSet = ref(false)

    // Removed tablet custom menu; restore native time input everywhere
    const onBucketTimeChange = () => {
      try {
        if (props?.contact?.id && props.isEditing) {
          emit('update-field', { bucket_time: formData.bucket_time })
        }
      } catch {}
    }
    // Occurrences state (for this contact)
    const occurrences = ref([])
    // Staged occurrences before first save (Add mode)
    const stagedOccurrences = ref([])
    let occSub = null
    const subscribeOccurrences = (contactId) => {
      try { occSub?.unsubscribe() } catch {}
      if (!contactId) return
      try {
        occSub = liveQuery(() => db.visitOccurrences.where('contact_id').equals(contactId).toArray()).subscribe({
          next: (rows) => {
            occurrences.value = (rows || []).slice().sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
          },
          error: (e) => { console.warn('occurrences liveQuery (drawer) error', e) }
        })
      } catch (e) {
        console.warn('Failed to subscribe to occurrences in drawer', e)
      }
    }

    const chooseBucket = (bucket) => {
      formData.bucket = bucket
      showBucketMenu.value = false
    }

    const chooseTag = (tag) => {
      formData.tags = tag
      showTagMenu.value = false
    }

    const errors = ref({})

    // Get today's date for date input min
    const today = computed(() => {
      return new Date().toISOString().split('T')[0]
    })

    // Initialize form data when contact prop changes
    watch(() => props.contact, (newContact) => {
      if (newContact && Object.keys(newContact).length > 0) {
        Object.keys(formData).forEach(key => {
          if (key === 'next_visit_date' || key === 'next_visit_time') {
            // Handle next_visit_at conversion
            if (newContact.next_visit_at) {
              const dateTime = new Date(newContact.next_visit_at)
              formData.next_visit_date = dateTime.toISOString().split('T')[0]
              formData.next_visit_time = dateTime.toTimeString().slice(0, 5)
            } else {
              formData[key] = ''
            }
          } else {
            formData[key] = newContact[key] || ''
          }
        })
        // Set default bucket if adding new contact
        if (!props.isEditing && newContact.bucket) {
          formData.bucket = newContact.bucket
        }
        if (newContact.reminders && Array.isArray(newContact.reminders) && newContact.reminders.length > 0) {
          const tok = String(newContact.reminders[0])
          if (tok === '0' || tok === '-180') {
            selectedReminder.value = tok
          } else if (/^-?\d+$/.test(tok)) {
            selectedReminder.value = 'custom'
            const mins = Math.abs(parseInt(tok, 10))
            customHours.value = Math.floor(mins / 60)
            customMinutes.value = mins % 60
          } else {
            selectedReminder.value = '-180'
          }
        } else {
          selectedReminder.value = '-180'
        }
        if (newContact.id) subscribeOccurrences(newContact.id)
      } else {
        // Reset form for new contact
        Object.keys(formData).forEach(key => {
          if (key === 'bucket') {
            formData[key] = 'Saturday'
          } else if (key === 'reminders') {
            formData[key] = ['-30']
          } else {
            formData[key] = ''
          }
        })
        selectedReminder.value = '-180'
      }
      errors.value = {}
    }, { immediate: true })

    onUnmounted(() => { try { occSub?.unsubscribe() } catch {} })

    // Validation
    const validateForm = () => {
      errors.value = {}

      if (formData.phone && !formData.phone.match(/^\d{10}$/)) {
        errors.value.phone = 'Phone must be 10 digits'
      }

      return Object.keys(errors.value).length === 0
    }

    // Handle form submission
    const handleSubmit = () => {
      if (!validateForm()) {
        // Scroll to first error field
        const firstError = document.querySelector('.form-group .error')
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        return
      }

      const contactData = { ...formData }
      
      // Clean up phone number
      if (contactData.phone) {
        contactData.phone = contactData.phone.replace(/\D/g, '')
      }

      // Only on Add: combine date and time into next_visit_at
      if (mode.value === 'add') {
        if (contactData.next_visit_date && contactData.next_visit_time) {
          contactData.next_visit_at = `${contactData.next_visit_date}T${contactData.next_visit_time}`
          contactData.time_explicitly_set = true
        } else {
          contactData.next_visit_at = ''
          contactData.time_explicitly_set = false
        }
      } else {
        // On Edit: occurrences are managed via Set/Add buttons; do not upsert here
        delete contactData.next_visit_at
      }

      delete contactData.next_visit_date
      delete contactData.next_visit_time

      // Use selected per-visit reminder as contact default
      contactData.reminders = computeReminders()
      // Include staged extra dates in Add mode so caller can create occurrences after contact is created
      if (mode.value === 'add' && stagedOccurrences.value.length > 0) {
        contactData.stagedOccurrences = stagedOccurrences.value.slice()
      }

      emit('save', contactData)
    }

    const addAnotherDate = async () => {
      const contactData = { ...formData }
      // If no date yet, focus date picker
      if (!contactData.next_visit_date) {
        try { dateInputRef.value?.showPicker?.() } catch {}
        highlightTime.value = false
        highlightSet.value = false
        return
      }
      if (contactData.phone) {
        contactData.phone = contactData.phone.replace(/\D/g, '')
      }
      // If time missing, prompt and visually guide
      if (!contactData.next_visit_time) {
        highlightTime.value = true
        try { timeInputRef.value?.showPicker?.() } catch {}
        return
      }
      const t = contactData.next_visit_time
      contactData.next_visit_at = `${contactData.next_visit_date}T${t}`
      const reminders = computeReminders()
      if (mode.value === 'add' || !props.contact?.id) {
        // Stage locally in Add mode
        stagedOccurrences.value.push({ scheduled_at: contactData.next_visit_at, reminders })
      } else {
        // In edit mode, optimistically add to the list immediately for instant feedback
        const tempOcc = { 
          id: 'temp-' + Date.now(), 
          contact_id: props.contact?.id,
          scheduled_at: contactData.next_visit_at, 
          reminders 
        }
        occurrences.value = [...occurrences.value, tempOcc].sort((a, b) => 
          new Date(a.scheduled_at) - new Date(b.scheduled_at)
        )
        
        // Then save to database
        try {
          await occurrenceService.addOrIgnore({ 
            contact_id: props.contact.id, 
            scheduled_at: contactData.next_visit_at, 
            reminders 
          })
        } catch {}
        emit('add-occurrence', { next_visit_at: contactData.next_visit_at, reminders })
      }
      // Clear date to encourage adding another; keep time to reuse if desired
      formData.next_visit_date = ''
      // Open the date picker automatically for fast multi-select, then time picker
      requestAnimationFrame(() => { try { dateInputRef.value?.showPicker?.() } catch {} })
      openTimeAfterDate.value = true
      // Nudge next steps
      highlightTime.value = true
      highlightSet.value = true
    }

    const setCurrentVisit = async () => {
      // Save the currently selected date/time as an occurrence and show it immediately
      const contactData = { ...formData }
      if (!contactData.next_visit_date) return
      const t = contactData.next_visit_time || '10:00'
      const when = `${contactData.next_visit_date}T${t}`
      const reminders = computeReminders()
      
      if (mode.value === 'add') {
        // In add mode, stage the occurrence locally
        stagedOccurrences.value.push({ scheduled_at: when, reminders })
      } else {
        // In edit mode, optimistically add to the list immediately for instant feedback
        const tempOcc = { 
          id: 'temp-' + Date.now(), 
          contact_id: props.contact?.id,
          scheduled_at: when, 
          reminders 
        }
        occurrences.value = [...occurrences.value, tempOcc].sort((a, b) => 
          new Date(a.scheduled_at) - new Date(b.scheduled_at)
        )
        
        // Then save to database
        try { 
          if (props.contact?.id) {
            await occurrenceService.addOrIgnore({ 
              contact_id: props.contact.id, 
              scheduled_at: when, 
              reminders 
            })
          }
        } catch {}
        emit('add-occurrence', { next_visit_at: when, reminders })
      }
      
      // Clear the form to provide feedback that it worked
      formData.next_visit_date = ''
      formData.next_visit_time = ''
      highlightTime.value = false
      highlightSet.value = false
    }

    const removeOccurrence = async (occ) => {
      try {
        if (occ?.id) {
          await occurrenceService.delete(occ.id)
        } else if (props.contact?.id && occ?.scheduled_at) {
          await occurrenceService.deleteByContactAndTime(props.contact.id, occ.scheduled_at)
        }
      } catch (e) {
        alert('Failed to remove date. Please try again.')
      }
    }

    const formatOccurrence = (iso) => {
      const d = new Date(iso)
      return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    }

    // Handle overlay click (close drawer)
    const handleOverlayClick = () => {
      emit('close')
    }

    // Native time picker helpers
    const onTimeFocus = (event) => {
      setTimeout(() => {
        event.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    }
    const onTimeBlur = () => {}

    // After choosing a date, optionally open time picker automatically
    const openTimeAfterDate = ref(false)
    watch(() => formData.next_visit_date, async (v, old) => {
      if (!v) return
      if (openTimeAfterDate.value) {
        await nextTick()
        try { timeInputRef.value?.showPicker?.() } catch {}
        openTimeAfterDate.value = false
        highlightTime.value = true
        highlightSet.value = true
      }
    })

    const computeReminders = () => {
      if (selectedReminder.value === 'custom') {
        const mins = Math.max(0, (parseInt(customHours.value || 0, 10) * 60) + parseInt(customMinutes.value || 0, 10))
        return [String(-mins)]
      }
      return [selectedReminder.value]
    }
    const reminderLabel = computed(() => {
      if (selectedReminder.value === '0') return 'On time'
      if (selectedReminder.value === '-180') return '3 hrs early'
      const mins = Math.max(0, (parseInt(customHours.value || 0, 10) * 60) + parseInt(customMinutes.value || 0, 10))
      const h = Math.floor(mins / 60)
      const m = mins % 60
      const parts = []
      if (h > 0) parts.push(`${h}h`)
      if (m > 0 || h === 0) parts.push(`${m}m`)
      return `${parts.join(' ')} early`
    })

          return {
        mode,
        title,
        isMirrored,
        formData,
        errors,
        today,
        BUCKETS,
        MINISTRY_TAGS,
        showBucketMenu,
        showTagMenu,
        chooseBucket,
        chooseTag,
        bucketSelectRef,
        tagSelectRef,
        onTimeFocus,
        onTimeBlur,
        onBucketTimeChange,
        validateForm,
        handleSubmit,
        addAnotherDate,
      setCurrentVisit,
      dateInputRef,
      timeInputRef,
      highlightTime,
      highlightSet,
      selectedReminder,
      customHours,
      customMinutes,
      reminderLabel,
      showReminderMenu,
      occurrences,
        stagedOccurrences,
        removeOccurrence,
        removeStaged: (idx) => { stagedOccurrences.value.splice(idx, 1) },
        formatOccurrence,
        handleOverlayClick,
        onTimeFocus,
        onTimeBlur
      }
  }
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.drawer-content {
  background-color: var(--background-color);
  border-radius: 8px;
  width: 100%;
  max-width: 380px;
  max-height: 88dvh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.1rem 1.1rem 0.85rem 1.1rem;
  border-bottom: 1px solid var(--border-color);
}

.drawer-header h3 {
  margin: 0;
  color: var(--text-color);
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-color);
}

.contact-form {
  padding: 1rem 1.1rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  -webkit-overflow-scrolling: touch;
  /* leave room so last field isn't hidden behind footer */
  padding-bottom: 5rem;
}

.form-group { margin-bottom: 0.75rem; }

.form-divider {
  border-top: 1px solid var(--border-color);
  margin: 1.5rem 0;
  position: relative;
}

.form-divider::after {
  content: "Additional Details";
  position: absolute;
  top: -0.6rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--background-color);
  padding: 0 1rem;
  font-size: 0.8rem;
  color: #666;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.85rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.6rem 0.65rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.95rem;
  background-color: var(--cell-background-color);
  color: var(--text-color);
  transition: border-color 0.2s ease;
}

.compact-select {
  font-size: 0.8rem;
  padding: 0.4rem 0.5rem;
  max-height: 200px;
  line-height: 1.1;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.form-group input.error,
.form-group select.error,
.form-group textarea.error {
  border-color: #e74c3c;
}

.error-text {
  color: #e74c3c;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  display: block;
}

.datetime-inputs { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }

.date-wrapper, .time-wrapper {
  position: relative;
  flex: 1;
}

.date-wrapper {
  flex: 2;
}

.time-wrapper {
  flex: 1;
}

.date-input, .time-input {
  width: 100%;
  height: 36px;
}

.date-placeholder, .time-placeholder {
  position: absolute;
  top: 50%;
  left: 0.65rem;
  transform: translateY(-50%);
  color: #999;
  font-size: 0.9rem;
  pointer-events: none;
  z-index: 1;
  white-space: nowrap;
}

.time-placeholder {
  font-size: 0.85rem;
}

.date-input:focus + .date-placeholder,
.time-input:focus + .time-placeholder {
  opacity: 0.5;
}

.time-input.glow,
.set-visit-btn.glow {
  box-shadow: 0 0 0 3px rgba(52,152,219,0.25);
  border-color: var(--primary-color);
}

.sheet-footer {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1.1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border-color);
  background-color: var(--background-color);
  z-index: 20;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 0.6rem 0.9rem;
  border-radius: 4px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background-color: var(--cell-background-color);
}

.quick-actions {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.quick-actions h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  text-decoration: none;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.action-btn.call {
  background-color: #27ae60;
  color: white;
}

.action-btn.whatsapp {
  background-color: #25d366;
  color: white;
}

.action-btn.archive {
  background-color: #3498db;
  color: white;
}

.action-btn.delete {
  background-color: #e74c3c;
  color: white;
}

.action-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.field-hint {
  display: block;
  color: #666;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
}

.remind-toggle { display: inline-flex; align-items: center; gap: 0.35rem; white-space: nowrap; }
.remind-toggle input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: var(--primary-color); }

.add-occurrence-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
.occ-hint { color: #666; font-size: 0.8rem; }
.occ-list { list-style: none; padding: 0; margin: 0.25rem 0 0 0; display: flex; flex-direction: column; gap: 0.35rem; }
.occ-item { display: flex; align-items: center; justify-content: space-between; background: var(--cell-background-color); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.35rem 0.5rem; }
.occ-date { color: var(--text-color); font-size: 0.9rem; }
.occ-remove { border: 1px solid #e74c3c; background: #e74c3c; color: #fff; border-radius: 4px; padding: 0.25rem 0.5rem; font-size: 0.8rem; cursor: pointer; }
.occ-remove:hover { opacity: 0.9; }
.occ-empty { color: #888; font-size: 0.85rem; }
.set-visit-btn { margin-left: 0.25rem; height: 36px; padding: 0 0.6rem; border: 1px solid var(--primary-color); background: var(--primary-color); color: #fff; border-radius: 4px; font-size: 0.85rem; }
.set-visit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.reminder-select { position: relative; display: flex; align-items: center; gap: 0.35rem; margin-top: 0.5rem; flex-wrap: wrap; }
.chip-label { font-size: 0.85rem; color: #666; }
.reminder-dropdown { border: 1px solid var(--border-color); background: var(--cell-background-color); color: var(--text-color); border-radius: 6px; padding: 0.25rem 0.6rem; font-size: 0.9rem; cursor: pointer; }
.reminder-menu { position: absolute; top: calc(100% + 6px); left: 0; background: var(--background-color); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 10px 20px rgba(0,0,0,0.15); padding: 0.5rem; z-index: 2000; min-width: 240px; }
.reminder-option { display: block; width: 100%; text-align: left; padding: 0.4rem 0.5rem; border: 1px solid transparent; background: transparent; border-radius: 6px; cursor: pointer; margin-bottom: 0.25rem; color: var(--text-color); }
.reminder-option:hover { background: var(--cell-background-color); }
.reminder-option.active { background: var(--cell-background-color); border-color: var(--border-color); }
.reminder-custom { padding: 0.25rem 0.25rem 0.1rem 0.25rem; border-top: 1px dashed var(--border-color); margin-top: 0.35rem; }
.custom-title { font-size: 0.85rem; color: #666; }
.custom-inputs { display: flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem; }
.num-input { width: 3.5rem; padding: 0.25rem 0.35rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--cell-background-color); color: var(--text-color); }
.apply-btn { border: 1px solid var(--primary-color); background: var(--primary-color); color: #fff; border-radius: 6px; padding: 0.25rem 0.6rem; font-size: 0.85rem; }

/* Ultra-compact custom select for mobile */
.phone-ministry-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.phone-wrapper {
  flex: 1;
}

.phone-wrapper input {
  width: 100%;
  height: 36px;
}

.day-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mini-select { position: relative; flex: 1.5; }
.mini-trigger {
  width: 100%;
  height: 36px;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--cell-background-color);
  color: var(--text-color);
  text-align: left;
  font-size: 0.85rem;
}
.mini-trigger .caret { float: right; }

.day-time-wrapper {
  flex: 1;
  min-width: 0;
}

.day-time-input {
  width: 100%;
  height: 36px;
}
.mini-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.15);
  z-index: 2000;
  max-height: 45vh;
  overflow: auto;
}
.mini-option {
  display: block;
  width: 100%;
  padding: 0.5rem 0.6rem;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 0.85rem;
  color: var(--text-color);
}
.mini-option:hover { background: var(--cell-background-color); }

/* Button ordering for tablet/desktop - Cancel first, Update Contact second */
@media (min-width: 769px) {
  .action-cancel {
    order: 1;
  }
  
  .action-primary {
    order: 2;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .drawer-overlay {
    padding: 0.5rem;
    align-items: flex-end; /* bottom sheet style on mobile */
  }
  
  .drawer-content {
    max-height: 92dvh;
    width: 100%;
    max-width: 600px;
    border-radius: 14px 14px 0 0;
  }
  
  .drawer-header,
  .contact-form {
    padding: 1rem;
  }
  
  .sheet-footer {
    flex-direction: column;
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  /* On mobile, keep original order - Update Contact first, Cancel second */
  .action-primary {
    order: 1;
  }
  
  .action-cancel {
    order: 2;
  }
  
  .action-buttons {
    justify-content: center;
  }
}
</style> 