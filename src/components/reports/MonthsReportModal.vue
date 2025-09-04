<template>
  <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-header" @touchstart.passive="onHeaderTouchStart" @touchend.passive="onHeaderTouchEnd">
        <h3>{{ monthLabel }}</h3>
        <button class="close-x" @click="$emit('close')" @touchstart.stop @touchend.stop aria-label="Close">✕</button>
      </header>

      <section class="summary">
        <div class="stat-line"><strong>Hours</strong><span class="value">{{ totalHours }}</span></div>
        <div class="stat-line"><strong>Studies</strong><span class="value">{{ totalStudies }}</span></div>
      </section>

      <section class="months-grid" @touchstart.passive="onMonthsTouchStart" @touchend.passive="onMonthsTouchEnd">
        <button v-for="m in serviceYearMonths" :key="m.key" class="month-cell" :class="[m.status, { active: m.year===currentYear && m.month===currentMonth }]" @click="selectMonth(m.year, m.month)">
          <div class="name">{{ m.name }}</div>
          <div class="mark">{{ m.mark }}</div>
        </button>
      </section>

      <section class="entry action-box">
        <div class="row">
          <span>Hours</span>
          <input class="time-display pill small" type="text" :value="timeText" placeholder="hh:mm" readonly @click="showKeypad=true" @focus="showKeypad=true" />
        </div>
        <div class="row">
          <span>Studies</span>
          <input ref="studiesRef" class="studies-input pill small" type="text" inputmode="numeric" pattern="\\d*" :placeholder="studiesPlaceholder" v-model="studiesInput" @focus="onStudiesFocus" />
        </div>
        <div class="actions">
          <button class="primary small" @click="saveEntry">Save</button>
        </div>
      </section>

      
    </div>
  </div>
  <div v-if="showKeypad" class="keypad" @click.self="showKeypad=false">
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
      <button class="wide ok" @click="applyTime">OK</button>
      <button class="wide clr" @click="appendKey('clr')">Clear</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watchEffect, nextTick } from 'vue'
import { reportService } from '../../services/db.js'

export default {
  name: 'MonthsReportModal',
  props: { open: { type: Boolean, default: false } },
  emits: ['close','updated'],
  setup() {
    const current = new Date()
    const currentMonth = ref(current.getMonth())
    const currentYear = ref(current.getFullYear())

    const monthLabel = computed(() => new Date(currentYear.value, currentMonth.value, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))

    const toMinutes = (h, m) => (Math.max(h||0,0) * 60) + Math.max(m||0,0)
    const hoursInput = ref(0)
    const minutesInput = ref(0)
    const studiesInput = ref('')
    const studiesPlaceholder = '0'
    const studiesRef = ref(null)
    const monthMinutesTotal = ref(0)
    const monthStudiesTotal = ref(0)
    const timeText = ref('')

    // Placeholder totals until data layer is wired
    const totalHours = computed(() => `${String(Math.floor((monthMinutesTotal.value)/60)).padStart(2,'0')}:${String((monthMinutesTotal.value)%60).padStart(2,'0')}`)
    const totalStudies = computed(() => `${monthStudiesTotal.value}`)

    // Service year aggregation cache
    const serviceYearStart = computed(() => currentMonth.value >= 8 ? currentYear.value : currentYear.value - 1)
    const serviceYearData = ref([])

    const reloadServiceYear = async () => {
      serviceYearData.value = await reportService.getServiceYear(serviceYearStart.value)
    }

    // Load month
    const loadMonth = async () => {
      const r = await reportService.getReport(currentYear.value, currentMonth.value)
      monthMinutesTotal.value = r?.total_minutes || 0
      monthStudiesTotal.value = r?.studies_count || 0
      hoursInput.value = 0
      minutesInput.value = 0
      studiesInput.value = ''
      timeText.value = ''
      // no status text; reflecting values is enough
    }

    watchEffect(async () => {
      await loadMonth()
      await reloadServiceYear()
    })

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const serviceYearMonths = computed(() => {
      // Map serviceYearData to display order Sep..Aug
      const out = []
      for (let i = 0; i < serviceYearData.value.length; i++) {
        const item = serviceYearData.value[i]
        const name = monthNames[item.month]
        let mark = '—'
        let status = 'pending'
        if (item.report) {
          const mins = item.report.total_minutes || 0
          mark = mins >= 15 ? '✓' : '×'
          status = mins >= 15 ? 'ok' : 'low'
        }
        out.push({ key: `${item.year}-${item.month}`, year: item.year, month: item.month, name, mark, status })
      }
      return out
    })

    const prevMonth = () => {
      let m = currentMonth.value - 1
      let y = currentYear.value
      if (m < 0) { m = 11; y -= 1 }
      currentMonth.value = m
      currentYear.value = y
    }
    const nextMonth = () => {
      let m = currentMonth.value + 1
      let y = currentYear.value
      if (m > 11) { m = 0; y += 1 }
      currentMonth.value = m
      currentYear.value = y
    }
    const selectMonth = (y, m) => { currentYear.value = y; currentMonth.value = m }

    // Custom keypad for time entry
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
        // cap length to 5 (HH:MM)
        if (timeText.value.replace(':','').length >= 4) return
        timeText.value += k
      }
    }
    const applyTime = async () => {
      const parts = timeText.value.split(':')
      let h = 0, m = 0
      if (parts.length === 2) {
        h = parseInt(parts[0] || '0', 10)
        m = parseInt(parts[1] || '0', 10)
      } else if (parts.length === 1) {
        // assume minutes only
        m = parseInt(parts[0] || '0', 10)
      }
      if (isNaN(h)) h = 0; if (isNaN(m)) m = 0; m = Math.min(Math.max(m,0),59)
      hoursInput.value = h
      minutesInput.value = m
      timeText.value = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      showKeypad.value = false
      await nextTick()
      try { if (studiesRef.value) studiesRef.value.focus() } catch {}
    }

    const saveEntry = async () => {
      // Incremental update: add entered values to month totals
      const addMinutes = toMinutes(hoursInput.value, minutesInput.value)
      const addStudies = Math.max(parseInt(studiesInput.value || '0', 10) || 0, 0)
      const newMinutes = (monthMinutesTotal.value || 0) + addMinutes
      const newStudies = (monthStudiesTotal.value || 0) + addStudies
      await reportService.saveReport({ year: currentYear.value, month: currentMonth.value, total_minutes: newMinutes, studies_count: newStudies })
      monthMinutesTotal.value = newMinutes
      monthStudiesTotal.value = newStudies
      await reloadServiceYear()
      // Clear inputs
      hoursInput.value = 0
      minutesInput.value = 0
      studiesInput.value = ''
      timeText.value = ''
      try { window.dispatchEvent(new CustomEvent('rv:report:updated')) } catch {}
      try { emit && emit('updated') } catch {}
    }

    // Swipe to change month
    let startX = 0, startY = 0
    const onHeaderTouchStart = (e) => { const t = e.touches && e.touches[0]; if (!t) return; startX = t.clientX; startY = t.clientY }
    const onHeaderTouchEnd = (e) => { const t = e.changedTouches && e.changedTouches[0]; if (!t) return; const dx = t.clientX - startX; const dy = Math.abs(t.clientY - startY); if (Math.abs(dx) > 60 && Math.abs(dx) > dy) { if (dx < 0) nextMonth(); else prevMonth(); } }

    let mStartX = 0, mStartY = 0, mMoved = false
    const onMonthsTouchStart = (e) => { const t = e.touches && e.touches[0]; if (!t) return; mStartX = t.clientX; mStartY = t.clientY; mMoved = false }
    const onMonthsTouchEnd = (e) => { const t = e.changedTouches && e.changedTouches[0]; if (!t) return; const dx = t.clientX - mStartX; const dy = Math.abs(t.clientY - mStartY); if (Math.abs(dx) > 60 && Math.abs(dx) > dy) { if (dx < 0) nextMonth(); else prevMonth(); } }

    const onStudiesFocus = (e) => { if (e && e.target && e.target.value === '0') e.target.value = '' }
    
    return { monthLabel, totalHours, totalStudies, serviceYearMonths, currentYear, currentMonth, hoursInput, minutesInput, studiesInput, prevMonth, nextMonth, selectMonth, saveEntry, timeText, showKeypad, appendKey, applyTime, onHeaderTouchStart, onHeaderTouchEnd, onMonthsTouchStart, onMonthsTouchEnd, studiesRef, studiesPlaceholder, onStudiesFocus }
  }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 4000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: #fff; width: 100%; max-width: 560px; border-radius: 12px; box-shadow: 0 12px 28px rgba(0,0,0,0.2); overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--header-background-color); color: #fff; }
