<template>
  <div id="app">
    <header class="app-header">
      <div class="header-row">
        <div class="header-left">
          <h1 class="app-title">Visits</h1>
        </div>
        <div class="header-center">
          <nav class="app-nav compact">
            <router-link to="/" class="tab-link" :class="{ active: $route.name === 'Home' }" title="Contacts">
              <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.418 0-8 3.134-8 7v1h16v-1c0-3.866-3.582-7-8-7z"/>
              </svg>
              <span class="tab-text">Contacts</span>
            </router-link>
            <router-link to="/agenda" class="tab-link" :class="{ active: $route.name === 'Agenda' }" title="Today's Agenda">
              📅 <span class="tab-text">Today</span>
            </router-link>
          </nav>
        </div>
        <div class="header-right">
          <button
            class="icon-btn refresh-btn"
            @click="refreshNow"
            :title="isRefreshing ? 'Refreshing…' : 'Refresh'"
            aria-label="Refresh"
            :aria-busy="isRefreshing ? 'true' : 'false'"
            :disabled="isRefreshing"
          >
            <span v-if="!isRefreshing" class="refresh-icon" aria-hidden="true">
              <svg class="svg-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5 0 1.061-.336 2.043-.904 2.846l1.518 1.318C18.429 16.112 19 14.626 19 13c0-3.866-3.134-7-7-7zm-5 6c0-1.061.336-2.043.904-2.846L6.386 7.836C5.571 9.888 5 11.374 5 13c0 3.866 3.134 7 7 7v3l4-4-4-4v3c-2.757 0-5-2.243-5-5z"/>
              </svg>
            </span>
            <span v-else class="refresh-icon spinner" aria-hidden="true">
              <svg class="svg-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5 0 1.061-.336 2.043-.904 2.846l1.518 1.318C18.429 16.112 19 14.626 19 13c0-3.866-3.134-7-7-7zm-5 6c0-1.061.336-2.043.904-2.846L6.386 7.836C5.571 9.888 5 11.374 5 13c0 3.866 3.134 7 7 7v3l4-4-4-4v3c-2.757 0-5-2.243-5-5z"/>
              </svg>
            </span>
          </button>
          <button class="icon-btn" @click="drawerOpen = true" title="Menu" aria-label="Menu">☰</button>
        </div>
      </div>
    </header>
    
    <main class="app-main">
      <div @touchstart.passive="onEdgeTouchStart" @touchend.passive="onEdgeTouchEnd" style="height:100%">
        <router-view />
      </div>
    </main>
    <SettingsDrawer :open="drawerOpen" @close="drawerOpen=false" @open-report="onOpenReport" />
  </div>
</template>

<script>
import SettingsMenu from './components/SettingsMenu.vue'
import SettingsDrawer from './components/SettingsDrawer.vue'
import { syncService } from './services/syncService.js'
export default { 
  name: 'App', 
  components: { SettingsMenu, SettingsDrawer },
  data() {
    return {
      isRefreshing: false,
      drawerOpen: false
    }
  },
  mounted() {
    const onStart = () => { this.isRefreshing = true }
    const onEnd = () => { this.isRefreshing = false }
    window.addEventListener('rv:refresh:start', onStart)
    window.addEventListener('rv:refresh:end', onEnd)
    this._onRefreshStart = onStart
    this._onRefreshEnd = onEnd
  },
  beforeUnmount() {
    if (this._onRefreshStart) window.removeEventListener('rv:refresh:start', this._onRefreshStart)
    if (this._onRefreshEnd) window.removeEventListener('rv:refresh:end', this._onRefreshEnd)
  },
  methods: {
    async refreshNow() {
      // Provide immediate visual feedback
      this.isRefreshing = true
      try {
        if (syncService.isReady()) {
          try { syncService.init() } catch {}
          await syncService.syncAll()
        }
      } finally {
        // Ask composables to reload local data and emit end event
        window.dispatchEvent(new CustomEvent('rv:refresh'))
      }
    },
    // Edge-swipe to open drawer on phones only
    onEdgeTouchStart(e) {
      const w = window.innerWidth
      const isPhone = w <= 600
      if (!isPhone) return
      const t = e.touches && e.touches[0]
      if (!t) return
      // Only if starting near the very left edge
      if (t.clientX <= 16) {
        this._edgeStartX = t.clientX
        this._edgeStartY = t.clientY
      } else {
        this._edgeStartX = 0
        this._edgeStartY = 0
      }
    },
    onEdgeTouchEnd(e) {
      if (!this._edgeStartX && !this._edgeStartY) return
      const t = e.changedTouches && e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - this._edgeStartX
      const dy = Math.abs(t.clientY - this._edgeStartY)
      this._edgeStartX = 0
      this._edgeStartY = 0
      if (dx > 60 && dx > dy) {
        this.drawerOpen = true
      }
    },
    onOpenReport() {
      // Placeholder: we will navigate/open the report modal later
      alert("Month's report coming soon")
    }
  }
}
</script>

<style scoped>
.app-header {
  background-color: var(--header-background-color);
  color: var(--text-color);
  padding: 0.75rem 0.9rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.header-left { min-width: 0; }
.header-center { flex: 1; display: flex; justify-content: center; }
.header-right { display: flex; align-items: center; gap: 0.4rem; }

.app-title { margin: 0; font-size: 1.05rem; letter-spacing: 0.2px; color: #fff; opacity: 0.95; }
@media (max-width: 480px) { .app-title { display: none; } }

.app-nav { display: flex; align-items: center; gap: 0.5rem; }
.app-nav.compact { gap: 0.4rem; }

.tab-link { padding: 0.35rem 0.6rem; background-color: rgba(255, 255, 255, 0.12); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; border: 1px solid transparent; display: inline-flex; align-items: center; gap: 0.35rem; }
.tab-link .tab-icon { width: 18px; height: 18px; color: #3498db; }
.tab-link .tab-text { display: inline; }
.tab-link:hover { background-color: rgba(255, 255, 255, 0.2); }
.tab-link.active { background-color: white; color: var(--header-background-color); border-color: var(--primary-color); }

/* Keep labels visible on phones too */

.app-main {
  flex: 1;
  padding: 0; /* Remove padding that reduces height */
  max-width: 100%;
  overflow: hidden; /* lock vertical scroll at app level */
  display: flex;
  flex-direction: column;
  min-height: 0;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.icon-btn { padding: 0.35rem 0.5rem; background: white; color: var(--header-background-color); border: 1px solid var(--primary-color); border-radius: 8px; line-height: 1; }
.icon-btn .svg-icon { width: 18px; height: 18px; display: inline-block; color: #3498db; }
.refresh-icon { display: inline-flex; align-items: center; }
.icon-btn:hover { background: var(--primary-color); color: #fff; }
.icon-btn:disabled { opacity: 0.8; cursor: not-allowed; }

@keyframes rvspin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.icon-btn .spinner { display: inline-block; animation: rvspin 0.9s linear infinite; }

/* Hide refresh icon on phone and tablet; show only on large desktop */
@media (max-width: 1200px) {
  .refresh-btn { display: none; }
}
</style> 