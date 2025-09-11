<template>
  <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
        <header class="modal-header">
        <h3>{{ monthLabel }}</h3>
        <div class="header-actions">
          <button class="details-btn" @click="openDetails">View Details</button>
          <button class="close-x" @click="$emit('close')" aria-label="Close">✕</button>
        </div>
        </header>

      <div class="content">
        <div class="report-box" :class="{ celebrate: showHoursCelebration }">
          <div class="cards">
            <button class="card hours" @click="openEntry">
              <div class="icon">⏱️</div>
              <div class="main">{{ hoursText }}</div>
              <div v-if="hoursGoal > 0" class="goal-thin">
                <div class="goal-fill" :style="{ width: hoursPct + '%' }"></div>
              </div>
            </button>

            <button class="card studies" @click="openEntry">
              <div class="icon">📚</div>
              <div class="main">{{ studiesTotal }}</div>
              <div v-if="studiesGoal > 0" class="goal-tiny" :class="{ celebrate: showStudiesCelebration }">
                <div class="goal-fill" :style="{ width: studiesPct + '%' }"></div>
          </div>
            </button>
          </div>

          <button class="nav left" @click="prevMonth">‹</button>
          <button class="nav right" @click="nextMonth">›</button>

          <div v-if="showHoursCelebration" class="confetti">🎉✨👏</div>
        </div>
      </div>

      <ReportEntryModal 
        :open="entryOpen"
        :year="currentYear"
        :month="currentMonth"
        :entry="editingEntry"
        @close="entryOpen=false; editingEntry=null"
        @saved="onDataChanged"
      />

      <ViewDetailsModal 
        :open="detailsOpen"
        :year="currentYear"
        :month="currentMonth"
        :entries="entries"
        @close="detailsOpen=false"
        @edit="onEditEntry"
        @delete="onDeleteEntry"
        @send="onSendReport"
      />
    </div>
  </div>
  
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { reportService, reportEntryService, monthlyGoalService } from '../../services/db.js'
import ReportEntryModal from './ReportEntryModal.vue'
import ViewDetailsModal from './ViewDetailsModal.vue'