.close-x { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.35); border-radius: 6px; padding: 0.1rem 0.45rem; font-size: 1rem; }
.nav { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: #fff; padding: 0.25rem 0.5rem; border-radius: 6px; }
.summary { display: grid; grid-template-columns: 1fr; gap: 0.25rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); }
.stat-line { display: flex; align-items: center; justify-content: space-between; }
.stat-line .value { font-weight: 700; }
.months-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; padding: 0.75rem 1rem; }
.month-cell { border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem; display: flex; align-items: center; justify-content: space-between; background: #fff; color: var(--text-color); }
.month-cell .name { color: var(--text-color); font-weight: 600; }
.month-cell .mark { opacity: 0.9; }
.month-cell.ok { border-color: #4caf50; }
.month-cell.low { border-color: #f39c12; }
.month-cell.pending { opacity: 0.9; }
.month-cell.active { outline: 2px solid var(--primary-color); }
.entry { padding: 0.75rem 1rem; border-top: 1px solid var(--border-color); display: grid; gap: 0.5rem; }
.action-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 0.75rem 1rem; padding: 0.75rem; }
.row { display: flex; align-items: center; gap: 0.5rem; }
.actions { display: flex; justify-content: flex-end; }
.primary { background: var(--primary-color); color: #fff; border: 1px solid var(--primary-color); border-radius: 6px; padding: 0.45rem 0.8rem; }
.secondary { background: #fff; color: var(--text-color); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.8rem; }
.modal-footer { display: none; }
.time-display { width: 120px; text-align: center; }
.pill { background: #eef6ff; border: 1px solid #cfe1ff; color: #0b5ed7; border-radius: 999px; padding: 0.35rem 0.75rem; }
.small { transform: scale(0.95); }
.studies-input.pill { width: 96px; text-align: center; }
.saved { margin-left: auto; color: #27ae60; font-weight: 600; }

/* keypad */
.keypad { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); z-index: 5000; }
.pad { background: #1e1e1e; color: #fff; padding: 0.5rem; border-radius: 12px; width: 180px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; }
.pad .display { text-align: center; padding: 0.25rem 0; font-weight: 700; letter-spacing: 1px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; }
.pad button { padding: 0.5rem 0; border: 1px solid rgba(255,255,255,0.25); background: transparent; color: #fff; border-radius: 8px; font-size: 1rem; }
.pad button:active { background: rgba(255,255,255,0.12); }
.pad .wide { grid-column: span 3; }
.pad .ok { background: #2e7d32; border-color: #2e7d32; }
.pad .clr { background: #6d1b7b; border-color: #6d1b7b; }
</style>


