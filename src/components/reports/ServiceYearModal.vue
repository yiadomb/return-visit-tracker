<template>
  <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-header gold">
        <h3 class="title" aria-live="polite">{{ startYear }} - {{ startYear + 1 }}</h3>
        <button class="close-x" @click="$emit('close')" aria-label="Close">✕</button>
      </header>

      <div class="content">
        <div class="calendar">
          <div
            v-for="m in months"
            :key="m.key"
            class="month"
            :class="monthClass(m)"
            :title="monthTooltip(m)"
            @click="toggleAll()"
            :aria-expanded="showDetails ? 'true' : 'false'"
          >
            <div class="name">{{ m.name }}</div>
            <div v-if="m.isCurrent" class="dot" aria-hidden="true"></div>
            <div v-if="m.sent" class="sent" aria-label="Sent">✓</div>
            <div class="details" :class="{ show: showDetails && !m.future }">
              <div class="hours">{{ formatHM(m.minutes) }}</div>
              <div class="studies">{{ m.studies }}</div>
            </div>
          </div>
        </div>

        <div class="totals compact">
          <div class="total-item">
            <div class="label">Total Hours</div>
            <div class="value">{{ formatHM(totalMinutes) }}</div>
          </div>
          <div class="total-item">
            <div class="label">Average Studies</div>
            <div class="value">{{ avgStudies }}</div>
          </div>
        </div>
      </div>

      <footer class="modal-footer nav-footer">
        <button class="nav" @click="prevYear">←</button>
        <button class="nav" @click="nextYear">→</button>
      </footer>
    </div>
  </div>
</template>

<script>
import { computed, watch, ref } from 'vue'
import { reportService } from '../../services/db.js'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default {
  name: 'ServiceYearModal',
  props: {
    open: { type: Boolean, default: false },
    startYear: { type: Number, required: true }
  },
  emits: ['close','update:startYear'],
  setup(props, { emit }) {
    const monthsData = ref([])
    const startYear = computed(() => props.startYear)

    const load = async () => {
      const months = await reportService.getServiceYear(props.startYear)
      // Map into view model
      const now = new Date()
      const nowKey = `${now.getFullYear()}-${now.getMonth()}`
      monthsData.value = months.map((m) => {
        const key = `${m.year}-${m.month}`
        const minutes = m.report?.total_minutes || 0
        const studies = m.report?.studies_count || 0
        const sent = !!m.report?.sent_at
        let mark = null
        const isPast = new Date(m.year, m.month + 1, 1) <= new Date(now.getFullYear(), now.getMonth(), 1)
        const isFuture = new Date(m.year, m.month, 1) > new Date(now.getFullYear(), now.getMonth(), 1)
        if (isPast && (minutes === 0 && studies === 0) && key !== nowKey) mark = 'x'
        return {
          key,
          year: m.year,
          month: m.month,
          name: MONTH_NAMES[m.month],
          minutes,
          studies,
          mark,
          future: isFuture,
          hasData: (minutes > 0 || studies > 0),
          isCurrent: key === nowKey,
          sent
        }
      })
    }

    const months = computed(() => monthsData.value)
    const totalMinutes = computed(() => months.value.reduce((s, m) => s + (m.minutes || 0), 0))
    const avgStudies = computed(() => {
      const counted = months.value.filter(m => m.studies != null)
      if (counted.length === 0) return 0
      const sum = counted.reduce((s, m) => s + (m.studies || 0), 0)
      return Math.round((sum / counted.length) * 10) / 10
    })

    const monthClass = (m) => ({ fail: m.mark === 'x' })
    const monthTooltip = (m) => (m.mark === 'x' ? 'No report' : 'Tap to view')

    const formatHM = (mins) => {
      const h = Math.floor((mins || 0) / 60)
      const m = (mins || 0) % 60
      return `${h}:${String(m).padStart(2,'0')}`
    }

    const showDetails = ref(false)
    const isExpanded = () => showDetails.value
    const toggleAll = () => { showDetails.value = !showDetails.value }

    watch(() => props.open, (v) => { if (v) { showDetails.value = false; load() } })
    watch(() => props.startYear, () => { if (props.open) load() })

    const prevYear = () => emit('update:startYear', props.startYear - 1)
    const nextYear = () => emit('update:startYear', props.startYear + 1)

    return { months, totalMinutes, avgStudies, monthClass, monthTooltip, formatHM, prevYear, nextYear, startYear, isExpanded, toggleAll, showDetails }
  }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 4500; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: #fff; width: 100%; max-width: 560px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.15); display: flex; flex-direction: column; border: 1px solid #f59e0b; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.9rem; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; }
.modal-header.gold { color: #92400e; }
.title { margin: 0; font-size: 1rem; font-weight: 700; }
.close-x { background: rgba(255,255,255,0.2); color: #92400e; border: 1px solid rgba(146,64,14,0.25); border-radius: 8px; padding: 0.2rem 0.5rem; }
.nav { background: #f59e0b; color: #fff; border: 1px solid #f59e0b; border-radius: 8px; padding: 0.25rem 0.6rem; font-weight: 700; }
.content { padding: 1rem; }
.calendar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.35rem; }
.month { border: 1px solid #f59e0b; border-radius: 12px; padding: 0.45rem; text-align: center; background: #fff7ed; position: relative; cursor: pointer; }
.month.fail { outline: 2px solid #ef4444; background: #fef2f2; }
.name { font-weight: 700; color: #92400e; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; position: absolute; top: 8px; right: 8px; }
.sent { position: absolute; top: 6px; left: 6px; color: #16a34a; font-weight: 900; font-size: 0.85rem; }
.details { margin-top: 0.1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.1rem; align-items: center; justify-items: center; min-height: 0.9rem; }
.hours { color: #065f46; font-weight: 700; font-size: 0.62rem; }
.studies { font-size: 0.62rem; color: #d97706; font-weight: 700; }
.details:not(.show) { visibility: hidden; }
.totals { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.8rem; }
.totals.compact .total-item { transform: scale(0.85); }
.total-item { border: 1px solid #f59e0b; border-radius: 12px; padding: 0.5rem; text-align: center; background: #fffaf0; }
.label { color: #92400e; font-size: 0.8rem; }
.value { font-weight: 800; color: #d97706; }
.modal-footer { padding: 0.6rem 0.9rem; border-top: 1px solid #f59e0b; display: flex; justify-content: space-between; }
.modal-footer.nav-footer { justify-content: space-between; }
</style>


