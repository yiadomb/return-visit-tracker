<template>
  <div v-if="open" class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <header class="header">
        <h3>Set Monthly Goals</h3>
        <button class="close-x" @click="$emit('close')" aria-label="Close">✕</button>
      </header>

      <div class="content">
        <div class="row year-row">
          <label>Year</label>
          <div class="custom-dropdown" :ref="el => yearDropdownRef = el">
            <button type="button" class="dropdown-trigger" @click="showYearDropdown = !showYearDropdown">
              {{ yearRef }}
              <span class="dropdown-arrow">{{ showYearDropdown ? '▲' : '▼' }}</span>
            </button>
            <div v-if="showYearDropdown" class="dropdown-menu">
              <button
                v-for="y in yearOptions"
                :key="y"
                type="button"
                class="dropdown-option"
                :class="{ active: y === yearRef }"
                @click="selectYear(y)"
              >
                {{ y }}
              </button>
            </div>
          </div>
        </div>

        <div class="month-grid">
          <button
            v-for="(name, m) in monthNames"
            :key="m"
            :class="['month', { selected: isSelected(m), hasGoal: hasGoal(m) }]"
            @click="toggleMonth(m)"
          >
            {{ name }}
            <span v-if="hasGoal(m)" class="goal-dot" aria-hidden="true"></span>
          </button>
        </div>

        <div class="goals">
          <div class="field">
            <label>Hours</label>
            <div class="input-wrapper">
              <input type="text" v-model="hoursText" />
              <span class="suffix">HH:MM</span>
            </div>
          </div>
          <div class="field">
            <label>Number of studies</label>
            <input type="number" inputmode="numeric" min="0" v-model.number="studiesGoal" />
          </div>
        </div>
      </div>

      <footer class="footer">
        <button class="secondary" @click="clearSelection">Clear Selection</button>
        <button class="primary" @click="saveGoals">Save</button>
      </footer>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { monthlyGoalService } from '../../services/db.js'

export default {
  name: 'GoalsManager',
  props: { open: { type: Boolean, default: false } },
  emits: ['close','saved'],
  setup(props, { emit }) {
    const now = new Date()
    const yearRef = ref(now.getFullYear())
    const START_YEAR = 2025
    const yearOptions = computed(() => {
      const current = new Date().getFullYear()
      const end = current + 5
      const out = []
      for (let y = START_YEAR; y <= end; y++) out.push(y)
      return out
    })
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const selected = ref(new Set())
    const goalsSet = ref(new Set())

    const hoursText = ref('')
    const studiesGoal = ref(0)

    const isSelected = (m) => selected.value.has(m)
    const toggleMonth = (m) => { const s = selected.value; s.has(m) ? s.delete(m) : s.add(m); selected.value = new Set(s) }
    const clearSelection = () => { selected.value = new Set() }

    const hasGoal = (m) => goalsSet.value.has(m)

    const loadYearGoals = async () => {
      const arr = await monthlyGoalService.listGoalsForYear(yearRef.value)
      const s = new Set(arr.filter(g => (g.minutes_goal > 0 || g.studies_goal > 0)).map(g => g.month))
      goalsSet.value = s
    }

    const parseHHMM = (t) => {
      if (!t) return 0
      const parts = String(t).split(':')
      let h = 0, m = 0
      if (parts.length === 2) { h = parseInt(parts[0] || '0', 10); m = parseInt(parts[1] || '0', 10) }
      else { h = parseInt(parts[0] || '0', 10) }
      if (isNaN(h)) h = 0; if (isNaN(m)) m = 0; m = Math.min(Math.max(m,0),59)
      return (Math.max(h,0) * 60) + m
    }

    const showYearDropdown = ref(false)
    const yearDropdownRef = ref(null)
    const selectYear = (y) => { yearRef.value = y; showYearDropdown.value = false; loadYearGoals() }

    const onDocClick = (e) => {
      if (!showYearDropdown.value) return
      const el = yearDropdownRef.value
      if (el && !el.contains(e.target)) showYearDropdown.value = false
    }

    onMounted(() => {
      document.addEventListener('click', onDocClick)
      if (yearRef.value < START_YEAR) yearRef.value = START_YEAR
      loadYearGoals()
      const refresh = () => loadYearGoals()
      try {
        window.addEventListener('rv:goals:updated', refresh)
        window.__rv_goals_refresh = refresh
      } catch {}
    })
    onBeforeUnmount(() => {
      document.removeEventListener('click', onDocClick)
      if (window.__rv_goals_refresh) {
        window.removeEventListener('rv:goals:updated', window.__rv_goals_refresh)
        delete window.__rv_goals_refresh
      }
    })

    const saveGoals = async () => {
      const minutes = parseHHMM(hoursText.value)
      const studies = Math.max(parseInt(studiesGoal.value || 0, 10) || 0, 0)
      const months = Array.from(selected.value)
      for (const m of months) {
        await monthlyGoalService.setMonthlyGoals(yearRef.value, m, { minutes_goal: minutes, studies_goal: studies })
      }
      await loadYearGoals()
      emit('saved')
      emit('close')
    }

    return { yearRef, yearOptions, monthNames, isSelected, toggleMonth, clearSelection, hoursText, studiesGoal, saveGoals, showYearDropdown, yearDropdownRef, selectYear, hasGoal }
  }
}
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 4500; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: #fff; width: 100%; max-width: 520px; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.9rem; background: var(--header-background-color); color: #fff; }
.close-x { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.2rem 0.5rem; font-size: 0.9rem; }
.content { padding: 0.9rem; display: flex; flex-direction: column; gap: 0.75rem; }
.row { display: flex; align-items: center; justify-content: space-between; }
.year-row { gap: 0.5rem; }
.custom-dropdown { position: relative; display: inline-block; min-width: 110px; }
.dropdown-trigger { background: #fff; color: var(--text-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.3rem 0.6rem; display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; width: 100%; }
.dropdown-arrow { font-size: 0.75rem; opacity: 0.7; }
.dropdown-menu { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10; max-height: 200px; overflow: auto; }
.dropdown-option { display: block; width: 100%; padding: 0.4rem 0.6rem; background: transparent; border: none; text-align: left; color: var(--text-color); cursor: pointer; }
.dropdown-option:hover { background: var(--cell-background-color, #f3f4f6); }
.dropdown-option.active { background: var(--primary-color); color: #fff; }
.month-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
.month { position: relative; border: 1px solid var(--border-color); background: #fff; border-radius: 10px; padding: 0.6rem 0.4rem; cursor: pointer; color: var(--text-color); }
.month.selected { outline: 2px solid var(--primary-color); background: #f0f9ff; }
.month.hasGoal { border-color: #3b82f6; background: #eff6ff; }
.goal-dot { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; border-radius: 50%; background: #3b82f6; }
.goals { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.field label { display:block; font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem; }
.input-wrapper { position: relative; }
.field input { width: 100%; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem 0.6rem; color: var(--text-color); background: #fff; }
.suffix { position: absolute; right: 0.6rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; color: #6b7280; pointer-events: none; }
.footer { display: flex; justify-content: space-between; gap: 0.5rem; padding: 0.6rem 0.9rem; border-top: 1px solid var(--border-color); }
.primary { background: var(--primary-color); color: #fff; border: none; border-radius: 10px; padding: 0.6rem 1.2rem; font-weight: 700; }
.secondary { background: #fff; color: var(--text-color); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.6rem 1.2rem; }
</style>