export default {
  name: 'MonthsReportModal',
  components: { ReportEntryModal, ViewDetailsModal },
  props: { 
    open: { type: Boolean, default: false },
    startMode: { type: String, default: 'display' }
  },
  emits: ['close','updated'],
  setup(props, { emit }) {
    const now = new Date()
    const currentYear = ref(now.getFullYear())
    const currentMonth = ref(now.getMonth())

    const minutesTotal = ref(0)
    const studiesTotal = ref(0)
    const hoursText = computed(() => {
      const h = Math.floor((minutesTotal.value || 0) / 60)
      const m = (minutesTotal.value || 0) % 60
      return `${h}:${String(m).padStart(2,'0')}`
    })

    const hoursGoal = ref(0)
    const studiesGoal = ref(0)
    const hoursPct = computed(() => hoursGoal.value > 0 ? Math.min(100, Math.round((minutesTotal.value / hoursGoal.value) * 100)) : 0)
    const studiesPct = computed(() => studiesGoal.value > 0 ? Math.min(100, Math.round((studiesTotal.value / studiesGoal.value) * 100)) : 0)

    const monthLabel = computed(() => new Date(currentYear.value, currentMonth.value, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))

    const entryOpen = ref(false)
    const detailsOpen = ref(false)
    const entries = ref([])
    const editingEntry = ref(null)

    const showHoursCelebration = ref(false)
    const showStudiesCelebration = ref(false)

    const loadTotals = async () => {
      const t = await reportService.getMonthlyTotals(currentYear.value, currentMonth.value)
      minutesTotal.value = t.minutes
      studiesTotal.value = t.studies
    }
    const loadGoals = async () => {
      const g = await monthlyGoalService.getMonthlyGoals(currentYear.value, currentMonth.value)
      hoursGoal.value = Math.max(g?.minutes_goal || 0, 0)
      studiesGoal.value = Math.max(g?.studies_goal || 0, 0)
    }
    const loadEntries = async () => {
      entries.value = await reportEntryService.getEntries(currentYear.value, currentMonth.value)
    }

    const refresh = async () => {
      await Promise.all([loadTotals(), loadGoals(), loadEntries()])
      emit('updated')
    }

    const openEntry = () => { editingEntry.value = null; entryOpen.value = true }
    const openDetails = () => { detailsOpen.value = true }

    const onDataChanged = async () => { await refresh() }
    const onEditEntry = (entry) => { editingEntry.value = entry; entryOpen.value = true }
    const onDeleteEntry = async (id) => { await reportEntryService.deleteEntry(id); await refresh() }

    const prevMonth = async () => { let m = currentMonth.value - 1; let y = currentYear.value; if (m < 0) { m = 11; y -= 1 } currentMonth.value = m; currentYear.value = y; await refresh() }
    const nextMonth = async () => { let m = currentMonth.value + 1; let y = currentYear.value; if (m > 11) { m = 0; y += 1 } currentMonth.value = m; currentYear.value = y; await refresh() }

    watch([() => props.open], async ([isOpen]) => { if (isOpen) await refresh() })
    onMounted(refresh)

    watch(hoursPct, (v, o) => { if (hoursGoal.value > 0 && v >= 100 && (o || 0) < 100) { showHoursCelebration.value = true; setTimeout(() => showHoursCelebration.value = false, 1500) } })
    watch(studiesPct, (v, o) => { if (studiesGoal.value > 0 && v >= 100 && (o || 0) < 100) { showStudiesCelebration.value = true; setTimeout(() => showStudiesCelebration.value = false, 1500) } })

    const onSendReport = async () => {
      const moveLeftover = localStorage.getItem('moveLeftoverToNextMonth') === 'true'
      const { reported_minutes, minutes_sum, studies_sum } = await reportService.finalizeMonth(currentYear.value, currentMonth.value, { moveLeftover })

      const publisherName = (localStorage.getItem('publisherName') || 'user').trim() || 'user'
      const includeHours = localStorage.getItem('includeHours') === 'true'
      const shareChannel = localStorage.getItem('shareChannel') || 'whatsapp'
      const recipientPhone = (localStorage.getItem('recipientPhone') || '').replace(/\D/g, '')

      const labelMonth = monthLabel.value
      const lines = []
      lines.push(`Report from '${publisherName}'`)
      lines.push(labelMonth)
      lines.push('')

      if (minutes_sum > 0 && includeHours) {
        const h = Math.floor((reported_minutes || 0) / 60)
        lines.push(`Hours: ${h}h`)
      } else if (minutes_sum > 0 && !includeHours) {
        lines.push('Has participated in the minitry')
      } else {
        lines.push('Did not participate in the minitry')
      }

      if ((studies_sum || 0) > 0) {
        lines.push(`Studies: ${studies_sum}`)
      } else {
        lines.push('No Studies conducted')
      }

      const text = encodeURIComponent(lines.join('\n'))
      if (shareChannel === 'whatsapp') {
        const base = recipientPhone ? `https://wa.me/${recipientPhone}` : 'https://wa.me/'
        window.open(`${base}?text=${text}`, '_blank')
      } else {
        const base = recipientPhone ? `sms:${recipientPhone}` : 'sms:'
        window.location.href = `${base}?body=${text}`
      }

      try {
        const existing = await reportService.getReport(currentYear.value, currentMonth.value)
        if (existing) {
          await db.monthlyReports.update(existing.id, { sent_at: new Date().toISOString(), sent_channel: shareChannel })
        }
      } catch {}
    }

    return { 
      currentYear, currentMonth, monthLabel, hoursText, studiesTotal, hoursGoal, studiesGoal, hoursPct, studiesPct,
      entryOpen, detailsOpen, entries, editingEntry, openEntry, openDetails, onDataChanged, onEditEntry, onDeleteEntry,
      prevMonth, nextMonth, onSendReport, showHoursCelebration, showStudiesCelebration
    }
  }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 4000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: #fff; width: 100%; max-width: 560px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; max-height: 90vh; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 1rem 1.25rem; background: var(--header-background-color); color: #fff; }
.header-actions { display: flex; align-items: center; gap: 0.5rem; }
.details-btn { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.4rem 0.6rem; font-size: 0.85rem; }
.close-x { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.4rem 0.6rem; font-size: 0.9rem; cursor: pointer; }
.content { padding: 1rem 1.25rem 1.25rem; }

.report-box { position: relative; border: 1px solid var(--border-color); border-radius: 14px; background: #fff; padding: 1rem; overflow: hidden; }
.report-box.celebrate::after { content: '🎉'; position: absolute; inset: 0; opacity: 0.08; font-size: 8rem; display: flex; align-items: center; justify-content: center; }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.card { position: relative; border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; background: #fff; display: flex; flex-direction: column; align-items: center; gap: 0.35rem; }
.card .icon { font-size: 1.2rem; opacity: 0.9; }
.card .main { font-size: 1.6rem; font-weight: 800; color: var(--primary-color); }
.card.hours .goal-thin { width: 100%; height: 6px; border-radius: 3px; background: #e5e7eb; overflow: hidden; }
.card.studies .goal-tiny { width: 60%; height: 4px; border-radius: 2px; background: #e5e7eb; overflow: hidden; }
.goal-fill { height: 100%; background: linear-gradient(90deg, #10b981, #059669); transition: width 0.5s ease; }
.goal-tiny.celebrate::after { content: '🎉'; margin-left: 0.25rem; }

.nav { position: absolute; bottom: 6px; background: #fff; border: 1px solid var(--border-color); color: var(--text-color); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.nav.left { left: 6px; }
.nav.right { right: 6px; }

.confetti { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; font-size: 2rem; animation: fade 0.9s ease; }
@keyframes fade { from { opacity: 0.6; } to { opacity: 0; } }
</style>


