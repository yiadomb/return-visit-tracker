<template>
  <div v-if="open" class="modal-overlay">
    <div class="modal" :class="{ lifted }">
      <header class="modal-header compact">
        <h3 class="header-title">{{ monthLabel }}</h3>
        <button class="close-x" @click="$emit('close')" aria-label="Close">✕</button>
      </header>

      <div class="content">
        <div class="grid">
          <div class="field-card">
            <div class="label">Hours (HH:MM)</div>
            <input class="time-display" type="text" :value="timeText || '00:00'" readonly @click="showKeypad = true" @focus="lift(true)" @blur="lift(false)" />
          </div>

          <div class="field-card">
            <div class="label">Studies</div>
            <input class="studies-input" type="text" inputmode="numeric" pattern="\\d*" v-model="studiesInput" @focus="lift(true)" @blur="lift(false)" />
          </div>
        </div>

        <div class="note-field">
          <div class="label">Comment</div>
          <input class="comment-input one-line" v-model="comment" :maxlength="200" @focus="lift(true)" @blur="lift(false)" />
          <div class="char-count">{{ comment.length }}/200</div>
        </div>

        <div class="actions">
          <button class="primary" @click="saveAndClose">Save</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Keypad -->
  <div v-if="showKeypad" class="keypad" @click.self="showKeypad = false">
    <div class="pad">
      <div class="display wide">{{ timeText || 'hh:mm' }}</div>
      <button @click="appendKey('1')">1</button>
      <button @click="appendKey('2')">2</button>
      <button @click="appendKey('3')">3</button>
      <button @click="appendKey('4')">4</button>
      <button @click="appendKey('5')">5</button>
      <button @click="appendKey('6')">6</button>
      <button @click="appendKey('7')">7</button>
      <button @click="appendKey('8')">8</button>
      <button @click="appendKey('9')">9</button>
      <button @click="appendKey('0')">0</button>
      <button @click="appendKey(':')">:</button>
      <button @click="appendKey('del')">⌫</button>
      <div class="action-row">
        <button class="clr" @click="appendKey('clr')">Clear</button>
        <button class="ok" @click="applyTime">OK</button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted } from 'vue'
import { reportEntryService } from '../../services/db.js'

