<template>
  <div v-if="open" class="modal-overlay" @click.self="noop">
    <div class="modal">
      <header class="modal-header compact">
        <div></div>
        <h3 class="month small">{{ monthLabel }}</h3>
        <button class="close-x" @click="$emit('close')" aria-label="Close">✕</button>
      </header>

      <div class="content">
        <div v-if="entries.length === 0" class="empty">No entries yet</div>
        <ul v-else class="entries">
          <li
            v-for="e in entries"
            :key="e.id"
            class="entry"
            @click="onEntryClick(e.id)"
          >
            <div class="entry-header">
              <div class="date">{{ formatEntryDate(e.entry_date) }}</div>
              <div class="right-controls">
                <button v-if="!areActionsShown(e.id)" class="icon-btn menu" @click.stop="toggleActions(e.id)" title="Options">⋯</button>
                <div v-else class="inline-actions">
                  <button class="text-edit" @click.stop="onEdit(e)">Edit</button>
                  <button class="icon-btn delete small-x" @click.stop="onDelete(e.id)" aria-label="Delete">✕</button>
                </div>
              </div>
            </div>
            <div class="meta">{{ formatHoursStudies(e.minutes, e.studies) }}</div>
            <div v-if="e.comment" class="comment">{{ e.comment }}</div>
          </li>
        </ul>
        <div class="footer-actions">
          <button class="primary" @click="$emit('send')">Send Report</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'

export default {
  name: 'ViewDetailsModal',
  props: {
    open: { type: Boolean, default: false },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    entries: { type: Array, default: () => [] }
  },
  emits: ['close','edit','delete','send'],
  setup(props, { emit }) {
    const monthLabel = computed(() => new Date(props.year, props.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    const formatHM = (mins) => {
      const h = Math.floor((mins || 0) / 60)
      const m = (mins || 0) % 60
      return `${h}:${String(m).padStart(2,'0')}`
    }
    const formatDate = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

    const formatEntryDate = (iso) => {
      const d = new Date(iso)
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
      const day = d.toLocaleDateString('en-US', { day: '2-digit' })
      const month = d.toLocaleDateString('en-US', { month: 'short' })
      const year = d.getFullYear()
      return `${weekday} ${day} ${month} ${year}`
    }

    const formatHoursStudies = (minutes, studies) => {
      const h = Math.floor((minutes || 0) / 60)
      const m = (minutes || 0) % 60
      const hoursText = `${h}:${String(m).padStart(2,'0')} hours`
      const studiesText = `${Math.max(studies || 0, 0)} studies`
      return `${hoursText}, ${studiesText}`
    }

    const noop = () => {}

    const openActionsFor = ref(null)
    const areActionsShown = (id) => openActionsFor.value === id
    const toggleActions = (id) => { openActionsFor.value = openActionsFor.value === id ? null : id }
    const onEntryClick = (id) => { toggleActions(id) }

    const onDelete = (id) => emit('delete', id)
    const onEdit = (entry) => emit('edit', entry)

    return { monthLabel, formatHM, formatDate, formatEntryDate, formatHoursStudies, noop, areActionsShown, toggleActions, onDelete, onEdit, onEntryClick }
  }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 4000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: #fff; width: 100%; max-width: 560px; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: var(--header-background-color); color: #fff; }
.modal-header.compact { padding: 0.4rem 0.6rem; }
.send-btn { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.3rem 0.5rem; font-size: 0.85rem; }
.close-x { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.2rem 0.5rem; font-size: 0.9rem; }
.month.small { margin: 0; font-size: 0.95rem; font-weight: 600; }
.footer-actions { position: sticky; bottom: 0; background: #fff; padding: 0.6rem 0.75rem; display: flex; justify-content: center; border-top: 1px solid var(--border-color); box-shadow: 0 -4px 10px rgba(0,0,0,0.04); }
.primary { background: var(--primary-color); color: #fff; border: none; border-radius: 10px; padding: 0.6rem 1.25rem; font-weight: 700; }
.content { padding: 1rem 1.25rem; max-height: 70vh; overflow-y: auto; }
.empty { text-align: center; color: #64748b; padding: 1.5rem; }
.entries { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.entry { border: 1px solid var(--border-color); border-radius: 12px; padding: 0.3rem 0.5rem; background: #fff; cursor: pointer; transition: background 0.15s ease; line-height: 1.2; }
.entry:hover { background: var(--cell-background-color, #f9fafb); }
.entry-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.35rem; }
.date { color: #374151; font-weight: 600; }
.right-controls { display: flex; align-items: center; gap: 0.25rem; }
.icon-btn { background: transparent; border: none; cursor: pointer; font-size: 1.1rem; line-height: 1; padding: 0.2rem 0.35rem; }
.icon-btn.delete { color: #ef4444; }
.icon-btn.menu { font-weight: 700; color: #6b7280; }
.text-delete { background: none; border: 1px solid #ef4444; color: #ef4444; border-radius: 6px; font-size: 0.8rem; padding: 0.15rem 0.4rem; cursor: pointer; }
.meta { color: #6b7280; font-size: 0.85rem; margin-top: 0.1rem; }
.comment { margin-top: 0.15rem; color: #6b7280; font-size: 0.85rem; }
.inline-actions { display: inline-flex; align-items: center; gap: 0.9rem; }
.text-edit { background: none; border: 1px solid var(--border-color); color: #111827; border-radius: 6px; font-size: 0.85rem; padding: 0.2rem 0.6rem; cursor: pointer; }
.small-x { font-size: 0.95rem; padding: 0.2rem 0.5rem; border: 1px solid #ef4444; color: #ef4444; border-radius: 6px; }
</style>


