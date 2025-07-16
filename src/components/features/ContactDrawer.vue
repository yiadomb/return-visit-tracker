<template>
  <div class="drawer-overlay" @click="handleOverlayClick">
    <div class="drawer-content" @click.stop>
      <div class="drawer-header">
        <h3>{{ isEditing ? 'Edit Contact' : 'Add Contact' }}</h3>
        <button class="close-btn" @click="$emit('close')" aria-label="Close">
          ×
        </button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="contact-form">
        <!-- Name -->
        <div class="form-group">
          <label for="name">Name *</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            placeholder="Enter contact name"
            required
            autocomplete="off"
            :class="{ 'error': errors.name }"
          />
          <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
        </div>

        <!-- Hostel Name -->
        <div class="form-group">
          <label for="hostel_name">Hostel/Location</label>
          <input
            id="hostel_name"
            v-model="formData.hostel_name"
            type="text"
            placeholder="Garden View Hostel"
          />
        </div>

        <!-- Location Detail -->
        <div class="form-group">
          <label for="location_detail">Location Details</label>
          <input
            id="location_detail"
            v-model="formData.location_detail"
            type="text"
            placeholder="Floor 3, Room 15, Near main gate"
          />
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea
            id="notes"
            v-model="formData.notes"
            placeholder="Any additional notes..."
            rows="3"
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
            placeholder="1234567890"
            pattern="[0-9]{10}"
            autocomplete="off"
            :class="{ 'error': errors.phone }"
          />
          <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
        </div>

        <!-- Bucket -->
        <div class="form-group">
          <label for="bucket">Day *</label>
          <select id="bucket" v-model="formData.bucket" required>
            <option v-for="bucket in BUCKETS" :key="bucket" :value="bucket">
              {{ bucket }}
            </option>
          </select>
        </div>

        <!-- Next Visit Date & Time -->
        <div class="form-group">
          <label for="next_visit_at">Next Visit Date</label>
          <div class="datetime-inputs">
            <input
              id="next_visit_at"
              v-model="formData.next_visit_date"
              type="date"
              :min="today"
              class="date-input"
            />
            <input
              id="next_visit_time"
              v-model="formData.next_visit_time"
              type="time"
              class="time-input"
            />
          </div>
        </div>

        <!-- Reminders -->
        <div class="form-group">
          <label>Reminders</label>
          <div class="reminder-checkboxes">
            <label v-for="option in REMINDER_OPTIONS" :key="option.value">
              <input
                type="checkbox"
                :value="option.value"
                v-model="formData.reminders"
              />
              {{ option.label }}
            </label>
          </div>
        </div>

        <!-- Ministry Tag -->
        <div class="form-group">
          <label for="tags">Ministry Context</label>
          <select id="tags" v-model="formData.tags">
            <option value="">Select context...</option>
            <option v-for="tag in MINISTRY_TAGS" :key="tag" :value="tag">
              {{ tag }}
            </option>
          </select>
        </div>

        <!-- Action Buttons -->
        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Saving...' : (isEditing ? 'Update' : 'Add') }} Contact
          </button>
        </div>

        <!-- Quick Actions (for editing only) -->
        <div v-if="isEditing" class="quick-actions">
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
import { REMINDER_OPTIONS } from '../../services/reminders.js'

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
  emits: ['close', 'save', 'delete'],
  setup(props, { emit }) {
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
        } else if (newContact.reminder_offset !== undefined) {
          formData.reminders = [String(newContact.reminder_offset)]
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
      }
      errors.value = {}
    }, { immediate: true })

    // Validation
    const validateForm = () => {
      errors.value = {}

      if (!formData.name.trim()) {
        errors.value.name = 'Name is required'
      }

      if (formData.phone && !formData.phone.match(/^\d{10}$/)) {
        errors.value.phone = 'Phone must be 10 digits'
      }

      return Object.keys(errors.value).length === 0
    }

    // Handle form submission
    const handleSubmit = () => {
      if (!validateForm()) {
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

      // Ensure reminders array exists
      if (!Array.isArray(contactData.reminders) || contactData.reminders.length === 0) {
        contactData.reminders = ['-30']
      }

      emit('save', contactData)
    }

    // Handle overlay click (close drawer)
    const handleOverlayClick = () => {
      emit('close')
    }

          return {
        formData,
        errors,
        today,
        BUCKETS,
        MINISTRY_TAGS,
        REMINDER_OPTIONS,
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
  max-width: 500px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem 1.5rem;
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
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

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
  font-size: 0.9rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
  background-color: var(--cell-background-color);
  color: var(--text-color);
  transition: border-color 0.2s ease;
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

.datetime-inputs {
  display: flex;
  gap: 0.5rem;
}

.date-input {
  flex: 2;
}

.time-input {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-size: 1rem;
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

.action-btn.delete {
  background-color: #e74c3c;
  color: white;
}

.action-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.reminder-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.reminder-checkboxes label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-color);
}

.reminder-checkboxes input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: var(--primary-color);
}

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