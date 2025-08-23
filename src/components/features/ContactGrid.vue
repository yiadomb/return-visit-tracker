<template>
  <div class="contact-grid">
    <!-- Desktop: Full Grid -->
    <div class="grid-container" :class="{ 'mobile-view': isMobile }">
      <div class="grid-toolbar">
        <div class="search-wrap">
          <input
            ref="searchInputRef"
            class="search-input"
            type="search"
            v-model="searchInput"
            placeholder="search name or hostel"
            @keydown.esc.prevent="clearSearch"
          />
          <span v-if="searchQuery" class="search-count">{{ matchCount }} matches</span>
        </div>
        <div class="toolbar-actions">
          <div class="dropdown" @keydown.esc="showFilterMenu=false" ref="filterDropdownRef">
            <button class="filter-btn" @click="toggleFilters">Filter</button>
            <div v-if="showFilterMenu" class="filter-menu" @click.stop>
              <div class="tag-checkboxes">
                <label v-for="tag in allTags" :key="tag" class="tag-option">
                  <input type="checkbox" :value="tag" v-model="selectedTags" />
                  {{ tag }}
                </label>
              </div>
              <div class="filter-actions">
                <button class="apply-btn" @click="showFilterMenu=false">Done</button>
                <button class="clear-btn" @click="clearTags">Clear</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Chips below toolbar so they never get squeezed out -->
      <div class="chips-collapsible">
        <button class="chips-toggle" @click="chipsExpanded = !chipsExpanded" :aria-expanded="chipsExpanded">
          Days <span class="chev" :class="{ open: chipsExpanded }">▾</span>
        </button>
        <div v-show="chipsExpanded" class="mobile-day-chips toolbar-chips">
          <div class="chips-row">
      <button 
              v-for="bucket in chipRow1"
              :key="bucket"
              class="chip"
              :class="{ active: selectedBucket === bucket }"
              @click="selectMobileDay(bucket)"
            >
              {{ getShortDayName(bucket) }}
      </button>
        </div>
          <div class="chips-row">
      <button 
              v-for="bucket in chipRow2"
              :key="bucket"
              class="chip"
              :class="{ active: selectedBucket === bucket }"
              @click="selectMobileDay(bucket)"
            >
              {{ getSpecialLabel(bucket) }}
      </button>
    </div>
        </div>
      </div>
      <!-- Service year indicator for desktop -->
      <div v-if="!isMobile && BUCKETS.length > 5" class="scroll-hint">
        <span>2025 Service Year</span>
      </div>
      
      <div v-if="!isMobile" class="bucket-columns" ref="columnsContainer">
        <div 
          v-for="bucket in BUCKETS" 
          :key="bucket" 
          class="bucket-column"
          :data-bucket="bucket"
          @drop="handleDrop($event, bucket)"
          @dragover.prevent="handleDragOver($event, bucket)"
          @dragenter.prevent="handleDragEnter($event, bucket)"
          @dragleave.prevent="handleDragLeave($event, bucket)"
          :class="{ 'drag-over': dragOverBucket === bucket }"
        >
          <div class="bucket-header">
            <h3>{{ bucket }}</h3>
            <span class="contact-count">({{ getBucketContacts(bucket).length }})</span>
          </div>
          
          <div class="contacts-in-bucket">
            <div 
              v-for="(contact, index) in getBucketContacts(bucket)" 
              :key="contact.id"
              class="contact-wrapper"
              @dragover.prevent="handleContactDragOver($event, bucket, index)"
              @dragenter.prevent="handleContactDragEnter($event, bucket, index)"
              @dragleave.prevent="handleContactDragLeave"
              @drop="handleContactDrop($event, bucket, index)"
            >
              <!-- Insertion line (only visible when dragging) -->
              <div 
                v-if="draggedContact && dragOverPosition === `${bucket}-${index}-top`"
                class="insertion-line"
              ></div>
              <!-- Peek actions: show a small View button after single click -->
              <div v-if="armedContactId === contact.id" class="peek-actions">
                <button class="peek-btn" @click.stop="openContactDrawerView(contact)">View</button>
              </div>
              <div 
                class="contact-cell"
                :draggable="!isPhone && !isAnyCellEditing"
                @dragstart="handleDragStart($event, contact)"
                @dragend="handleDragEnd"
                @click="armPreview(contact, $event)"
                @contextmenu.prevent
                :class="{ armed: armedContactId === contact.id }"
              >
                <!-- Name -->
                <div class="contact-name">
                  <template v-if="isCellEditing(contact, 'name')">
                    <input
                      class="inline-input"
                      v-model="editBuffer"
                      autofocus
                      @keyup.enter="commitEdit(contact, 'name')"
                      @keyup.esc="cancelEdit"
                      @blur="commitEdit(contact, 'name')"
                    />
                  </template>
                  <template v-else>
                    <span v-html="highlight(contact.name)"></span>
                  </template>
                </div>
                <!-- Peek actions: show a small View button after single tap -->
                <div v-if="armedContactId === contact.id" class="peek-actions mobile">
                  <button class="peek-btn" @click.stop="openContactDrawerView(contact)">View</button>
                </div>
                <!-- Hostel -->
                <div class="contact-hostel" :style="getHostelStyle(contact.hostel_name)">
                  <template v-if="isCellEditing(contact, 'hostel_name')">
                    <input
                      class="inline-input"
                      v-model="editBuffer"
                      autofocus
                      @keyup.enter="commitEdit(contact, 'hostel_name')"
                      @keyup.esc="cancelEdit"
                      @blur="commitEdit(contact, 'hostel_name')"
                    />
                  </template>
                  <template v-else>
                    <span v-html="highlight(contact.hostel_name || 'No hostel')"></span>
                  </template>
                </div>

                <!-- Date & Notes -->
                <div class="contact-date-notes" v-if="contact.next_visit_at || contact.notes || isCellEditing(contact, 'next_visit_at') || isCellEditing(contact, 'notes')">
                  <!-- Date -->
                  <span class="contact-date">
                    <template v-if="isCellEditing(contact, 'next_visit_at')">
                      <input type="date" class="inline-input date" v-model="editBufferDate" />
                      <input type="time" class="inline-input time" v-model="editBufferTime" />
                      <button class="inline-save" @click.stop="commitEdit(contact, 'next_visit_at')">Save</button>
                    </template>
                    <template v-else>
                      <span v-if="contact.next_visit_at">{{ formatDate(contact.next_visit_at) }}</span>
                    </template>
                  </span>

                  <!-- Notes -->
                  <span class="contact-notes">
                    <template v-if="isCellEditing(contact, 'notes')">
                      <input
                        class="inline-input"
                        v-model="editBuffer"
                        autofocus
                        @keyup.enter="commitEdit(contact, 'notes')"
                        @keyup.esc="cancelEdit"
                        @blur="commitEdit(contact, 'notes')"
                      />
                    </template>
                    <template v-else>
                      <span v-if="contact.notes">{{ contact.notes }}</span>
                    </template>
                  </span>
                </div>
              </div>
              
              
              <!-- Insertion line (only visible when dragging) -->
              <div 
                v-if="draggedContact && dragOverPosition === `${bucket}-${index}-bottom`"
                class="insertion-line"
              ></div>
            </div>
            
            <!-- Add contact button for each bucket -->
            <button 
              class="add-contact-btn"
              @click="openAddContactDrawer(bucket)"
            >
              + Add Contact
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile: Carousel Columns View -->
      <div 
        v-else 
        class="mobile-carousel-container" 
        ref="carouselContainer"
        @touchstart.passive="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend.passive="handleTouchEnd"
        @wheel.passive="handleWheel"
      >
        <div 
          class="mobile-carousel-columns"
          :class="{ 'transitioning': isTransitioning }"
        >
          <div 
            v-for="bucket in getVisibleBuckets()" 
            :key="bucket" 
            class="mobile-bucket-column"
          >
            <div class="mobile-bucket-header">
              <h3>{{ bucket }}</h3>
              <span class="mobile-contact-count">({{ getBucketContacts(bucket).length }})</span>
            </div>
            
            <div class="mobile-contacts-in-bucket">
              <div 
                v-for="contact in getBucketContacts(bucket)" 
                :key="contact.id"
                class="contact-cell mobile"
                :draggable="false"
                @click="armPreview(contact, $event)"
                @touchstart.passive="onTouchStartCell(contact, $event)"
                @touchmove.passive="onTouchMoveCell($event)"
                @touchend.passive="onTouchEndCell(contact, $event)"
                @dblclick.stop="openContactDrawerView(contact)"
                @contextmenu.prevent
                :class="{ armed: armedContactId === contact.id }"
              >
                <!-- Mobile: no single-tap edit; use long-press or drawer -->
                <div class="contact-name">
                  <template v-if="isCellEditing(contact, 'name')">
                    <input
                      class="inline-input"
                      v-model="editBuffer"
                      autofocus
                      @keyup.enter="commitEdit(contact, 'name')"
                      @keyup.esc="cancelEdit"
                      @blur="commitEdit(contact, 'name')"
                    />
                  </template>
                  <template v-else>
                    <span v-html="highlight(contact.name)"></span>
                  </template>
                </div>
                <div class="contact-hostel" :style="getHostelStyle(contact.hostel_name)">
                  <template v-if="isCellEditing(contact, 'hostel_name')">
                    <input
                      class="inline-input"
                      v-model="editBuffer"
                      autofocus
                      @keyup.enter="commitEdit(contact, 'hostel_name')"
                      @keyup.esc="cancelEdit"
                      @blur="commitEdit(contact, 'hostel_name')"
                    />
                  </template>
                  <template v-else>
                    <span v-html="highlight(contact.hostel_name || 'No hostel')"></span>
                  </template>
                </div>
                <div class="contact-date-notes mobile">
                  <span class="contact-date">
                    <template v-if="isCellEditing(contact, 'next_visit_at')">
                      <input type="date" class="inline-input date" v-model="editBufferDate" />
                      <input type="time" class="inline-input time" v-model="editBufferTime" />
                      <button class="inline-save" @click.stop="commitEdit(contact, 'next_visit_at')">Save</button>
                    </template>
                    <template v-else>
                      <span v-if="contact.next_visit_at">{{ formatDate(contact.next_visit_at) }}</span>
                    </template>
                  </span>
                  <span class="contact-notes mobile">
                    <template v-if="isCellEditing(contact, 'notes')">
                      <input
                        class="inline-input"
                        v-model="editBuffer"
                        autofocus
                        @keyup.enter="commitEdit(contact, 'notes')"
                        @keyup.esc="cancelEdit"
                        @blur="commitEdit(contact, 'notes')"
                      />
                    </template>
                    <template v-else>
                      <span v-if="contact.notes">{{ contact.notes }}</span>
                    </template>
                  </span>
                </div>
                
              </div>
              
              <!-- Add contact button for each bucket -->
              <button 
                class="add-contact-btn mobile"
                @click="openAddContactDrawer(bucket)"
              >
                + Add Contact
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Drawer -->
    <ContactDrawer
      v-if="showContactDrawer"
      :contact="selectedContact"
      :isEditing="isEditing"
      :loading="saving"
      @close="closeDrawer"
      @save="handleSaveContact"
      @delete="handleDeleteContact"
      @toggle-edit="switchToEdit"
      @move="handleMoveDay"
    />
    <!-- Phone move sheet -->
    <div v-if="moveSheetVisible" class="move-sheet-overlay" @click="closeMoveSheet">
      <div class="move-sheet" @click.stop>
        <h4>Move to Day</h4>
        <div class="chips-row">
          <button v-for="b in chipRow1" :key="b" class="chip" @click="handleMoveDayFromSheet(b)">{{ getShortDayName(b) }}</button>
        </div>
        <div class="chips-row" style="margin-top: 0.25rem;">
          <button v-for="b in chipRow2" :key="b" class="chip" @click="handleMoveDayFromSheet(b)">{{ getSpecialLabel(b) }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useContacts } from '../../composables/useDb.js'
