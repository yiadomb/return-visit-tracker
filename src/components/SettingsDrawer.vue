<template>
  <div v-show="open" class="drawer-overlay" @click.self="$emit('close')">
    <aside class="drawer" :class="{ open }" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd">
      <header class="drawer-header">
        <h3>Menu</h3>
        <button class="close-btn" @click="$emit('close')" aria-label="Close">✕</button>
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

    // Simple in-drawer swipe-to-close (swipe right)
    let startX = 0
    let startY = 0
    let canSwipeClose = false
    const onTouchStart = (e) => {
      const t = e.touches && e.touches[0]
      if (!t) return
      startX = t.clientX
      startY = t.clientY
      // Only allow swipe-to-close when starting near the drawer's right edge (avoid interfering with inner gestures)
      try {
        const rect = e.currentTarget.getBoundingClientRect()
        const localX = t.clientX - rect.left
        canSwipeClose = (rect.width - localX) <= 24
      } catch { canSwipeClose = false }
    }
    const onTouchMove = (e) => {
      // no-op; reserved for visual feedback if needed
    }
    const onTouchEnd = (e) => {
      const t = e.changedTouches && e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - startX
      const dy = Math.abs(t.clientY - startY)
      if (canSwipeClose && dx > 60 && dx > dy) emit('close')
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
.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 0.9rem; border-bottom: 1px solid var(--border-color); background: var(--header-background-color); color: #fff; }
.close-btn { background: transparent; border: none; color: #fff; font-size: 1.1rem; padding: 0.2rem 0.4rem; }
.drawer-nav { display: flex; flex-direction: column; padding: 0.5rem; gap: 0.25rem; }
.report-card { text-align: left; width: 100%; padding: 0.9rem; border: 1px solid var(--border-color); background: #fff; color: var(--text-color); border-radius: 12px; display: grid; gap: 0.6rem; }
.report-head .title { font-weight: 600; }
.report-head .month { color: #666; font-size: 0.9rem; }
.report-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.report-stats .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.5rem 0.6rem; display: flex; align-items: center; justify-content: space-between; }
.report-stats .stat span { color: #64748b; }
.report-stats .stat strong { color: #0b5ed7; }
.drawer-section { padding: 0.5rem; overflow: auto; }
</style>


