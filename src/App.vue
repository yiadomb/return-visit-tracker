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
              📋 <span class="tab-text">Contacts</span>
            </router-link>
            <router-link to="/agenda" class="tab-link" :class="{ active: $route.name === 'Agenda' }" title="Today's Agenda">
              📅 <span class="tab-text">Today</span>
            </router-link>
          </nav>
        </div>
        <div class="header-right">
          <button
            class="icon-btn"
            @click="refreshNow"
            :title="isRefreshing ? 'Refreshing…' : 'Refresh'"
            aria-label="Refresh"
            :aria-busy="isRefreshing ? 'true' : 'false'"
            :disabled="isRefreshing"
          >
            <span v-if="!isRefreshing">🔄</span>
            <span v-else class="spinner">🔄</span>
          </button>
          <SettingsMenu />
        </div>
      </div>
    </header>
    
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script>
import SettingsMenu from './components/SettingsMenu.vue'
import { syncService } from './services/syncService.js'
export default { 
  name: 'App', 
  components: { SettingsMenu },
  data() {
    return {
      isRefreshing: false
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
    }
  }
}
</script>

<style scoped>
.app-header {
  background-color: var(--header-background-color);
  color: var(--text-color);
  padding: 0.5rem 0.75rem;
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
.tab-link .tab-text { display: inline; }
.tab-link:hover { background-color: rgba(255, 255, 255, 0.2); }
.tab-link.active { background-color: white; color: var(--header-background-color); border-color: var(--primary-color); }

/* Keep labels visible on phones too */

.app-main {
  flex: 1;
  padding: 1rem;
  max-width: 100%;
  overflow: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.icon-btn { padding: 0.35rem 0.5rem; background: white; color: var(--header-background-color); border: 1px solid var(--primary-color); border-radius: 8px; line-height: 1; }
.icon-btn:hover { background: var(--primary-color); color: #fff; }
.icon-btn:disabled { opacity: 0.8; cursor: not-allowed; }

@keyframes rvspin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.icon-btn .spinner { display: inline-block; animation: rvspin 0.9s linear infinite; }
</style> 