import ContactDrawer from './ContactDrawer.vue'

export default {
  name: 'ContactGrid',
  components: {
    ContactDrawer
  },
  setup() {
    const { contacts, BUCKETS, addContact, updateContact, deleteContact, MINISTRY_TAGS } = useContacts()
    
    // Responsive state
    const isMobile = ref(false)
    const isPhone = ref(false)
    const isTouchDevice = ref(false)
    const selectedBucket = ref('')
    const columnsContainer = ref(null)
    const chipsExpanded = ref(true)
    const chipRow1 = computed(() => ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'])
    const chipRow2 = computed(() => ['Flexible','NotAtHomes','Others'])
    const selectMobileDay = (bucket) => {
      selectedBucket.value = bucket
      // Align carousel or scroll desktop columns accordingly
      const idx = BUCKETS.indexOf(bucket)
      if (isMobile.value) {
        carouselIndex.value = Math.min(Math.max(idx, 0), Math.max(BUCKETS.length - 1, 0))
      } else if (columnsContainer.value) {
        const el = columnsContainer.value.querySelector(`[data-bucket="${bucket}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
        }
      }
    }
    
    // Mobile carousel state
    const carouselIndex = ref(0)
    const carouselContainer = ref(null)
    const isTransitioning = ref(false)
    const maxStartIndex = computed(() => BUCKETS.length - (isMobile.value ? 1 : 2))

    const syncSelectedToIndex = () => {
      const idx = Math.min(Math.max(carouselIndex.value, 0), BUCKETS.length - 1)
      selectedBucket.value = BUCKETS[idx]
    }
    
    // Touch/swipe state
    const touchStartX = ref(0)
    const touchStartY = ref(0)
    const isDragging = ref(false)
    
    // Drawer state
    const showContactDrawer = ref(false)
    // Feature flags
    const enableMobileReorder = ref(true)

    const selectedContact = ref(null)
    const isEditing = ref(false)
    const saving = ref(false)

    // Inline edit state
    const editingContactId = ref(null)
    const editingField = ref('')
    const editBuffer = ref('')
    const editBufferDate = ref('')
    const editBufferTime = ref('')
    const isAnyCellEditing = computed(() => !!editingContactId.value)
    const openContactDrawerView = (contact) => {
      selectedContact.value = contact
      // Open in edit mode for all devices per request
      isEditing.value = true
      showContactDrawer.value = true
    }

    // Mobile long-press detection with movement threshold to avoid accidental triggers during scrolls/swipes
    let touchTimer = null
    const longPressTriggered = ref(false)
    const touchStartPoint = ref({ x: 0, y: 0 })
    const movedBeyondThreshold = ref(false)
    const LONG_PRESS_MS = 500
    const MOVE_THRESHOLD_PX = 12

    const onTouchStartCell = (contact, event) => {
      const t = event.touches && event.touches[0]
      touchStartPoint.value = { x: t ? t.clientX : 0, y: t ? t.clientY : 0 }
      movedBeyondThreshold.value = false
      longPressTriggered.value = false
      clearTimeout(touchTimer)
      touchTimer = setTimeout(() => {
        if (!movedBeyondThreshold.value) {
          if (isPhone.value) {
            pendingMoveContact.value = contact
            moveSheetVisible.value = true
            longPressTriggered.value = true
          } else {
            openContactDrawerView(contact)
          }
        }
      }, LONG_PRESS_MS)
    }

    const onTouchMoveCell = (event) => {
      const t = event.touches && event.touches[0]
      if (!t) return
      const dx = Math.abs(t.clientX - touchStartPoint.value.x)
      const dy = Math.abs(t.clientY - touchStartPoint.value.y)
      if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) {
        movedBeyondThreshold.value = true
        clearTimeout(touchTimer)
      }
    }

    const onTouchEndCell = (contact, event) => {
      clearTimeout(touchTimer)
      // If not a long-press and not a scroll, show the peek pill on touch end
      if (!longPressTriggered.value && !movedBeyondThreshold.value) {
        armPreview(contact)
      }
      setTimeout(() => { longPressTriggered.value = false; movedBeyondThreshold.value = false }, 50)
    }

    const isCellEditing = (contact, field) => editingContactId.value === contact.id && editingField.value === field

    // Peek button logic
    const armedContactId = ref(null)
    let armTimeout = null
    const armPreview = (contact, event) => {
      if (longPressTriggered.value) {
        // Skip peek if we just did a long-press action
        return
      }
      armedContactId.value = contact.id
      clearTimeout(armTimeout)
      armTimeout = setTimeout(() => { armedContactId.value = null }, 2500)
    }

    const startEdit = (contact, field) => {
      editingContactId.value = contact.id
      editingField.value = field
      if (field === 'next_visit_at') {
        if (contact.next_visit_at) {
          const d = new Date(contact.next_visit_at)
          editBufferDate.value = d.toISOString().split('T')[0]
          editBufferTime.value = d.toTimeString().slice(0,5)
        } else {
          editBufferDate.value = ''
          editBufferTime.value = ''
        }
      } else {
        editBuffer.value = contact[field] || ''
      }
    }

    const cancelEdit = () => {
      editingContactId.value = null
      editingField.value = ''
      editBuffer.value = ''
      editBufferDate.value = ''
      editBufferTime.value = ''
    }

    const commitEdit = async (contact, field) => {
      try {
        const changes = {}
        if (field === 'next_visit_at') {
          if (editBufferDate.value) {
            const t = editBufferTime.value || '10:00'
            changes.next_visit_at = `${editBufferDate.value}T${t}`
          } else {
            changes.next_visit_at = ''
          }
        } else {
          changes[field] = editBuffer.value
        }
        await updateContact(contact.id, changes)
      } finally {
        cancelEdit()
      }
    }

    // Drag and drop state
    const draggedContact = ref(null)
    const dragOverBucket = ref(null)
    const dragOverPosition = ref(null)

    // Check if mobile
    const checkMobile = () => {
      const w = window.innerWidth
      isMobile.value = w <= 1024
      isPhone.value = w <= 600
    }

    // Always show chips (requested), they wrap nicely on wide screens
    const showChips = computed(() => true)

    // Filter contacts by bucket for mobile
    const filteredContacts = computed(() => {
      if (!selectedBucket.value) return contacts.value
      return contacts.value.filter(contact => contact.bucket === selectedBucket.value)
    })

    // Tag filter
    const selectedTags = ref([])
    // Search
    const searchInput = ref('')
    const searchInputRef = ref(null)
    const searchQuery = computed(() => searchInput.value.trim().toLowerCase())
    const clearSearch = () => { searchInput.value = '' }
    const highlight = (text) => {
      const q = searchQuery.value
      if (!q || !text) return (text || '')
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return (text || '').replace(new RegExp(esc, 'gi'), (m) => `<mark>${m}</mark>`)
    }

    // Filter dropdown
    const showFilterMenu = ref(false)
    const filterDropdownRef = ref(null)
    const toggleFilters = () => { showFilterMenu.value = !showFilterMenu.value }
    const clearTags = () => { selectedTags.value = [] }
    const allTags = computed(() => MINISTRY_TAGS)

    // Sorting state (keep manual only for now)
    const sortField = ref('manual')
    const sortDir = ref('asc')

    // Get contacts for a specific bucket
    const getBucketContacts = (bucket) => {
      let list = contacts.value.filter(contact => contact.bucket === bucket)

      // Search by name or hostel (AND with tag filters)
      if (searchQuery.value) {
        list = list.filter(c => {
          const n = (c.name || '').toLowerCase()
          const h = (c.hostel_name || '').toLowerCase()
          return n.includes(searchQuery.value) || h.includes(searchQuery.value)
        })
      }

      // Multi-tag filter (Any): items whose tag matches any selected
      if (selectedTags.value.length > 0) {
        list = list.filter(c => {
          const tag = (c.tags || '').trim()
          if (!tag) return false
          return selectedTags.value.includes(tag)
        })
      }

      // Sorting
      if (sortField.value === 'manual') {
        list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      } else if (sortField.value === 'name') {
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      } else if (sortField.value === 'date') {
        const toTs = v => v ? new Date(v).getTime() : 0
        list.sort((a, b) => toTs(a.next_visit_at) - toTs(b.next_visit_at))
      } else if (sortField.value === 'hostel') {
        list.sort((a, b) => (a.hostel_name || '').localeCompare(b.hostel_name || ''))
      }

      if (sortDir.value === 'desc') list.reverse()
      return list
    }

    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }

    // Drawer actions
    const openContactDrawer = (contact) => {
      selectedContact.value = contact
      isEditing.value = true
      showContactDrawer.value = true
    }

    const openAddContactDrawer = (bucket = 'Saturday') => {
      selectedContact.value = { bucket }
      isEditing.value = false
      showContactDrawer.value = true
    }

    const closeDrawer = () => {
      showContactDrawer.value = false
      selectedContact.value = null
      isEditing.value = false
    }

    const switchToEdit = () => {
      isEditing.value = true
    }

    const handleMoveDay = async (bucket) => {
      if (!selectedContact.value || !selectedContact.value.id) return
      try {
        await updateContact(selectedContact.value.id, { bucket })
      } finally {
        // Keep drawer open
      }
    }

    // Move sheet state (phones)
    const moveSheetVisible = ref(false)
    const pendingMoveContact = ref(null)
    const closeMoveSheet = () => {
      moveSheetVisible.value = false
      pendingMoveContact.value = null
    }
    const handleMoveDayFromSheet = async (bucket) => {
      if (!pendingMoveContact.value) return
      try {
        await updateContact(pendingMoveContact.value.id, { bucket })
      } finally {
        closeMoveSheet()
      }
    }

    const selectDay = (bucket) => {
      selectedBucket.value = bucket
    }

    // Mobile carousel navigation
    const getVisibleBuckets = () => {
      if (isMobile.value) {
        if (!selectedBucket.value) {
          selectedBucket.value = BUCKETS[carouselIndex.value]
        }
        return [selectedBucket.value]
      }
      return BUCKETS.slice(carouselIndex.value, carouselIndex.value + 2)
    }

    const goToNextDay = async () => {
      if (carouselIndex.value < maxStartIndex.value && !isTransitioning.value) {
        isTransitioning.value = true
        carouselIndex.value++
        syncSelectedToIndex()
        
        // Add a small delay for smooth animation
        setTimeout(() => {
          isTransitioning.value = false
        }, 300)
      }
    }

    const goToPrevDay = async () => {
      if (carouselIndex.value > 0 && !isTransitioning.value) {
        isTransitioning.value = true
        carouselIndex.value--
        syncSelectedToIndex()
        
        // Add a small delay for smooth animation
        setTimeout(() => {
          isTransitioning.value = false
        }, 300)
      }
    }

    const goToDay = (dayIndex) => {
      // Ensure the selected day is visible in the carousel
      if (dayIndex < carouselIndex.value) {
        carouselIndex.value = Math.max(0, dayIndex)
      } else if (dayIndex >= carouselIndex.value + 2) {
        carouselIndex.value = Math.min(maxStartIndex.value, dayIndex - 1)
      }
      syncSelectedToIndex()
    }

    const canGoPrev = computed(() => carouselIndex.value > 0)
    const canGoNext = computed(() => carouselIndex.value < maxStartIndex.value)

    // Touch and swipe handlers
    const handleTouchStart = (event) => {
      if (!isMobile.value || isTransitioning.value) return
      
      const touch = event.touches[0]
      touchStartX.value = touch.clientX
      touchStartY.value = touch.clientY
      isDragging.value = true
    }

    const handleTouchMove = (event) => {
      if (!isDragging.value || !isMobile.value) return
      
      // Prevent default scrolling behavior during horizontal swipes
      const touch = event.touches[0]
      const deltaX = Math.abs(touch.clientX - touchStartX.value)
      const deltaY = Math.abs(touch.clientY - touchStartY.value)
      
      // If horizontal movement is greater than vertical, prevent default
      if (deltaX > deltaY && deltaX > 20) {
        event.preventDefault()
      }
    }

    const handleTouchEnd = (event) => {
      if (!isDragging.value || !isMobile.value || isTransitioning.value) {
        isDragging.value = false
        return
      }
      
      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - touchStartX.value
      const deltaY = Math.abs(touch.clientY - touchStartY.value)
      
      // Only trigger swipe if horizontal movement is significant and greater than vertical
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY) {
        if (deltaX > 0 && canGoPrev.value) {
          goToPrevDay() // Swipe right = go to previous day
        } else if (deltaX < 0 && canGoNext.value) {
          goToNextDay() // Swipe left = go to next day
        }
      }
      
      isDragging.value = false
    }

    // Mouse wheel and trackpad gesture support for desktop
    const handleWheel = (event) => {
      if (isMobile.value || isTransitioning.value) return
      
      // Detect horizontal scrolling (two-finger swipe on trackpad)
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 20) {
        event.preventDefault()
        
        if (event.deltaX > 0 && canGoNext.value) {
          goToNextDay()
        } else if (event.deltaX < 0 && canGoPrev.value) {
          goToPrevDay()
        }
      }
    }

    // Create short names for mobile tabs
    const getShortDayName = (bucket) => {
      const shortNames = {
        'Saturday': 'Sat',
        'Sunday': 'Sun', 
        'Monday': 'Mon',
        'Tuesday': 'Tue',
        'Wednesday': 'Wed',
        'Thursday': 'Thu',
        'Friday': 'Fri',
        'Flexible': 'Flexible',
        'Others': 'Others',
        'NotAtHomes': 'NAH'
      }
      return shortNames[bucket] || bucket
    }

    const getSpecialLabel = (bucket) => {
      if (bucket === 'Flexible') return 'Flexible days'
      if (bucket === 'NotAtHomes') return 'Not at homes'
      if (bucket === 'Others') return 'Others'
      return bucket
    }

    // Handle save contact (add or edit)
    const handleSaveContact = async (contactData) => {
      saving.value = true
      try {
        if (isEditing.value && selectedContact.value.id) {
          // Update existing contact
          await updateContact(selectedContact.value.id, contactData)
        } else {
          // Add new contact
          await addContact(contactData)
        }
        closeDrawer()
      } catch (error) {
        console.error('Error saving contact:', error)
        // You could show a toast notification here
        alert('Error saving contact. Please try again.')
      } finally {
        saving.value = false
      }
    }

    // Handle delete contact
    const handleDeleteContact = async (contactId) => {
      if (!confirm('Are you sure you want to delete this contact?')) {
        return
      }
      
      saving.value = true
      try {
        await deleteContact(contactId)
        closeDrawer()
      } catch (error) {
        console.error('Error deleting contact:', error)
        alert('Error deleting contact. Please try again.')
      } finally {
        saving.value = false
      }
    }

    // Smart hostel name extraction and color generation
    const extractHostelName = (fullText) => {
      if (!fullText || fullText.trim() === '' || fullText === 'No hostel') return 'default'
      
      const normalized = fullText.toLowerCase().trim()
      
      // Common stop words to ignore
      const stopWords = ['hostel', 'hall', 'residence', 'block', 'room', 'floor', 'building']
      
      // Compound identifiers that should be preserved
      const modifiers = [
        'annex', 'apartment', 'inn', 'lodge', 'court', 'plaza', 'towers',
        'old', 'new', 'north', 'south', 'east', 'west', 'upper', 'lower',
        'phase', '1', '2', '3', 'a', 'b', 'c', 'd', 'e'
      ]
      
      // Split into words and clean
      const words = normalized.split(/[\s,.-_]+/).filter(word => word.length > 0)
      
      // Find base name (first meaningful word that's not a stop word)
      let baseName = ''
      let modifier = ''
      
      for (const word of words) {
        if (!stopWords.includes(word)) {
          if (!baseName) {
            baseName = word
          } else if (modifiers.includes(word)) {
            modifier = word
            break
          }
        }
      }
      
      // Return compound name if modifier exists, otherwise just base name
      return modifier ? `${baseName}_${modifier}` : baseName
    }

    // Generate consistent color from hostel name
    const generateHostelColor = (hostelName) => {
      const extractedName = extractHostelName(hostelName)
      
      if (extractedName === 'default') {
        return {
          background: '#f8f9fb',
          border: '#ddd',
          text: '#666'
        }
      }
      
      // Simple hash function
      let hash = 0
      for (let i = 0; i < extractedName.length; i++) {
        const char = extractedName.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
      }
      
      // Predefined color palette with good contrast
      const colorPalette = [
        { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' }, // Blue family
        { bg: '#f3e5f5', border: '#9c27b0', text: '#7b1fa2' }, // Purple family
        { bg: '#e8f5e8', border: '#4caf50', text: '#388e3c' }, // Green family
        { bg: '#fff3e0', border: '#ff9800', text: '#f57c00' }, // Orange family
        { bg: '#fce4ec', border: '#e91e63', text: '#c2185b' }, // Pink family
        { bg: '#e0f2f1', border: '#009688', text: '#00695c' }, // Teal family
        { bg: '#f1f8e9', border: '#8bc34a', text: '#689f38' }, // Light green family
        { bg: '#e8eaf6', border: '#3f51b5', text: '#303f9f' }, // Indigo family
        { bg: '#fff8e1', border: '#ffc107', text: '#f9a825' }, // Amber family
        { bg: '#ffebee', border: '#f44336', text: '#d32f2f' }, // Red family
        { bg: '#f3e5f5', border: '#673ab7', text: '#512da8' }, // Deep purple family
        { bg: '#e0f7fa', border: '#00bcd4', text: '#0097a7' }  // Cyan family
      ]
      
      const colorIndex = Math.abs(hash) % colorPalette.length
      const colors = colorPalette[colorIndex]
      
      return {
        background: colors.bg,
        border: colors.border,
        text: colors.text
      }
    }

    // Get hostel color styling
    const getHostelStyle = (hostelName) => {
      const colors = generateHostelColor(hostelName)
      return {
        backgroundColor: colors.background,
        borderLeftColor: colors.border,
        color: colors.text
      }
    }

    // Generate different colors for day badges
    const getDayBadgeStyle = (bucket) => {
      const dayColors = {
        'Saturday': { bg: '#4caf50', color: 'white' },      // Nice Green
        'Sunday': { bg: '#ffd700', color: 'black' },        // Gold
        'Monday': { bg: '#2196f3', color: 'white' },        // Blue
        'Tuesday': { bg: '#fff8dc', color: 'black' },       // Cream
        'Wednesday': { bg: '#ff9800', color: 'white' },     // Orange
        'Thursday': { bg: '#9c27b0', color: 'white' },      // Purple
        'Friday': { bg: '#e91e63', color: 'white' },        // Pink
        'Flexible': { bg: '#607d8b', color: 'white' },      // Blue Grey
        'Others': { bg: '#795548', color: 'white' },        // Brown
        'NotAtHomes': { bg: '#f44336', color: 'white' }     // Red
      }
      
      const colors = dayColors[bucket] || { bg: '#3498db', color: 'white' }
      return {
        backgroundColor: colors.bg,
        color: colors.color
      }
    }


    // Lifecycle
    onMounted(() => {
      checkMobile()
      isTouchDevice.value = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
      window.addEventListener('resize', checkMobile)
      // Close filters on outside click
      const onDocClick = (e) => {
        if (!showFilterMenu.value) return
        const root = filterDropdownRef.value
        if (root && !root.contains(e.target)) {
          showFilterMenu.value = false
        }
      }
      document.addEventListener('click', onDocClick)
      // Store to remove later
      window.__rv_onDocClick = onDocClick
    })

    // Drag and drop handlers
    const handleDragStart = (event, contact) => {
      draggedContact.value = contact
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', contact.id)
      
      // Add visual feedback
      event.target.style.opacity = '0.5'
    }

    const handleDragEnd = (event) => {
      event.target.style.opacity = '1'
      draggedContact.value = null
      dragOverBucket.value = null
      dragOverPosition.value = null
      
      // Clean up any pending timeouts
      if (window.dragLeaveTimeout) {
        clearTimeout(window.dragLeaveTimeout)
        window.dragLeaveTimeout = null
      }
    }

    const handleDragOver = (event, bucket) => {
      if (draggedContact.value) {
        dragOverBucket.value = bucket
      }
    }

    const handleDragEnter = (event, bucket) => {
      if (draggedContact.value && event.target.closest('.bucket-column')) {
        dragOverBucket.value = bucket
      }
    }

    const handleDragLeave = (event, bucket) => {
      // Only clear highlight if we're leaving the bucket column entirely
      const bucketElement = event.target.closest('.bucket-column')
      if (!bucketElement || !bucketElement.contains(event.relatedTarget)) {
        dragOverBucket.value = null
      }
    }

    const handleDrop = async (event, targetBucket) => {
      event.preventDefault()
      
      if (!draggedContact.value || draggedContact.value.bucket === targetBucket) {
        draggedContact.value = null
        dragOverBucket.value = null
        return
      }

      const contactName = draggedContact.value.name
      
      try {
        const result = await updateContact(draggedContact.value.id, { bucket: targetBucket })
        console.log(`✅ Successfully moved ${contactName} to ${targetBucket}`, result)
        
        // Only show success feedback if needed (could add a subtle toast instead)
        // console.log('Drag and drop completed successfully')
        
      } catch (error) {
        console.error('❌ Error moving contact:', error)
        
        // Only show error if it's a real failure
        if (error && error.message) {
          alert(`Error moving ${contactName}: ${error.message}`)
        } else {
          console.warn('Unknown error during drag and drop, but operation may have succeeded')
        }
      } finally {
        // Always clean up state
        draggedContact.value = null
        dragOverBucket.value = null
      }
    }

    // Contact-based drag and drop handlers for natural reordering
    const handleContactDragOver = (event, bucket, index) => {
      // Only handle same-day reordering
      if (!draggedContact.value || draggedContact.value.bucket !== bucket) {
        // Let cross-day drag overs bubble up to bucket handler
        return
      }
      
      event.stopPropagation()
      
      // Get the contact element and calculate mouse position relative to it
      const contactElement = event.currentTarget.querySelector('.contact-cell')
      if (!contactElement) return
      
      const rect = contactElement.getBoundingClientRect()
      const mouseY = event.clientY
      const contactCenterY = rect.top + rect.height / 2
      
      // Determine if we should show insertion line above or below
      if (mouseY < contactCenterY) {
        dragOverPosition.value = `${bucket}-${index}-top`
      } else {
        dragOverPosition.value = `${bucket}-${index}-bottom`
      }
    }

    const handleContactDragEnter = (event, bucket, index) => {
      // Only handle same-day reordering
      if (!draggedContact.value || draggedContact.value.bucket !== bucket) {
        // Let cross-day drag enters bubble up to bucket handler
        return
      }
      
      event.stopPropagation()
      
      // Clear any existing timeout
      if (window.dragLeaveTimeout) {
        clearTimeout(window.dragLeaveTimeout)
        window.dragLeaveTimeout = null
      }
    }

    const handleContactDragLeave = (event) => {
      // Only handle same-day reordering drag leaves
      if (!draggedContact.value) return
      
      // Only clear position highlighting if we're leaving the contact wrapper entirely
      if (window.dragLeaveTimeout) {
        clearTimeout(window.dragLeaveTimeout)
      }
      
      window.dragLeaveTimeout = setTimeout(() => {
        if (!event.relatedTarget || !event.relatedTarget.closest('.contact-wrapper')) {
          dragOverPosition.value = null
        }
        window.dragLeaveTimeout = null
      }, 50)
    }

    const handleContactDrop = async (event, targetBucket, targetIndex) => {
      // Only handle same-day reordering; let cross-day drops bubble up to bucket handler
      if (!draggedContact.value || draggedContact.value.bucket !== targetBucket) {
        dragOverPosition.value = null
        // Don't prevent default or stop propagation for cross-day drops
        return
      }
      
      event.preventDefault()
      event.stopPropagation()

      const sourceContact = draggedContact.value
      const contactName = sourceContact.name
      const bucketContacts = getBucketContacts(targetBucket)
      const currentIndex = bucketContacts.findIndex(c => c.id === sourceContact.id)
      
      // Determine the final position based on the drop position
      let finalPosition
      if (dragOverPosition.value.endsWith('-top')) {
        finalPosition = targetIndex
      } else {
        finalPosition = targetIndex + 1
      }
      
      // Don't reorder if dropping in the same position
      if (finalPosition === currentIndex || finalPosition === currentIndex + 1) {
        dragOverPosition.value = null
        draggedContact.value = null
        return
      }
      
      try {
        console.log(`🔄 Reordering ${contactName} in ${targetBucket} from position ${currentIndex} to ${finalPosition}`)
        await reorderContactsInBucket(targetBucket, sourceContact.id, finalPosition)
        
      } catch (error) {
        console.error('❌ Error during contact drop:', error)
        
        if (error && error.message) {
          alert(`Error moving ${contactName}: ${error.message}`)
        } else {
          console.warn('Unknown error during contact drop, but operation may have succeeded')
        }
      } finally {
        // Always clean up state
        draggedContact.value = null
        dragOverPosition.value = null
        dragOverBucket.value = null
      }
    }

    // Helper function to reorder contacts within a bucket
    const reorderContactsInBucket = async (bucket, contactId, targetPosition) => {
      const bucketContacts = getBucketContacts(bucket)
      const sourceIndex = bucketContacts.findIndex(c => c.id === contactId)
      
      if (sourceIndex === -1) return
      
      // Remove the contact from its current position
      const [movedContact] = bucketContacts.splice(sourceIndex, 1)
      
      // Insert at the new position
      bucketContacts.splice(targetPosition, 0, movedContact)
      
      // Update display_order for all contacts in this bucket
      const updatePromises = bucketContacts.map((contact, index) => {
        const newDisplayOrder = index
        if (contact.display_order !== newDisplayOrder) {
          return updateContact(contact.id, { display_order: newDisplayOrder })
        }
        return Promise.resolve()
      })
      
      await Promise.all(updatePromises)
      console.log(`✅ Reordered contacts in ${bucket}`)
    }

    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile)
      if (window.__rv_onDocClick) {
        document.removeEventListener('click', window.__rv_onDocClick)
        delete window.__rv_onDocClick
      }
    })

          return {
        // Data
        contacts,
        BUCKETS,
        isMobile,
        isPhone,
        selectedBucket,
        filteredContacts,
        armedContactId,
        enableMobileReorder: ref(true),
        
        // Mobile carousel
        carouselIndex,
        carouselContainer,
        columnsContainer,
        chipsExpanded,
        isTransitioning,
        getVisibleBuckets,
        goToNextDay,
        goToPrevDay,
        goToDay,
        canGoPrev,
        canGoNext,
        
        // Touch and swipe handlers
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        onTouchStartCell,
        onTouchMoveCell,
        onTouchEndCell,
        handleWheel,
        
        // Drawer state
        showContactDrawer,
        selectedContact,
        isEditing,
        saving,
        
        // Drag and drop state
        draggedContact,
        dragOverBucket,
        dragOverPosition,
        
        // Methods
        getBucketContacts,
        formatDate,
        openContactDrawer,
        openContactDrawerView,
        openAddContactDrawer,
        closeDrawer,
        armPreview,
        selectDay,
        getShortDayName,
        getSpecialLabel,
        handleSaveContact,
        handleDeleteContact,
        // Move sheet
        moveSheetVisible,
        closeMoveSheet,
        handleMoveDayFromSheet,
        
        // Drag and drop methods
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        handleDrop,
        
        // Contact-based drag and drop methods
        handleContactDragOver,
        handleContactDragEnter,
        handleContactDragLeave,
        handleContactDrop,
        
        // Hostel color methods
        extractHostelName,
        generateHostelColor,
        getHostelStyle,
        
        // Day badge colors
        getDayBadgeStyle,
        // inline editing
        isAnyCellEditing,
        isCellEditing,
        startEdit,
        cancelEdit,
        commitEdit,
        editBuffer,
        editBufferDate,
        editBufferTime,
        // chips visibility
        showChips,
        chipRow1,
        chipRow2,
        selectMobileDay,
        // search
        searchInput,
        searchInputRef,
        searchQuery,
        clearSearch,
        highlight,
        // tag filter + sorting
        allTags,
        selectedTags,
        // filter dropdown controls
        showFilterMenu,
        filterDropdownRef,
        toggleFilters,
        clearTags,
        // sorting (manual only for now; kept for future)
        sortField,
        sortDir
      }
  }
}
</script>

<style scoped>
.contact-grid {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Mobile carousel navigation */
.mobile-carousel-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: var(--cell-background-color);
  border-bottom: 1px solid var(--border-color);
}

.mobile-day-chips { padding: 0.35rem 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; }
.chips-row { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.chip {
  padding: 0.22rem 0.5rem;
  border: 1px solid var(--border-color);
  background: white;
  color: var(--text-color);
  border-radius: 999px;
  font-size: 0.8rem;
}
.chip.active { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }

.chips-collapsible { padding: 0 0.75rem; }
.chips-toggle {
  margin: 0.25rem 0 0.1rem 0;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  background: white;
  color: var(--text-color);
  border-radius: 6px;
  cursor: pointer;
}
.chips-toggle .chev { display: inline-block; transition: transform 0.2s ease; }
.chips-toggle .chev.open { transform: rotate(180deg); }

/* Extra-tight chips on small phones */
@media (max-width: 420px) {
  .mobile-day-chips { padding: 0.25rem 0.75rem; gap: 0.2rem; }
  .mobile-day-chips .chips-row { gap: 0.2rem; }
  .mobile-day-chips .chip {
    padding: 0.16rem 0.38rem;
    font-size: 0.72rem;
  }
}

.nav-arrow {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  background-color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.nav-arrow:hover:not(:disabled) {
  background-color: var(--primary-color);
  color: white;
  transform: scale(1.05);
}

.nav-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}

.nav-arrow:active:not(:disabled) {
  transform: scale(0.95);
}

.day-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  margin: 0 1rem;
}

.indicator-dots {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dot.active {
  background-color: var(--primary-color);
  transform: scale(1.2);
}

.dot.primary {
  background-color: var(--primary-color);
  transform: scale(1.4);
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3);
}

.current-days {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-color);
  text-align: center;
  white-space: nowrap;
}

/* Mobile carousel container */
.mobile-carousel-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  touch-action: pan-y; /* Allow vertical scrolling but handle horizontal ourselves */
  user-select: none; /* Prevent text selection during swipes */
}

.mobile-carousel-columns {
  display: flex;
  height: 100%;
  gap: 0.5rem;
  padding: 0.5rem;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform: translateX(0);
}

.mobile-carousel-columns.transitioning {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.mobile-bucket-column {
  flex: 1;
  min-width: 0;
  background-color: var(--cell-background-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.mobile-bucket-header {
  padding: 0.75rem;
  background-color: var(--header-background-color);
  color: white;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 50px;
}

.mobile-bucket-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.mobile-contact-count {
  font-size: 0.9rem;
  opacity: 0.9;
}

.mobile-contacts-in-bucket {
  flex: 1;
  padding: 0.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.grid-container {
  flex: 1;
  overflow: auto;
}

.grid-toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
}

.search-wrap { display: flex; align-items: center; gap: 0.5rem; flex: 1; }
.search-input {
  width: 100%;
  max-width: 360px;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
}
.search-count { font-size: 0.85rem; color: #666; }
mark { background: #ffeb3b66; padding: 0 2px; border-radius: 2px; }

.toolbar-actions { position: relative; }
.filter-btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border-color);
  background: white;
  color: var(--text-color);
  border-radius: 6px;
  cursor: pointer;
}
.filter-btn:hover { background: var(--cell-background-color); }
.dropdown { position: relative; display: inline-block; }
.filter-menu {
  position: absolute;
  z-index: 1000;
  top: calc(100% + 8px);
  right: 0;
  min-width: 260px;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: white;
  color: var(--text-color);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  max-height: 60vh;
  overflow: auto;
}
.filter-title { font-weight: 600; margin-bottom: 0.5rem; }
.filter-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
.apply-btn { padding: 0.35rem 0.6rem; border: 1px solid var(--primary-color); background: var(--primary-color); color: #fff; border-radius: 4px; }
.clear-btn { padding: 0.35rem 0.6rem; border: 1px solid var(--border-color); background: white; color: var(--text-color); border-radius: 4px; }
.clear-btn:hover { background: var(--cell-background-color); }

.filter-group label {
  margin-right: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-color);
}

.filter-group select {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.tag-checkboxes { display: flex; flex-direction: column; gap: 0.35rem; }
.tag-option { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }

.tag-mode { margin-left: 0.75rem; }

.sort-group {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.export-btn {
  margin-left: auto;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.bucket-columns {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  min-width: max-content;
  /* Smooth scrolling */
  scroll-behavior: smooth;
}

/* Hide scrollbar on webkit browsers for cleaner look */
.grid-container::-webkit-scrollbar {
  height: 8px;
}

.grid-container::-webkit-scrollbar-track {
  background: var(--cell-background-color);
  border-radius: 4px;
}

.grid-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.grid-container::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color);
}

.bucket-column {
  min-width: 160px;
  max-width: 180px;
  background-color: var(--cell-background-color);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.bucket-header {
  padding: 0.5rem 0.75rem;
  background-color: var(--header-background-color);
  color: white;
  border-radius: 4px 4px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 36px;
}

.bucket-header h3 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-count {
  font-size: 0.8rem;
  opacity: 0.8;
}

.contacts-in-bucket {
  padding: 0.25rem;
  min-height: 150px;
  max-height: 400px;
  overflow-y: auto;
}

.contact-cell {
  padding: 0.25rem 0.5rem;
  margin-bottom: 1px;
  background-color: white;
  border: 1px solid var(--border-color);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Peek/armed styling */
.contact-cell.armed {
  outline: 2px solid var(--primary-color);
  position: relative;
}

.peek-actions {
  position: absolute;
  top: 4px;
  right: 4px;
}

.peek-actions .peek-btn {
  padding: 0.15rem 0.4rem;
  font-size: 0.7rem;
  border-radius: 12px;
  border: 1px solid var(--primary-color);
  background: white;
  color: var(--primary-color);
}

.inline-input {
  width: 100%;
  padding: 0.2rem 0.35rem;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  font-size: 0.85rem;
}

.inline-input.date { width: 8.5rem; }
.inline-input.time { width: 6rem; margin-left: 0.35rem; }
.inline-save {
  margin-left: 0.35rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: #fff;
  border-radius: 3px;
  font-size: 0.75rem;
}

.contact-cell:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.contact-cell.mobile {
  padding: 0.75rem;
  margin-bottom: 0;
  border-radius: 6px;
  background-color: white;
  border: 1px solid var(--border-color);
  cursor: default; /* prevent grab cursor on mobile */
  transition: all 0.2s ease;
}

/* Phone move sheet */
.move-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 2000;
}
.move-sheet {
  width: 100%;
  background: white;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  padding: 0.75rem;
  box-shadow: 0 -6px 16px rgba(0,0,0,0.15);
}
.move-sheet h4 {
  margin: 0 0 0.5rem 0;
}

.contact-cell.mobile:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.contact-name {
  font-weight: 600;
  margin-bottom: 0.1rem;
  color: var(--text-color);
  font-size: 0.85rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-hostel {
  font-size: 0.75rem;
  color: #5a6c7d;
  margin-bottom: 0.1rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background-color: #f8f9fb;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  border-left: 2px solid #3498db;
  display: inline-block;
  max-width: 100%;
  width: fit-content;
}

.contact-date-notes {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
}

.contact-date {
  font-size: 0.7rem;
  color: #2980b9;
  font-weight: 500;
  line-height: 1.2;
  flex-shrink: 0;
}

.contact-notes {
  font-size: 0.7rem;
  color: var(--primary-color);
  font-style: italic;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.contact-date-notes.mobile {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.contact-date.mobile {
  font-size: 0.8rem;
  color: #2980b9;
  font-weight: 500;
  line-height: 1.3;
  flex-shrink: 0;
}

.contact-notes.mobile {
  font-size: 0.8rem;
  color: var(--primary-color);
  font-style: italic;
  line-height: 1.3;
  flex: 1;
  min-width: 0;
}

.contact-details {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.contact-bucket {
  font-size: 0.8rem;
  background-color: var(--primary-color);
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
}

.add-contact-btn {
  width: 100%;
  padding: 0.4rem 0.5rem;
  border: 1px dashed var(--border-color);
  background-color: transparent;
  color: var(--primary-color);
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  margin-top: 0.25rem;
  min-height: 28px;
}

.add-contact-btn:hover {
  border-color: var(--primary-color);
  background-color: var(--primary-color);
  color: white;
}

.add-contact-btn.mobile {
  margin-top: auto;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.85rem;
  min-height: 45px;
}

.mobile-contacts {
  padding: 0.5rem;
}

/* Drag and drop styles */
.contact-cell[draggable="true"] {
  cursor: grab;
  transition: all 0.2s ease;
}

.contact-cell[draggable="true"]:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.contact-cell[draggable="true"]:active {
  cursor: grabbing;
}

.bucket-column.drag-over {
  background-color: rgba(52, 152, 219, 0.1);
  border: 2px dashed var(--primary-color);
  border-radius: 4px;
}

.bucket-column.drag-over .bucket-header {
  color: var(--primary-color);
}

/* Contact wrapper for natural drag and drop */
.contact-wrapper {
  position: relative;
}

/* Insertion line for position-based reordering */
.insertion-line {
  height: 3px;
  background-color: var(--primary-color);
  border-radius: 2px;
  margin: 2px 0;
  box-shadow: 0 0 8px rgba(52, 152, 219, 0.6);
  animation: pulse 0.8s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.8; }
  to { opacity: 1; }
}



.scroll-hint {
  text-align: center;
  padding: 0.75rem;
  background-color: var(--header-background-color);
  color: white;
  border-radius: 4px;
  margin: 0 1rem 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .bucket-columns {
    padding: 0.5rem;
  }
  
  .grid-container.mobile-view {
    padding: 0;
  }
  
  .scroll-hint {
    display: none; /* Hide on mobile since we use bucket filter */
  }
}
</style> 