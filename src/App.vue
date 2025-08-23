<template>
  <div id="app">
    <header class="app-header">
      <h1>Return Visit Tracker</h1>
      <nav class="app-nav">
        <router-link to="/" class="nav-link" :class="{ active: $route.name === 'Home' }">
          📋 Contacts
        </router-link>
        <router-link to="/agenda" class="nav-link" :class="{ active: $route.name === 'Agenda' }">
          📅 Today's Agenda
        </router-link>
        <router-link to="/settings" class="nav-link" :class="{ active: $route.name === 'Settings' }">
          ⚙️ Settings
        </router-link>
      </nav>
    </header>
    
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style scoped>
.app-header {
  background-color: var(--header-background-color);
  color: var(--text-color);
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
}

.app-nav {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.nav-link {
  padding: 0.5rem 1rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.nav-link.active {
  background-color: white;
  color: var(--header-background-color);
  border-color: var(--primary-color);
}

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
</style> 