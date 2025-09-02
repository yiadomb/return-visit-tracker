import { onMounted, onUnmounted } from 'vue'
import { syncService } from '../services/syncService.js'

export function usePullToRefresh(getScrollableEl, onAfter = async () => {}) {
  let startY = 0
  let pulling = false
  let atTop = false
  const THRESHOLD = 60

  const onTouchStart = (e) => {
    const scroller = getScrollableEl()
    if (!scroller) return
    atTop = scroller.scrollTop <= 0
    if (!atTop) return
    const t = e.touches && e.touches[0]
    if (!t) return
    startY = t.clientY
    pulling = true
  }

  const onTouchMove = (e) => {
    if (!pulling) return
    const t = e.touches && e.touches[0]
    if (!t) return
    const dy = t.clientY - startY
    if (dy < 0) {
      // user scrolled up: cancel
      pulling = false
    }
  }

  const onTouchEnd = async () => {
    if (!pulling) return
    pulling = false
    // Trigger sync
    try {
      if (syncService.isReady()) {
        try { syncService.init() } catch {}
        await syncService.syncAll()
      }
    } finally {
      await onAfter()
    }
  }

  onMounted(() => {
    const scroller = getScrollableEl()
    if (!scroller) return
    scroller.addEventListener('touchstart', onTouchStart, { passive: true })
    scroller.addEventListener('touchmove', onTouchMove, { passive: true })
    scroller.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    const scroller = getScrollableEl()
    if (!scroller) return
    scroller.removeEventListener('touchstart', onTouchStart)
    scroller.removeEventListener('touchmove', onTouchMove)
    scroller.removeEventListener('touchend', onTouchEnd)
  })
}


