<template>
  <div v-show="open" class="drawer-overlay" @click.self="$emit('close')">
    <aside class="drawer" :class="{ open }" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
      <header class="drawer-header">
        <h3>Menu</h3>
      </header>

      <nav class="drawer-nav">
        <div class="report-card">
          <div class="report-header">
            <div class="report-title-section">
              <div class="month">{{ monthLabel }}</div>
            </div>
            <div class="report-action-hint">
              <button class="view-details-btn" @click.stop="openDetails">View Details</button>
            </div>
          </div>
          
          <div class="report-overview">
            <button class="stat-card hours" @click="openEntry">
              <div class="stat-icon">⏱️</div>
              <div class="stat-content">
                <div class="stat-label">Hours</div>
                <div class="stat-value">{{ formatHM(totalMinutes) }}</div>
              </div>
            </button>
            <button class="stat-card studies" @click="openEntry">
              <div class="stat-icon">📚</div>
              <div class="stat-content">
                <div class="stat-label">Studies</div>
                <div class="stat-value">{{ totalStudies }}</div>
                <div v-if="studiesGoal > 0" class="goal-tiny">
                  <div class="goal-fill" :style="{ width: studiesPct + '%', background: studiesBarGradient }"></div>
                </div>
              </div>
            </button>
          </div>
          
          <div class="report-footer">
            <div class="progress-indicator">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: getProgressPercent() + '%', background: hoursBarGradient }"></div>
              </div>
              <!-- no progress text per new UX -->
            </div>
          </div>
          <button class="mini-nav left" @click="prevMonth">←</button>
          <button class="mini-nav right" @click="nextMonth">→</button>
        </div>
        
        <!-- Service Year Access - Compact -->
        <button class="service-year-btn" @click="openServiceYear">
          <div class="sy-icon">📊</div>
          <div class="sy-info">
            <div class="sy-label">Service Year Overview</div>
            <div class="sy-summary">{{ formatServiceYearSummary() }}</div>
          </div>
        </button>
      </nav>

      <section class="drawer-section">
        <SettingsMenu :inline="true" />
      </section>

      <ReportEntryModal :open="entryOpen" :year="currentYear" :month="currentMonth" :entry="editingEntry" @close="entryOpen=false; editingEntry=null" @saved="onReportUpdated" />
      <ViewDetailsModal :open="detailsOpen" :year="currentYear" :month="currentMonth" :entries="entries" @close="detailsOpen=false" @edit="onEditEntry" @delete="onDeleteEntry" @send="onSendReport" />
      <ServiceYearModal 
        :open="serviceYearOpen" 
        :start-year="serviceYearStart" 
        @update:startYear="serviceYearStart = $event" 
        @close="serviceYearOpen=false" 
      />
    </aside>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import SettingsMenu from './SettingsMenu.vue'
import ReportEntryModal from './reports/ReportEntryModal.vue'
import ViewDetailsModal from './reports/ViewDetailsModal.vue'
import ServiceYearModal from './reports/ServiceYearModal.vue'
import { reportService, reportEntryService, monthlyGoalService } from '../services/db.js'

