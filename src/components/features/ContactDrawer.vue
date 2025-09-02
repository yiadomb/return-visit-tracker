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

        <!-- Phone -->
        <div class="form-group">
          <label for="phone">Phone</label>
          <input
            id="phone"
            v-model="formData.phone"
            type="tel"
            placeholder="0244444444"
            pattern="[0-9]{10}"
            autocomplete="off"
            :class="{ 'error': errors.phone }"
            :readonly="mode === 'view'"
            :disabled="mode === 'view'"
          />
          <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
        </div>

        <!-- Bucket (custom small dropdown) -->
        <div class="form-group">
          <label>Day *</label>
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
        </div>

        <!-- Next Visit Date & Time -->
        <div class="form-group">
          <label for="next_visit_at">Next Visit</label>
          <div class="datetime-inputs">
            <input
              id="next_visit_at"
              v-model="formData.next_visit_date"
              type="date"
              :min="today"
              class="date-input"
              :readonly="mode === 'view'"
              :disabled="mode === 'view'"
            />
            <input
              id="next_visit_time"
              v-model="formData.next_visit_time"
              type="time"
              class="time-input"
              :readonly="mode === 'view'"
              :disabled="mode === 'view'"
            />
          </div>
          <label class="remind-toggle">
            <input type="checkbox" v-model="remindMe" />
            Remind me
          </label>
        </div>

        <!-- Ministry Tag (custom small dropdown) -->
        <div class="form-group">
          <label>Ministry Context</label>
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

        <!-- Action Buttons -->
        <div class="form-actions">
          <template v-if="mode === 'view'">
            <button type="button" @click="$emit('close')" class="btn-secondary">
              Close
            </button>
            <button type="button" class="btn-primary" @click="$emit('toggle-edit')">
              Edit
            </button>
          </template>
          <template v-else>
            <button type="button" @click="$emit('close')" class="btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Saving...' : (isEditing ? 'Update' : 'Add') }} Contact
            </button>
          </template>
        </div>

        <!-- Quick Actions (for editing only) -->
        <div v-if="mode !== 'add'" class="quick-actions">
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
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue'
import { BUCKETS, MINISTRY_TAGS } from '../../services/db.js'

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
  emits: ['close', 'save', 'delete', 'archive'],
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

    const formData = reactive({
      name: '',
      phone: '',
      bucket: 'Saturday',
      hostel_name: '',
      location_detail: '',
      next_visit_date: '',
      next_visit_time: '',
      tags: '',
      notes: '',
      reminders: ['-30']
    })
    const remindMe = ref(true)
    const showBucketMenu = ref(false)
    const showTagMenu = ref(false)
    const bucketSelectRef = ref(null)
    const tagSelectRef = ref(null)

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
        if (newContact.reminders) {
          formData.reminders = [...newContact.reminders]
          remindMe.value = formData.reminders.length > 0
        } else if (newContact.reminder_offset !== undefined) {
          formData.reminders = [String(newContact.reminder_offset)]
          remindMe.value = true
        } else {
          remindMe.value = true
        }
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
        remindMe.value = true
      }
      errors.value = {}
    }, { immediate: true })

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

      // Combine date and time into next_visit_at
      if (contactData.next_visit_date) {
        if (contactData.next_visit_time) {
          contactData.next_visit_at = `${contactData.next_visit_date}T${contactData.next_visit_time}`
        } else {
          contactData.next_visit_at = `${contactData.next_visit_date}T10:00`
        }
      } else {
        contactData.next_visit_at = ''
      }

      delete contactData.next_visit_date
      delete contactData.next_visit_time

      // Map toggle to default reminder: 1 hour before the selected time
      contactData.reminders = remindMe.value ? ['-60'] : []

      emit('save', contactData)
    }

    // Handle overlay click (close drawer)
    const handleOverlayClick = () => {
      emit('close')
    }

          return {
        mode,
        title,
        formData,
        errors,
        today,
        BUCKETS,
        MINISTRY_TAGS,
        remindMe,
        showBucketMenu,
        showTagMenu,
        chooseBucket,
        chooseTag,
        bucketSelectRef,
        tagSelectRef,
        validateForm,
        handleSubmit,
        handleOverlayClick
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
  max-width: 440px;
  max-height: 88vh;
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

.date-input {
  flex: 2;
}

.time-input {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: auto;
  padding: 1rem 0 0.5rem 0;
  border-top: 1px solid var(--border-color);
  background-color: var(--background-color);
  position: sticky;
  bottom: 0;
  z-index: 10;
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

.remind-toggle { display: inline-flex; align-items: center; gap: 0.35rem; white-space: nowrap; }
.remind-toggle input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: var(--primary-color); }

/* Ultra-compact custom select for mobile */
.mini-select { position: relative; width: 100%; }
.mini-trigger {
  width: 100%;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--cell-background-color);
  color: var(--text-color);
  text-align: left;
  font-size: 0.85rem;
}
.mini-trigger .caret { float: right; }
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

/* Mobile responsive */
@media (max-width: 768px) {
  .drawer-overlay {
    padding: 0.5rem;
  }
  
  .drawer-content {
    max-height: 95vh;
  }
  
  .drawer-header,
  .contact-form {
    padding: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .action-buttons {
    justify-content: center;
  }
}
</style> 