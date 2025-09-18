<template>
  <div class="agenda-view" @touchstart.passive="onOuterTouchStart" @touchend.passive="onOuterTouchEnd">
    <div class="agenda-header">
      <h1>Notes</h1>
    </div>

    <div class="notes-content">
      <div class="notes-toolbar">
        <button class="btn-primary" @click="openNewNote">＋ Add note</button>
        </div>
      <div v-if="notesLoading" class="loading-state">Loading notes…</div>
      <div v-else-if="notes.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>No notes yet</h3>
        <p>Tap "Add note" to start writing.</p>
          </div>
      <ul v-else class="notes-list">
        <li
          v-for="note in notes"
          :key="note.id"
          class="note-item"
          @click="onNoteClick(note, $event)"
          @pointerdown.passive="onNotePointerDown(note, $event)"
          @pointerup.passive="onNotePointerUp"
          @pointerleave.passive="onNotePointerCancel"
          @pointercancel.passive="onNotePointerCancel"
        >
          <div class="note-content">
            <div class="note-title">{{ note.title || 'Untitled' }}</div>
            <div class="note-preview">{{ extractPreview(note.html) }}</div>
          </div>
        </li>
      </ul>
      </div>

    <!-- Note Editor Modal -->
    <div v-if="editorOpen" class="modal-overlay" @click="closeEditor" @keydown.esc.prevent="closeEditor">
      <div class="modal-sheet" @click.stop role="dialog" aria-modal="true" aria-label="Note editor">
        <div class="modal-header">
          <input 
            class="title-edit" 
            v-model="noteTitle" 
            type="text" 
            :placeholder="editingNote ? 'Edit title' : 'New note'"
            @keydown.enter.prevent="editorRef?.focus()"
          />
        </div>
        <div class="notes-editor">
          <div class="editor" ref="editorRef" contenteditable="true" @input="onEdit" :placeholder="'Start typing your note title and content…'"></div>
          <div class="toolbar bottom" ref="toolbarRef">
            <button @mousedown.prevent="execToggle('bold')" title="Bold" :class="{ active: isActive('bold') }" aria-pressed="isActive('bold')"><b>B</b></button>
            <button @mousedown.prevent="execToggle('italic')" title="Italic" :class="{ active: isActive('italic') }" aria-pressed="isActive('italic')"><i>I</i></button>
            <button @mousedown.prevent="execToggle('underline')" title="Underline" :class="{ active: isActive('underline') }" aria-pressed="isActive('underline')"><u>U</u></button>
            <button @mousedown.prevent="applyHeadingToggle(1)" title="Heading 1" :class="{ active: isHeading(1) }">H1</button>
            <button @mousedown.prevent="applyHeadingToggle(2)" title="Heading 2" :class="{ active: isHeading(2) }">H2</button>
            <button @mousedown.prevent="applyHeadingToggle(3)" title="Heading 3" :class="{ active: isHeading(3) }">H3</button>
            <button @mousedown.prevent="toggleListToggle('ul')" title="Bullet List" :class="{ active: isList('ul') }">•</button>
            <button @mousedown.prevent="toggleListToggle('ol')" title="Numbered List" :class="{ active: isList('ol') }">1.</button>
            <button @mousedown.prevent="toggleChecklist()" title="Checklist">☑</button>
            <button @mousedown.prevent="execToggle('strikeThrough')" title="Strikethrough" :class="{ active: isActive('strikeThrough') }">S̶</button>
            <button @mousedown.prevent="insertLine()" title="Horizontal Line">―</button>
            <button @mousedown.prevent="clearFormat()" title="Clear Formatting">⌫</button>
            <button @mousedown.prevent="undo()" title="Undo">↶</button>
            <button @mousedown.prevent="redo()" title="Redo">↷</button>
          </div>
            </div>
        <div class="modal-actions">
          <button class="btn-primary" @click="saveEditor" :disabled="savingNote">{{ savingNote ? 'Saving…' : 'Save' }}</button>
          <button class="btn-secondary" @click="closeEditor">Cancel</button>
            </div>
            </div>
          </div>

    <!-- Slide-up panel for today's visits -->
    <div class="visits-panel" :class="{ open: visitsOpen }" @touchstart.passive="onPanelTouchStart" @touchend.passive="onPanelTouchEnd">
      <button class="panel-handle" @click="visitsOpen = !visitsOpen" :aria-expanded="visitsOpen" aria-controls="visits-content">
        {{ visitsOpen ? '▼' : '▲' }} Today's Visits ({{ todaysVisits.length }})
            </button>
      <div id="visits-content" class="panel-content">
        <div v-if="todaysVisits.length === 0" class="panel-empty">No visits today</div>
        <ul v-else class="visit-rows">
          <li v-for="c in todaysVisits" :key="c.id" class="visit-row">
            <div class="v-time">{{ formatVisitTime(c.next_visit_at) }}</div>
            <div class="v-main">
              <div class="v-name">{{ c.name }}</div>
              <div class="v-hostel" :style="getHostelStyle(c.hostel_name)">{{ c.hostel_name || 'No hostel' }}</div>
              <div v-if="c.location_detail" class="v-loc">📍 {{ c.location_detail }}</div>
              <div v-if="c.notes" class="v-notes">{{ c.notes }}</div>
            </div>
            <div class="v-actions">
              <button v-if="c.phone" class="mini action" @click.stop="callContact(c.phone)">📞</button>
              <button v-if="c.phone" class="mini action" @click.stop="whatsappContact(c.phone)">💬</button>
          </div>
          </li>
        </ul>
        </div>
      </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { notesService, db } from '../services/db.js'