export default {
  name: 'ReportEntryModal',
  props: {
    open: { type: Boolean, default: false },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    entry: { type: Object, default: null }
  },
  emits: ['close','saved'],
  setup(props, { emit }) {
    const hours = ref(0)
    const minutes = ref(0)
    const studiesInput = ref('')
    const comment = ref('')
    const timeText = ref('')
    const editingId = ref(null)
    const lifted = ref(false)

    const monthLabel = computed(() => new Date(props.year, props.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))

    const showKeypad = ref(false)
    const appendKey = (k) => {
      if (k === ':') {
        if (timeText.value.includes(':')) return
        if (timeText.value.length === 0) { timeText.value = '00:'; return }
        timeText.value += ':'
        return
      }
      if (k === 'del') { timeText.value = timeText.value.slice(0, -1); return }
      if (k === 'clr') { timeText.value = ''; return }
      if (/^\d$/.test(k)) {
        if (timeText.value.replace(':','').length >= 4) return
        timeText.value += k
      }
    }
    const applyTime = () => {
      const parts = timeText.value.split(':')
      let h = 0, m = 0
      if (parts.length === 2) {
        h = parseInt(parts[0] || '0', 10)
        m = parseInt(parts[1] || '0', 10)
      } else if (parts.length === 1 && parts[0]) {
        m = parseInt(parts[0] || '0', 10)
      }
      if (isNaN(h)) h = 0
      if (isNaN(m)) m = 0
      m = Math.min(Math.max(m,0),59)
      hours.value = h
      minutes.value = m
      timeText.value = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      showKeypad.value = false
    }

    const onTimeTyped = (e) => {
      const raw = String(e?.target?.value || '')
      const cleaned = raw.replace(/[^0-9:]/g, '').slice(0,5)
      // Enforce HH:MM shape progressively
      let t = cleaned
      if (t.length === 2 && !t.includes(':')) t = t + ':'
      if (t.length > 0 && !/^[0-9]{0,2}:?[0-9]{0,2}$/.test(t)) return
      timeText.value = t
      // Try to parse if complete
      if (/^[0-9]{2}:[0-9]{2}$/.test(t)) {
        const [hh, mm] = t.split(':')
        const h = parseInt(hh || '0', 10)
        const m = Math.min(Math.max(parseInt(mm || '0', 10) || 0, 0), 59)
        hours.value = isNaN(h) ? 0 : h
        minutes.value = isNaN(m) ? 0 : m
      }
    }

    const toMinutes = (h, m) => (Math.max(h||0,0) * 60) + Math.max(m||0,0)

    const saveAndClose = async () => {
      const mins = toMinutes(hours.value, minutes.value)
      const studs = Math.max(parseInt(studiesInput.value || '0', 10) || 0, 0)
      if (mins === 0 && studs === 0) {
        // Do not record empty entries
        emit('close')
        return
      }
      if (editingId.value) {
        await reportEntryService.updateEntry(editingId.value, { minutes: mins, studies: studs, comment: comment.value })
      } else {
        await reportEntryService.addEntry({ year: props.year, month: props.month, minutes: mins, studies: studs, comment: comment.value })
      }
      emit('saved')
      emit('close')
    }

    const loadFromEntry = (e) => {
      if (!e) { hours.value = 0; minutes.value = 0; studiesInput.value = ''; comment.value=''; timeText.value=''; editingId.value = null; return }
      editingId.value = e.id
      const h = Math.floor((e.minutes || 0) / 60)
      const m = (e.minutes || 0) % 60
      hours.value = h
      minutes.value = m
      timeText.value = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      studiesInput.value = String(e.studies || 0)
      comment.value = e.comment || ''
    }

    watch(() => props.entry, loadFromEntry, { immediate: true })
    watch(() => props.open, (v) => { if (!v) loadFromEntry(null) })
    onMounted(() => loadFromEntry(props.entry))

    const lift = (on) => { lifted.value = !!on }

    return { monthLabel, timeText, showKeypad, appendKey, applyTime, onTimeTyped, studiesInput, comment, saveAndClose, lifted, lift }
  }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 4000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: #fff; width: 100%; max-width: 312px; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s ease; }
.modal.lifted { transform: translateY(-18vh); }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.6rem; background: linear-gradient(135deg, #09b818 0%, #047857 100%); color: #fff; }
.modal-header.compact { padding: 0.4rem 0.6rem; }
.header-title { margin: 0; font-size: 0.95rem; font-weight: 600; }
.close-x { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.2rem 0.5rem; font-size: 0.85rem; cursor: pointer; }
.content { padding: 0.6rem; display: flex; flex-direction: column; gap: 0.5rem; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.field-card { background: transparent; border: none; border-radius: 0; padding: 0.25rem 0; text-align: center; }
.label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em; margin-bottom: 0.35rem; }
.time-display { width: 100%; border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; padding: 0.45rem; font-size: 1.2rem; font-weight: 700; color: var(--primary-color); }
.studies-input { width: 100%; border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; padding: 0.45rem; font-size: 1.2rem; font-weight: 700; color: var(--primary-color); text-align: center; }
.hint { font-size: 0.75rem; color: #94a3b8; }
.note-field { display: flex; flex-direction: column; gap: 0.25rem; }
.comment-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.45rem 0.6rem; }
.comment-input.one-line { height: 32px; }
.char-count { font-size: 0.75rem; color: #94a3b8; text-align: right; }
.actions { display: flex; justify-content: center; }
.primary { background: var(--primary-color); color: #fff; border: none; border-radius: 10px; padding: 0.6rem 1.25rem; font-weight: 700; }

.keypad { position: fixed; inset: 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 30vh; background: rgba(0,0,0,0.5); z-index: 5000; }
.pad { background: #111827; color: #fff; padding: 0.5rem; border-radius: 12px; width: 240px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
.pad .display { text-align: center; padding: 0.25rem 0; font-weight: 700; letter-spacing: 1px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; }
.pad button { padding: 0.5rem 0; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #fff; border-radius: 8px; font-size: 1rem; }
.pad button:active { background: rgba(255,255,255,0.12); }
.pad .wide { grid-column: span 3; }
.pad .ok { background: #10b981; border-color: #10b981; }
.pad .clr { background: #4b5563; border-color: #4b5563; }
.action-row { grid-column: span 3; display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; }
</style>