export default {
  name: 'SettingsDrawer',
  components: { SettingsMenu, ReportEntryModal, ViewDetailsModal, ServiceYearModal },
  props: {
    open: { type: Boolean, default: false }
  },
  emits: ['close','open-report'],
  setup(props, { emit }) {
    const now = new Date()
    const currentMonth = ref(now.getMonth())
    const currentYear = ref(now.getFullYear())
    const monthLabel = computed(() => new Date(currentYear.value, currentMonth.value, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    const totalMinutes = ref(0)
    const totalStudies = ref(0)
    const hoursGoal = ref(0)
    const studiesGoal = ref(0)
    const hoursPct = computed(() => hoursGoal.value > 0 ? Math.min(100, Math.round((totalMinutes.value / hoursGoal.value) * 100)) : 0)
    const studiesPct = computed(() => studiesGoal.value > 0 ? Math.min(100, Math.round((totalStudies.value / studiesGoal.value) * 100)) : 0)
    const detailsOpen = ref(false)
    const entryOpen = ref(false)
    const editingEntry = ref(null)
    const entries = ref([])
    const serviceYearOpen = ref(false)
    const serviceYearStart = ref(now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1)

    const formatHM = (mins) => {
      const h = Math.floor((mins || 0) / 60)
      const m = (mins || 0) % 60
      return `${h}:${String(m).padStart(2,'0')}`
    }

    const loadCurrentMonthTotals = async () => {
      const t = await reportService.getMonthlyTotals(currentYear.value, currentMonth.value)
      totalMinutes.value = t.minutes || 0
      totalStudies.value = t.studies || 0
    }

    const loadGoals = async () => {
      const g = await monthlyGoalService.getMonthlyGoals(currentYear.value, currentMonth.value)
      hoursGoal.value = Math.max(g?.minutes_goal || 0, 0)
      studiesGoal.value = Math.max(g?.studies_goal || 0, 0)
    }

    const loadEntries = async () => {
      entries.value = await reportEntryService.getEntries(currentYear.value, currentMonth.value)
    }

    // Swipe-to-close (swipe right)
    let startX = 0
    let startY = 0
    let startTime = 0
    let isDragging = false
    
    const onTouchStart = (e) => {
      // Don't interfere with interactive elements
      const target = e.target
      if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.closest('button, input, select'))) {
        return
      }
      
      const t = e.touches && e.touches[0]
      if (!t) return
      
      startX = t.clientX
      startY = t.clientY
      startTime = Date.now()
      isDragging = false
    }
    
    const onTouchMove = (e) => {
      if (!startX) return
      
      const t = e.touches && e.touches[0]
      if (!t) return
      
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      
      // Only consider it a drag if we've moved significantly
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        isDragging = true
        
        // If swiping horizontally (left or right), prevent other touch behaviors
        if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy)) {
          e.preventDefault()
        }
      }
    }
    
    const onTouchEnd = (e) => {
      if (!startX || !isDragging) {
        startX = 0
        return
      }
      
      const t = e.changedTouches && e.changedTouches[0]
      if (!t) return
      
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      const duration = Date.now() - startTime
      
      // Close if: swiping left or right, more horizontal than vertical, minimum distance, reasonable speed
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5 && duration < 500) {
        emit('close')
      }
      
      startX = 0
      isDragging = false
    }

    // Refresh when drawer opens
    watch(() => props.open, async (newVal) => {
      if (newVal) {
        await onReportUpdated()
        // Trigger refresh for archived contacts count
        window.dispatchEvent(new CustomEvent('rv:refresh'))
      }
    })
    
    // Progress calculation for visual feedback
    const getProgressPercent = () => {
      return hoursGoal.value > 0 ? Math.min(100, Math.round((totalMinutes.value / hoursGoal.value) * 100)) : 0
    }

    // Dynamic red→yellow→green gradient based on percent
    const makeGradient = (pct, colorStops) => {
      const clamped = Math.max(0, Math.min(100, pct))
      // interpolate across three stops: red -> yellow -> green
      // 0-50%: red to yellow, 50-100%: yellow to green
      const t = clamped / 100
      const red = colorStops[0]
      const yellow = colorStops[1]
      const green = colorStops[2]
      const mix = (a, b, p) => {
        const ar = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab = parseInt(a.slice(5,7),16)
        const br = parseInt(b.slice(1,3),16), bg = parseInt(b.slice(3,5),16), bb = parseInt(b.slice(5,7),16)
        const rr = Math.round(ar + (br - ar) * p).toString(16).padStart(2,'0')
        const rg = Math.round(ag + (bg - ag) * p).toString(16).padStart(2,'0')
        const rb = Math.round(ab + (bb - ab) * p).toString(16).padStart(2,'0')
        return `#${rr}${rg}${rb}`
      }
      const mid = 0.5
      const color = t < mid ? mix(red, yellow, t / mid) : mix(yellow, green, (t - mid) / (1 - mid))
      return `linear-gradient(90deg, ${color} 0%, ${color} 100%)`
    }

    const hoursBarGradient = computed(() => makeGradient(getProgressPercent(), ['#ef4444','#f59e0b','#22c55e']))
    const studiesBarGradient = computed(() => makeGradient(studiesPct.value, ['#ef4444','#f59e0b','#22c55e']))

    const getProgressText = () => {
      const currentHours = Math.floor((totalMinutes.value || 0) / 60)
      return totalMinutes.value > 0 ? `${currentHours}h this month` : 'No time recorded yet'
    }

    const formatServiceYearSummary = () => {
      const start = serviceYearStart.value
      const end = start + 1
      return `Sep ${start} - Aug ${end}`
    }

    onMounted(async () => { 
      await onReportUpdated(); 
      try { window.addEventListener('rv:report:updated', onReportUpdated) } catch {}
    })
    onBeforeUnmount(() => { try { window.removeEventListener('rv:report:updated', onReportUpdated) } catch {} })
    const onReportUpdated = async () => { await loadCurrentMonthTotals(); await loadGoals(); await loadEntries(); }

    const openDetails = async () => { await loadEntries(); detailsOpen.value = true }
    const openEntry = () => { editingEntry.value = null; entryOpen.value = true }
    const onEditEntry = (e) => { detailsOpen.value = false; editingEntry.value = e; entryOpen.value = true }
    const onDeleteEntry = async (id) => { await reportEntryService.deleteEntry(id); await onReportUpdated() }

    const prevMonth = async () => { let m = currentMonth.value - 1; let y = currentYear.value; if (m < 0) { m = 11; y -= 1 } currentMonth.value = m; currentYear.value = y; await onReportUpdated() }
    const nextMonth = async () => { let m = currentMonth.value + 1; let y = currentYear.value; if (m > 11) { m = 0; y += 1 } currentMonth.value = m; currentYear.value = y; await onReportUpdated() }

    const noop = () => {}
    const openServiceYear = () => { serviceYearOpen.value = true }

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
        lines.push('Has participated in the ministry')
      } else {
        lines.push('Did not participate in the ministry')
      }
      if ((studies_sum || 0) > 0) { lines.push(`Studies: ${studies_sum}`) } else { lines.push('No Studies conducted') }
      const text = encodeURIComponent(lines.join('\n'))
      if (shareChannel === 'whatsapp') {
        const base = recipientPhone ? `https://wa.me/${recipientPhone}` : 'https://wa.me/'
        window.open(`${base}?text=${text}`, '_blank')
      } else {
        const base = recipientPhone ? `sms:${recipientPhone}` : 'sms:'
        window.location.href = `${base}?body=${text}`
      }
    }

    return { 
      monthLabel, onTouchStart, onTouchMove, onTouchEnd,
      totalMinutes, totalStudies, hoursGoal, studiesGoal, hoursPct, studiesPct, formatHM, onReportUpdated, getProgressPercent, getProgressText,
      formatServiceYearSummary, hoursBarGradient, studiesBarGradient,
      // New interactions
      detailsOpen, entryOpen, editingEntry, entries, openDetails, openEntry, onEditEntry, onDeleteEntry, onSendReport,
      currentYear, currentMonth, prevMonth, nextMonth, noop,
      serviceYearOpen, serviceYearStart, openServiceYear
    }
  }
}
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  z-index: 3000;
}
.drawer {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: min(86vw, 320px);
  background: #fff;
  box-shadow: 2px 0 16px rgba(0,0,0,0.15);
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  display: flex;
  flex-direction: column;
}
.drawer.open { transform: translateX(0); }
.drawer-header { display: flex; align-items: center; justify-content: center; padding: 0.9rem 0.9rem; border-bottom: 1px solid var(--border-color); background: var(--header-background-color); color: #fff; }
.drawer-nav { display: flex; flex-direction: column; padding: 0.5rem; gap: 0.25rem; }

/* Enhanced Report Card */
.report-card { 
  text-align: left; 
  width: 100%; 
  padding: 0; 
  border: 1px solid #10b981; 
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #dcfce7 100%); 
  color: var(--text-color); 
  border-radius: 16px; 
  display: flex; 
  flex-direction: column; 
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15); 
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25);
  border-color: #059669;
}