import { useContacts } from '../composables/useDb'
import { notificationService } from '../services/notificationService'
import { getHostelColors } from '../utils/hostelColor.js'
import { usePullToRefresh } from '../composables/usePullToRefresh.js'
import { liveQuery } from 'dexie'

export default {
  name: 'AgendaView',
  setup() {
    // Notes list + editor modal
    const notes = ref([])
    const notesLoading = ref(true)
    const editorRef = ref(null)
    const toolbarRef = ref(null)
    const editorOpen = ref(false)
    const editingNote = ref(null)
    const savingNote = ref(false)
    const noteTitle = ref('')
    const longPressTimer = ref(null)
    const longPressNote = ref(null)
    const LONG_PRESS_MS = 550

    const loadNotes = async () => {
      notesLoading.value = true
      try {
        notes.value = await notesService.list()
      } finally {
        notesLoading.value = false
      }
    }

    const onEdit = () => { /* live preview handled on save */ }
    const openNewNote = async () => {
      editingNote.value = null
      editorOpen.value = true
      // Auto-generate numbered title
      const existingTitles = notes.value.map(n => n.title || '').filter(t => t.startsWith('New note'))
      let counter = 1
      while (existingTitles.includes(`New note ${counter}`)) {
        counter++
      }
      noteTitle.value = counter === 1 ? 'New note' : `New note ${counter}`
      
      await nextTick()
      if (editorRef.value) {
        editorRef.value.innerHTML = ''
        try { 
          editorRef.value.focus() 
          setupEditorEvents()
          normalizeEditorCheckboxes()
        } catch {}
      }
    }
    const openEditNote = async (note) => {
      editingNote.value = note
      editorOpen.value = true
      noteTitle.value = note.title || 'Untitled'
      await nextTick()
      if (editorRef.value) {
        editorRef.value.innerHTML = note.html || ''
        try { 
          // Do not auto-focus; allow reading without keyboard popping up
          setupEditorEvents()
          normalizeEditorCheckboxes()
        } catch {}
      }
    }
    const closeEditor = () => { editorOpen.value = false }
    const saveEditor = async () => {
      savingNote.value = true
      const html = editorRef.value?.innerHTML || ''
      const title = noteTitle.value.trim() || 'Untitled'
      try {
        if (editingNote.value) {
          await notesService.update(editingNote.value.id, { html, title })
        } else {
          await notesService.create({ html, title })
        }
        await loadNotes()
        editorOpen.value = false
      } finally {
        savingNote.value = false
      }
    }
    const deleteNote = async (note) => {
      const ok = window.confirm('Delete this note? This cannot be undone.')
      if (!ok) return
      await notesService.remove(note.id)
      await loadNotes()
    }
    const extractTitle = (html) => {
      const tmp = document.createElement('div')
      tmp.innerHTML = html || ''
      const text = (tmp.textContent || '').trim()
      return text ? text.slice(0, 80) : 'Untitled'
    }

    const onNotePointerDown = (note, e) => {
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
      longPressNote.value = note
      clearTimeout(longPressTimer.value)
      longPressTimer.value = setTimeout(() => {
        if (longPressNote.value && longPressNote.value.id === note.id) {
          // Trigger delete confirmation
          deleteNote(note)
          longPressNote.value = null
        }
      }, LONG_PRESS_MS)
    }
    const onNotePointerUp = () => {
      clearTimeout(longPressTimer.value)
      longPressNote.value = null
    }
    const onNotePointerCancel = () => {
      clearTimeout(longPressTimer.value)
      longPressNote.value = null
    }
    const onNoteClick = (note, e) => {
      // If a long-press was in progress, suppress click
      if (longPressNote.value) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      openEditNote(note)
    }
    
    const extractPreview = (html) => {
      const tmp = document.createElement('div')
      tmp.innerHTML = html || ''
      const text = (tmp.textContent || '').trim()
      return text ? text.slice(0, 120) + (text.length > 120 ? '...' : '') : 'No content'
    }
    
    const formatUpdated = (iso) => new Date(iso || Date.now()).toLocaleString()

    const exec = (cmd) => document.execCommand(cmd, false, null)
    
    // Enhanced toolbar functions with proper toggle behavior
    // Ensure editor keeps focus and selection when toolbar buttons are used
    const runWithSelection = (fn) => {
      const selection = window.getSelection()
      const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null
      if (editorRef.value) {
        try { editorRef.value.focus() } catch {}
        if (savedRange) {
          try {
            selection.removeAllRanges()
            selection.addRange(savedRange)
          } catch {}
        }
      }
      try { fn() } finally { updateToolbarState() }
    }

    const isBlankTextNode = (node) => node && node.nodeType === Node.TEXT_NODE && ((node.textContent || '').replace(/[\s\u00A0]+/g,'') === '')

    const execToggle = (cmd) => {
      runWithSelection(() => document.execCommand(cmd, false, null))
    }
    
    const applyHeading = (level) => document.execCommand('formatBlock', false, 'H' + level)
    const applyHeadingToggle = (level) => {
      runWithSelection(() => {
        if (isHeading(level)) {
          document.execCommand('formatBlock', false, 'p')
        } else {
          document.execCommand('formatBlock', false, 'H' + level)
        }
      })
    }
    
    const toggleList = (type) => document.execCommand(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList', false, null)
    const toggleListToggle = (type) => {
      runWithSelection(() => {
        document.execCommand(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList', false, null)
      })
    }
    // Ensure a dedicated text span exists after a checkbox for styling/strikethrough
    const ensureCheckboxTextSpan = (wrapper) => {
      if (!wrapper || !wrapper.parentNode) return null
      let node = wrapper.nextSibling
      // Skip whitespace nodes (including NBSP)
      while (node && node.nodeType === Node.TEXT_NODE && node.textContent.replace(/[\s\u00A0]+/g,'') === '') {
        node = node.nextSibling
      }
      if (node && node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('checkbox-text')) {
        return node
      }
      const span = document.createElement('span')
      span.className = 'checkbox-text'
      wrapper.parentNode.insertBefore(span, node || null)
      return span
    }

    const addCheckboxListeners = (input) => {
      if (!input || input.__checkbox_listeners_added) return
      input.addEventListener('change', (e) => {
        e.stopPropagation()
        const wrapper = e.target.closest('.checkbox-item')
        if (!wrapper) return
        const textSpan = ensureCheckboxTextSpan(wrapper)
        if (!textSpan) return
        if (e.target.checked) textSpan.classList.add('done')
        else textSpan.classList.remove('done')
      })
      input.addEventListener('click', (e) => { e.stopPropagation() })
      input.__checkbox_listeners_added = true
    }

    // Helpers to keep each checkbox line isolated
    const INLINE_TAGS = new Set(['SPAN','A','B','I','U','S','STRONG','EM','CODE','SMALL','SUP','SUB','MARK'])
    const isWhitespaceTextNode = (node) => node && node.nodeType === Node.TEXT_NODE && (node.textContent || '').replace(/[\s\u00A0]+/g,'') === ''
    const isInlineElementNode = (node) => node && node.nodeType === Node.ELEMENT_NODE && (INLINE_TAGS.has(node.tagName))
    const shouldMoveIntoTextSpan = (node) => {
      if (!node) return false
      if (node.nodeType === Node.TEXT_NODE) return true
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') return false
        if (node.classList && node.classList.contains('checkbox-item')) return false
        return isInlineElementNode(node)
      }
      return false
    }

    const trimTextSpanToInlineOnly = (textSpan) => {
      if (!textSpan || !textSpan.parentNode) return
      let child = textSpan.firstChild
      while (child) {
        const next = child.nextSibling
        if ((child.nodeType === Node.ELEMENT_NODE && (
              child.tagName === 'BR' ||
              (child.classList && child.classList.contains('checkbox-item')) ||
              !isInlineElementNode(child)
            ))) {
          const frag = document.createDocumentFragment()
          let move = child
          while (move) {
            const after = move.nextSibling
            frag.appendChild(move)
            move = after
          }
          textSpan.parentNode.insertBefore(frag, textSpan.nextSibling)
          break
        }
        child = next
      }
    }

    const unwrapWrapperFromTextSpan = (wrapper) => {
      if (!wrapper) return
      const p = wrapper.parentElement
      if (p && p.classList && p.classList.contains('checkbox-text')) {
        try { p.parentNode.insertBefore(wrapper, p.nextSibling) } catch {}
      }
    }

    const toggleChecklist = () => {
      runWithSelection(() => {
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return
        const range = selection.getRangeAt(0)
        // Create a wrapped checkbox so we can style consistent indentation
        const wrapper = document.createElement('span')
        wrapper.className = 'checkbox-item'
        wrapper.contentEditable = 'false'
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        addCheckboxListeners(checkbox)

        wrapper.appendChild(checkbox)
        range.insertNode(wrapper)
        // Ensure there is a text span for this item and move caret inside it
        const textSpan = ensureCheckboxTextSpan(wrapper)
        // Move following inline siblings into this text span to keep the line coherent
        while (shouldMoveIntoTextSpan(textSpan.nextSibling)) {
          textSpan.appendChild(textSpan.nextSibling)
        }
        trimTextSpanToInlineOnly(textSpan)
        const caret = document.createRange()
        caret.selectNodeContents(textSpan)
        caret.collapse(true)
        selection.removeAllRanges()
        selection.addRange(caret)
      })
    }
    const insertLine = () => {
      const selection = window.getSelection()
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const hr = document.createElement('hr')
        hr.style.margin = '0.75rem 0'
        hr.style.border = 'none'
        hr.style.borderTop = '1px solid #ddd'
        range.insertNode(hr)
        range.setStartAfter(hr)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
    
    const clearFormat = () => {
      document.execCommand('removeFormat', false, null)
      updateToolbarState()
    }
    
    // Active state tracking for toolbar buttons
    const toolbarState = ref({})
    
    const updateToolbarState = () => {
      // Update toolbar state when selection changes
      setTimeout(() => {
        try {
          toolbarState.value = {
            bold: isActive('bold'),
            italic: isActive('italic'),
            underline: isActive('underline'),
            strikeThrough: isActive('strikeThrough'),
            h1: isHeading(1),
            h2: isHeading(2),
            h3: isHeading(3),
            ul: isList('ul'),
            ol: isList('ol')
          }
        } catch (e) {
          // Reset if there's an error
          toolbarState.value = {}
        }
      }, 10)
    }
    
    const isActive = (command) => {
      try {
        // Only check if we have focus on the editor
        if (document.activeElement !== editorRef.value) return false
        return document.queryCommandState(command)
      } catch (e) {
        return false
      }
    }
    
    const isHeading = (level) => {
      try {
        if (document.activeElement !== editorRef.value) return false
        const formatBlock = document.queryCommandValue('formatBlock').toLowerCase()
        return formatBlock === `h${level}` || formatBlock === `<h${level}>`
      } catch (e) {
        return false
      }
    }
    
    const isList = (type) => {
      try {
        if (document.activeElement !== editorRef.value) return false
        if (type === 'ul') {
          return document.queryCommandState('insertUnorderedList')
        } else if (type === 'ol') {
          return document.queryCommandState('insertOrderedList')
        }
        return false
      } catch (e) {
        return false
      }
    }
    
    const undo = () => {
      document.execCommand('undo', false, null)
      updateToolbarState()
    }
    
    const redo = () => {
      document.execCommand('redo', false, null)
      updateToolbarState()
    }
    
    // Setup editor event listeners for toolbar state updates
    const setupEditorEvents = () => {
      if (editorRef.value) {
        const editor = editorRef.value
        if (!editor.__rv_listeners_added) {
          editor.addEventListener('keyup', updateToolbarState)
          editor.addEventListener('mouseup', updateToolbarState)
          editor.addEventListener('focus', updateToolbarState)
          editor.addEventListener('keydown', onEditorKeyDown)
          editor.addEventListener('change', onEditorChange)
          // Capture click on checkboxes to ensure strikethrough toggles even if propagation is stopped
          editor.addEventListener('click', onEditorClick, true)
          editor.addEventListener('paste', onEditorPaste)
          editor.__rv_listeners_added = true
        }
        updateToolbarState()
      }
    }

    const onEditorClick = (e) => {
      const target = e.target
      if (!target || !(target.tagName === 'INPUT' && target.type === 'checkbox')) return
      const wrapper = target.closest('.checkbox-item') || target.parentElement
      const textSpan = ensureCheckboxTextSpan(wrapper)
      if (!textSpan) return
      if (target.checked) textSpan.classList.add('done')
      else textSpan.classList.remove('done')
    }

    const onEditorPaste = () => {
      // Normalize structure after paste finishes
      setTimeout(() => {
        try { normalizeEditorCheckboxes() } catch {}
      }, 0)
    }

    const onEditorChange = (e) => {
      const target = e.target
      if (!target || !(target.tagName === 'INPUT' && target.type === 'checkbox')) return
      const wrapper = target.closest('.checkbox-item') || target.parentElement
      // Ensure there is a text span next to this checkbox
      const textSpan = ensureCheckboxTextSpan(wrapper)
      if (!textSpan) return
      if (target.checked) textSpan.classList.add('done')
      else textSpan.classList.remove('done')
    }

    const normalizeEditorCheckboxes = () => {
      const editor = editorRef.value
      if (!editor) return
      // First, wrap any bare checkboxes not in our structure
      const allInputs = Array.from(editor.querySelectorAll('input[type="checkbox"]'))
      allInputs.forEach((input) => {
        const existingWrapper = input.closest('span.checkbox-item')
        if (existingWrapper) return
        const parent = input.parentNode
        if (!parent) return
        const wrapper = document.createElement('span')
        wrapper.className = 'checkbox-item'
        wrapper.contentEditable = 'false'
        parent.insertBefore(wrapper, input)
        wrapper.appendChild(input)
        // ensure text span exists immediately after wrapper, and move only inline siblings into it
        const textSpan = ensureCheckboxTextSpan(wrapper)
        while (shouldMoveIntoTextSpan(textSpan.nextSibling)) {
          textSpan.appendChild(textSpan.nextSibling)
        }
        trimTextSpanToInlineOnly(textSpan)
      })
      const wrappers = editor.querySelectorAll('span.checkbox-item')
      wrappers.forEach((wrapper) => {
        // enforce CE=false
        wrapper.contentEditable = 'false'
        const input = wrapper.querySelector('input[type="checkbox"]')

        // Add event listeners if not already present
        if (input && !input.__checkbox_listeners_added) {
          input.addEventListener('change', (e) => {
            e.stopPropagation()
            const wrapper = e.target.closest('.checkbox-item')
            if (!wrapper) return
            const textSpan = ensureCheckboxTextSpan(wrapper)
            if (!textSpan) return
            if (e.target.checked) {
              textSpan.classList.add('done')
            } else {
              textSpan.classList.remove('done')
            }
          })

          input.addEventListener('click', (e) => {
            e.stopPropagation()
          })

          input.__checkbox_listeners_added = true
        }

        // ensure text span exists immediately after wrapper and capture following inline nodes until line break
        let next = wrapper.nextSibling
        let after = next
        let textSpan = null
        if (after && after.nodeType === Node.ELEMENT_NODE && after.classList && after.classList.contains('checkbox-text')) {
          textSpan = after
        } else {
          textSpan = document.createElement('span')
          textSpan.className = 'checkbox-text'
          wrapper.parentNode.insertBefore(textSpan, after || null)
        }
        // move only inline nodes into textSpan
        while (shouldMoveIntoTextSpan(textSpan.nextSibling)) {
          textSpan.appendChild(textSpan.nextSibling)
        }
        // ensure wrappers are not nested inside previous text span
        unwrapWrapperFromTextSpan(wrapper)
        // Apply done state
        if (input && input.checked) textSpan.classList.add('done')
        else textSpan.classList.remove('done')
      })
    }

    const findPrevMeaningfulSibling = (node) => {
      let p = node && node.previousSibling
      while (p && p.nodeType === Node.TEXT_NODE && p.textContent.replace(/[\s\u00A0]+/g,'') === '') {
        p = p.previousSibling
      }
      return p
    }

    // Improved checkbox deletion helper
    const deleteCheckboxAtCursor = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return false
      const range = selection.getRangeAt(0)
      if (!range.collapsed) return false

      // Check if cursor is at the start of an empty checkbox-text span
      if (range.startContainer.nodeType === Node.ELEMENT_NODE &&
          range.startContainer.classList &&
          range.startContainer.classList.contains('checkbox-text') &&
          range.startOffset === 0) {
        const textSpan = range.startContainer
        const isEmpty = (textSpan.textContent || '').replace(/[\s\u00A0]+/g,'') === ''
        if (isEmpty) {
          const spacer = textSpan.previousSibling
          const wrapper = spacer && spacer.previousSibling && spacer.nodeType === Node.TEXT_NODE ? spacer.previousSibling : textSpan.previousSibling
          if (wrapper && wrapper.nodeType === Node.ELEMENT_NODE && wrapper.classList && wrapper.classList.contains('checkbox-item')) {
            // Remove elements and insert a BR at the position to exit checklist mode
            const parent = wrapper.parentNode
            const ref = wrapper.nextSibling
            if (spacer && spacer.nodeType === Node.TEXT_NODE) try { parent.removeChild(spacer) } catch {}
            try { parent.removeChild(textSpan) } catch {}
            parent.removeChild(wrapper)

            const br = document.createElement('br')
            parent.insertBefore(br, ref || null)
            // Insert a placeholder text node so caret is not inside any checkbox-text
            const placeholder = document.createTextNode('')
            parent.insertBefore(placeholder, br.nextSibling)
            // Place cursor inside the placeholder
            const newRange = document.createRange()
            newRange.setStart(placeholder, 0)
            newRange.collapse(true)
            selection.removeAllRanges()
            selection.addRange(newRange)
            return true
          }
        }
      }

      // Check if cursor is right after a checkbox (in text node at position 0)
      if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
        let prev = range.startContainer.previousSibling || findPrevMeaningfulSibling(range.startContainer)
        if (prev && prev.nodeType === Node.TEXT_NODE && prev.textContent.replace(/\s+/g,'') === '') {
          prev = prev.previousSibling
        }
        if (prev && prev.nodeType === Node.ELEMENT_NODE && prev.classList && prev.classList.contains('checkbox-item')) {
          const parent = prev.parentNode
          const ref = prev.nextSibling
          const maybeText = prev.nextSibling && prev.nextSibling.nodeType === Node.ELEMENT_NODE && prev.nextSibling.classList && prev.nextSibling.classList.contains('checkbox-text') ? prev.nextSibling : null
          if (maybeText && (maybeText.textContent || '').replace(/[\s\u00A0]+/g,'') === '') {
            try { parent.removeChild(maybeText) } catch {}
          }
          parent.removeChild(prev)
          const br = document.createElement('br')
          parent.insertBefore(br, ref || null)
          // Insert placeholder text node and place cursor inside it
          const placeholder = document.createTextNode('')
          parent.insertBefore(placeholder, br.nextSibling)
          const newRange = document.createRange()
          newRange.setStart(placeholder, 0)
          newRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(newRange)
          return true
        }
      }

      // Check if cursor is right before a checkbox
      let nextNode = null
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        if (range.startOffset >= (range.startContainer.textContent || '').length) {
          nextNode = range.startContainer.nextSibling
        }
      } else {
        nextNode = range.startContainer.childNodes[range.startOffset] || range.startContainer.nextSibling
      }

      // Skip whitespace nodes
      while (nextNode && nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent.replace(/[\s\u00A0]+/g,'') === '') {
        nextNode = nextNode.nextSibling
      }

      if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE && nextNode.classList && nextNode.classList.contains('checkbox-item')) {
        const parent = nextNode.parentNode
        const maybeText = nextNode.nextSibling && nextNode.nextSibling.nodeType === Node.ELEMENT_NODE && nextNode.nextSibling.classList && nextNode.nextSibling.classList.contains('checkbox-text') ? nextNode.nextSibling : null
        if (maybeText && (maybeText.textContent || '').replace(/[\s\u00A0]+/g,'') === '') {
          try { parent.removeChild(maybeText) } catch {}
        }
        parent.removeChild(nextNode)
        return true
      }

      return false
    }

    const onEditorKeyDown = (e) => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      const range = selection.getRangeAt(0)

      const removeCheckboxAtWrapper = (wrapper) => {
        if (!wrapper || !wrapper.parentNode) return
        const parent = wrapper.parentNode
        // Remove adjacent empty text span if present
        const textSpan = wrapper.nextSibling && wrapper.nextSibling.nodeType === Node.ELEMENT_NODE && wrapper.nextSibling.classList && wrapper.nextSibling.classList.contains('checkbox-text') ? wrapper.nextSibling : null
        if (textSpan && (textSpan.textContent || '').replace(/[\s\u00A0]+/g,'') === '') {
          try { parent.removeChild(textSpan) } catch {}
        }
        parent.removeChild(wrapper)
      }

      if (e.key === 'Enter') {
        let prev = null
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          prev = range.startContainer.previousSibling || findPrevMeaningfulSibling(range.startContainer)
        } else {
          prev = findPrevMeaningfulSibling(range.startContainer)
        }
        const prevIsCheckbox = !!(prev && prev.nodeType === Node.ELEMENT_NODE && prev.classList && prev.classList.contains('checkbox-item'))
        const checkboxTextEl = (range.startContainer.nodeType === Node.ELEMENT_NODE && range.startContainer.classList && range.startContainer.classList.contains('checkbox-text'))
          ? range.startContainer
          : (range.startContainer.nodeType === Node.TEXT_NODE && range.startContainer.parentElement && range.startContainer.parentElement.classList && range.startContainer.parentElement.classList.contains('checkbox-text')
            ? range.startContainer.parentElement
            : null)
        const insideCheckboxText = !!checkboxTextEl
        const isCurrentTextEmpty = checkboxTextEl ? ((checkboxTextEl.textContent || '').replace(/[\s\u00A0]+/g,'') === '') : false

        // Double-Enter behavior: if on an empty checkbox line, remove instead of creating a new one
        if (insideCheckboxText && isCurrentTextEmpty) {
          e.preventDefault()
          deleteCheckboxAtCursor()
          return
        }

        // Only create a new checkbox when caret is inside the current checkbox text and it's not empty
        if (!insideCheckboxText) return
        if (isCurrentTextEmpty) return
        e.preventDefault()
        runWithSelection(() => {
          const br = document.createElement('br')
          range.insertNode(br)
          const wrapper = document.createElement('span')
          wrapper.className = 'checkbox-item'
          wrapper.contentEditable = 'false'
          const checkbox = document.createElement('input')
          checkbox.type = 'checkbox'
          addCheckboxListeners(checkbox)
          wrapper.appendChild(checkbox)
          range.setStartAfter(br)
          range.collapse(true)
          range.insertNode(wrapper)
          // Ensure text span and place caret inside it
          const textSpan = ensureCheckboxTextSpan(wrapper)
          // Keep only inline siblings inside .checkbox-text until a line boundary
          while (shouldMoveIntoTextSpan(textSpan.nextSibling)) {
            textSpan.appendChild(textSpan.nextSibling)
          }
          trimTextSpanToInlineOnly(textSpan)
          const caretRange = document.createRange()
          caretRange.selectNodeContents(textSpan)
          caretRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(caretRange)
        })
        return
      }

      // Backspace: delete checkbox if caret is positioned to delete it
      if (e.key === 'Backspace' && range.collapsed) {
        if (deleteCheckboxAtCursor()) {
          e.preventDefault()
          return
        }
      }

      // Delete key: delete checkbox if caret is positioned to delete it
      if (e.key === 'Delete' && range.collapsed) {
        if (deleteCheckboxAtCursor()) {
          e.preventDefault()
          return
        }
      }

      // (Handled in the Enter block above to ensure correct priority)
    }
    const { contacts } = useContacts()
    const occurrences = ref([])
    let occSubscription = null
    
    // State
    const error = ref(null)
    const visitsOpen = ref(false)

    // Get today's date
    const today = new Date()
    const todayDateString = today.toISOString().split('T')[0] // YYYY-MM-DD

    // Display today's date nicely
    // No header date per new design

    // Derive today's visits from occurrences joined to contacts
    const todaysVisits = computed(() => {
      // Build contact map for quick join
      const byId = new Map(contacts.value.map(c => [c.id, c]))
      const todayOccs = occurrences.value.filter(o => {
        const d = new Date(o.scheduled_at).toISOString().split('T')[0]
        return d === todayDateString && o.status !== 'cancelled'
      })
      const items = []
      for (const occ of todayOccs) {
        const c = byId.get(occ.contact_id)
        if (!c) continue
        // Clone contact and override next_visit_at for display/sorting
        items.push({ ...c, next_visit_at: occ.scheduled_at })
      }
      return items.sort((a, b) => {
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
      // Disabled - no longer navigate between Contacts and Agenda via swipe
      return
    }
    const onOuterTouchEnd = (event) => {
      // Disabled - no longer navigate between Contacts and Agenda via swipe
      return
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

    // No editing from agenda page per new design

    // Slide panel swipe gestures
    const panelStartY = ref(0)
    const onPanelTouchStart = (e) => {
      const t = e.touches && e.touches[0]
      if (!t) return
      panelStartY.value = t.clientY
    }
    const onPanelTouchEnd = (e) => {
      const t = e.changedTouches && e.changedTouches[0]
      if (!t) return
      const dy = t.clientY - panelStartY.value
      if (Math.abs(dy) < 40) return
      if (dy < 0) visitsOpen.value = true
      if (dy > 0) visitsOpen.value = false
      panelStartY.value = 0
    }

    // Lifecycle
    onMounted(async () => {
      try {
        // Load notes first
        await loadNotes()
      
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

      // Subscribe to occurrence changes (live)
      try {
        occSubscription = liveQuery(() => db.visitOccurrences.toArray()).subscribe({
          next: (rows) => { occurrences.value = rows || [] },
          error: (e) => { console.warn('occurrences liveQuery error', e) }
        })
      } catch (e) {
        console.warn('Failed to subscribe to occurrences; falling back to manual load', e)
        occurrences.value = await db.visitOccurrences.toArray().catch(() => [])
      }

      // Pull-to-refresh for agenda content
      await nextTick()
        const getScrollableEl = () => document.querySelector('.notes-content')
      usePullToRefresh(getScrollableEl)

        // Pull-to-refresh should refresh both notes and visits
        window.addEventListener('rv:refresh', loadNotes)
      } finally {
        // All initialization complete
        console.log('AgendaView initialization complete')
      }
    })

    onUnmounted(() => { try { occSubscription?.unsubscribe() } catch {} })

    return {
      error,
      todaysVisits,
      visitsOpen,
      formatVisitTime,
      getHostelStyle,
      callContact,
      whatsappContact,
      onOuterTouchStart,
      onOuterTouchEnd,
      // Notes list + editor
      notes, notesLoading, openNewNote, openEditNote, deleteNote,
      editorOpen, closeEditor, saveEditor, savingNote,
      editorRef, toolbarRef, exec, execToggle, applyHeading, applyHeadingToggle, toggleList, toggleListToggle, toggleChecklist, insertLine, clearFormat, isActive, isHeading, isList, undo, redo, onEdit,
      extractTitle, extractPreview, formatUpdated,
      onPanelTouchStart, onPanelTouchEnd,
      noteTitle,
      onNotePointerDown, onNotePointerUp, onNotePointerCancel, onNoteClick
    }
  }
}
</script>

<style scoped>
.agenda-view { height: 100%; display: flex; flex-direction: column; padding: 1rem; max-width: 800px; margin: 0 auto; }
.agenda-header { text-align: center; margin-bottom: 1rem; }
.agenda-header h1 { color: var(--text-color); margin: 0; font-size: 1.8rem; }

.notes-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; }
.notes-toolbar { display: flex; justify-content: center; }
.btn-primary { padding: 0.5rem 0.9rem; border: 1px solid var(--primary-color); background: var(--primary-color); color: white; border-radius: 8px; }
.btn-secondary { padding: 0.5rem 0.9rem; border: 1px solid var(--border-color); background: white; color: var(--text-color); border-radius: 8px; }

.notes-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.note-item { background: rgb(233, 233, 233); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; cursor: pointer; transition: transform 0.15s ease; }
.note-item:hover { transform: translateY(-1px); }
.note-content { display: flex; flex-direction: column; gap: 0.25rem; }
.note-title { color: var(--text-color); font-weight: 600; font-size: 1rem; }
.note-preview { color: #666; font-size: 0.85rem; line-height: 1.3; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: flex-end; justify-content: center; z-index: 3000; }
.modal-sheet { width: min(800px, 100%); background: white; border-radius: 12px 12px 0 0; border: 1px solid var(--border-color); padding: 0.75rem; max-height: 85vh; display: flex; flex-direction: column; gap: 0.5rem; }
.modal-header { display: flex; align-items: center; justify-content: center; padding: 0.25rem 0; }
.title-edit { border: none; background: transparent; font-size: 1.2rem; font-weight: 600; text-align: center; color: var(--text-color); outline: none; width: 100%; }
.notes-editor { width: 100%; background: white; border: 1px solid var(--border-color); border-radius: 10px; padding: 0.5rem; max-height: 60vh; display: flex; flex-direction: column; overflow: auto; }
.toolbar { display: flex; gap: 0.35rem; overflow-x: auto; padding-bottom: 0.25rem; }
.toolbar.bottom { position: sticky; bottom: 0; background: white; z-index: 1; margin-top: 0.4rem; padding-top: 0.25rem; border-top: 1px solid var(--border-color); }
.toolbar button { border: 1px solid #999; background: #f5f5f5; color: #333; padding: 0.15rem 0.4rem; border-radius: 4px; height: 28px; font-size: 0.85rem; min-width: 32px; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; position: relative; }
.toolbar button:hover { background: #e8e8e8; transform: translateY(-1px); }
.toolbar button:active { background: #ddd; transform: translateY(0); }
.toolbar button.active { background: #000; color: #fff; border-color: #000; box-shadow: 0 2px 8px rgba(0,0,0,0.45), inset 0 1px 3px rgba(255,255,255,0.06); transform: translateY(1px); }
.toolbar button.active::after { content: ''; position: absolute; right: -3px; top: -3px; width: 10px; height: 10px; background: #000; border: 2px solid #fff; border-radius: 50%; }
.editor { min-height: 160px; padding: 0.5rem; outline: none; flex: 1; overflow: visible; }
.editor :is(ul, ol) { margin-left: 2rem; padding-left: 0.5rem; }
.editor .checkbox-item { display: inline-flex; align-items: center; margin-left: 2rem; }
.editor .checkbox-text { display: inline; }
:deep(.editor .checkbox-text.done) { text-decoration: line-through; opacity: 0.7; }
/* Pure-CSS strikethrough when checkbox is checked (progressive enhancement with :has) */
:deep(.editor .checkbox-item:has(input:checked) + .checkbox-text) { text-decoration: line-through; opacity: 0.7; }
.modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }

.loading-state,
.error-state { text-align: center; padding: 2rem; color: #666; }
.error-state { color: #e74c3c; }
.empty-state { text-align: center; padding: 3rem 1rem; }
.empty-icon { font-size: 3rem; margin-bottom: 0.5rem; }

/* Slide-up visits panel */
.visits-panel { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2500; transition: transform 0.25s ease; transform: translateY(calc(100% - 44px)); }
.visits-panel.open { transform: translateY(0); }
.panel-handle { width: 100%; border: none; background: var(--header-background-color); color: white; padding: 0.5rem; border-radius: 10px 10px 0 0; }
.panel-content { background: white; border-top: 1px solid var(--border-color); max-height: 45vh; overflow-y: auto; }
.panel-empty { padding: 0.75rem; color: #666; }
.visit-rows { list-style: none; padding: 0.5rem; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.visit-row { display: grid; grid-template-columns: 64px 1fr auto; gap: 0.4rem; align-items: center; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.4rem 0.5rem; background: var(--cell-background-color, #f9fafb); }
.v-time { font-weight: 600; color: var(--primary-color); }
.v-name { font-weight: 600; color: var(--text-color); }
.v-hostel { display: inline-block; font-size: 0.8rem; padding: 0.05rem 0.35rem; border-radius: 4px; border-left: 3px solid; margin-top: 0.1rem; }
.v-loc, .v-notes { font-size: 0.85rem; color: #666; }
.v-actions .action.mini { border: 1px solid var(--border-color); background: white; border-radius: 6px; padding: 0.25rem 0.4rem; }

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
  .agenda-view { padding: 0.75rem; }
  .agenda-header h1 { font-size: 1.5rem; }
}
</style> 