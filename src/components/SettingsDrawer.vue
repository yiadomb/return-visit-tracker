<template>
  <div v-show="open" class="drawer-overlay" @click.self="$emit('close')">
    <aside class="drawer" :class="{ open }" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
      <header class="drawer-header">
        <h3>Menu</h3>
      </header>

      <nav class="drawer-nav">
        <button class="report-card" @click="showReport=true">
          <div class="report-head">
            <div class="title">Month's report</div>
            <div class="month">{{ monthLabel }}</div>
          </div>
          <div class="report-stats">
            <div class="stat"><span>Hours</span><strong>{{ formatHM(totalMinutes) }}</strong></div>
            <div class="stat"><span>Studies</span><strong>{{ totalStudies }}</strong></div>
          </div>
        </button>
      </nav>

      <section class="drawer-section">
        <SettingsMenu :inline="true" />
      </section>

      <MonthsReportModal :open="showReport" @close="showReport=false" @updated="onReportUpdated" />
    </aside>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import SettingsMenu from './SettingsMenu.vue'
import MonthsReportModal from './reports/MonthsReportModal.vue'
import { reportService } from '../services/db.js'

export default {
  name: 'SettingsDrawer',
  components: { SettingsMenu, MonthsReportModal },
  props: {
    open: { type: Boolean, default: false }
  },
  emits: ['close','open-report'],
  setup(props, { emit }) {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const showReport = ref(false)
    const totalMinutes = ref(0)
    const totalStudies = ref(0)

    const formatHM = (mins) => {
      const h = Math.floor((mins || 0) / 60)
      const m = (mins || 0) % 60
      return `${h}:${String(m).padStart(2,'0')}`
    }

    const loadCurrentMonthTotals = async () => {
      const r = await reportService.getReport(currentYear, currentMonth)
      totalMinutes.value = r?.total_minutes || 0
      totalStudies.value = r?.studies_count || 0
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
        await loadCurrentMonthTotals()
        // Trigger refresh for archived contacts count
        window.dispatchEvent(new CustomEvent('rv:refresh'))
      }
    })
    
    onMounted(loadCurrentMonthTotals)
    const onReportUpdated = async () => { await loadCurrentMonthTotals() }

    return { monthLabel, onTouchStart, onTouchMove, onTouchEnd, showReport, totalMinutes, totalStudies, formatHM, onReportUpdated }
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
.report-card { text-align: left; width: 100%; padding: 0.9rem; border: 1px solid #4caf50; background: linear-gradient(135deg, #e8f5e8 0%, #f1f8f1 100%); color: var(--text-color); border-radius: 12px; display: grid; gap: 0.6rem; box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15); }
.report-head .title { font-weight: 600; }
.report-head .month { color: #666; font-size: 0.9rem; }
.report-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.report-stats .stat { background: rgba(255,255,255,0.9); border: 1px solid rgba(76, 175, 80, 0.2); border-radius: 10px; padding: 0.5rem 0.6rem; display: flex; align-items: center; justify-content: space-between; }
.report-stats .stat span { color: #64748b; }
.report-stats .stat strong { color: #0b5ed7; }
.drawer-section { 
  padding: 0.5rem; 
  overflow-y: auto; 
  flex: 1; 
  min-height: 0; 
  -webkit-overflow-scrolling: touch;
}
</style>