/* Report header */
.report-header {
  display: flex;
  align-items: center;
  padding: 1rem 1.2rem 0.8rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%);
}

.report-icon {
  font-size: 1.4rem;
  margin-right: 0.75rem;
}

.report-title-section {
  flex: 1;
}

.report-title-section .title { 
  font-weight: 700; 
  font-size: 1rem;
  color: #064e3b;
  margin-bottom: 0.2rem;
}

.report-title-section .month { 
  color: #059669; 
  font-size: 0.85rem; 
  font-weight: 500;
}

.report-action-hint {
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.report-card:hover .report-action-hint {
  opacity: 1;
}

.action-arrow {
  font-size: 1.2rem;
  color: #059669;
  font-weight: bold;
}

.view-details-btn { background: rgba(255,255,255,0.12); color: #065f46; border: 1px solid rgba(6,78,59,0.25); border-radius: 8px; padding: 0.2rem 0.5rem; font-weight: 600; cursor: pointer; font-size: 0.85rem; }

/* Report stats overview */
.report-overview { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 0.75rem; 
  padding: 0 1.2rem;
}

.stat-card { 
  background: rgba(255, 255, 255, 0.95); 
  border: 1px solid rgba(16, 185, 129, 0.15); 
  border-radius: 12px; 
  padding: 0.8rem; 
  display: flex; 
  align-items: center; 
  gap: 0.6rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.stat-card.hours { background: #d1fae5; border-color: #6ee7b7; }
.stat-card.studies { background: #fef3c7; border-color: #f59e0b; }

.stat-card:hover {
  background: rgba(255, 255, 255, 1);
  transform: translateY(-1px);
}

.stat-icon {
  font-size: 1.1rem;
  opacity: 0.8;
}

.stat-card.hours .stat-icon { color: #059669; }
.stat-card.studies .stat-icon { color: #d97706; }

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stat-label { 
  color: #6b7280; 
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-bottom: 0.1rem;
}

.stat-value { 
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1.2;
}
.stat-card.hours .stat-value { color: #065f46; }
.stat-card.studies .stat-value { color: #b45309; }

/* Progress footer */
.report-footer {
  padding: 0.8rem 1.2rem 1.2rem;
}

.progress-indicator {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  width: calc(100% - 80px);
  height: 6px;
  background: rgba(5, 150, 105, 0.15); /* green tint to match hours card */
  border-radius: 3px;
  overflow: hidden;
  margin: 0 auto; /* center the bar */
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

/* Tiny studies goal bar inside studies card */
.goal-tiny {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(217, 119, 6, 0.15); /* studies bg matches studies card tint */
  overflow: hidden;
  margin-top: 6px;
}

.goal-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: #059669;
  font-weight: 600;
  text-align: center;
}

.mini-nav { position: absolute; bottom: 4px; background: #065f46; border: 1px solid #065f46; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.mini-nav.left { left: 8px; }
.mini-nav.right { right: 8px; }

/* Service Year Button */
.service-year-btn {
  width: 100%;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.5rem;
}

.service-year-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
}

.sy-icon {
  font-size: 1.1rem;
  opacity: 0.9;
}

.sy-info {
  flex: 1;
  text-align: left;
}

.sy-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.1rem;
}

.sy-summary {
  font-size: 0.75rem;
  color: #d97706;
  opacity: 0.8;
}

.sy-arrow {
  font-size: 1rem;
  color: #d97706;
  opacity: 0.7;
}

.service-year-btn:hover .sy-arrow {
  opacity: 1;
}
.drawer-section { 
  padding: 0.5rem; 
  overflow-y: auto; 
  flex: 1; 
  min-height: 0; 
  -webkit-overflow-scrolling: touch;
}
</style>


