import { ref } from 'vue'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

export function useNotifications() {
  const isSupported = ref(false)
  const hasPermission = ref(false)
  const error = ref(null)
  const isWebPlatform = ref(!Capacitor.isNativePlatform())
  
  // Track scheduled web notifications for cancellation
  const webNotificationTimeouts = new Map()

  // Ensure native LocalNotifications receive numeric IDs
  const toNativeId = (id) => {
    if (typeof id === 'number' && Number.isFinite(id)) return id
    if (typeof id === 'string') {
      let hash = 0
      for (let i = 0; i < id.length; i++) {
        const chr = id.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash |= 0
      }
      const n = Math.abs(hash)
      return n > 0 ? n : Date.now()
    }
    return Date.now()
  }

  // Check if notifications are supported
  const checkSupport = async () => {
    if (Capacitor.isNativePlatform()) {
      isSupported.value = true
      await checkPermissions()
    } else {
      // For web platform, check browser support
      isSupported.value = 'Notification' in window
      if (isSupported.value) {
        await checkWebPermissions()
      }
    }
  }

  // Check and request permissions for native platforms
  const checkPermissions = async () => {
    try {
      const result = await LocalNotifications.checkPermissions()
      hasPermission.value = result.display === 'granted'
      
      if (result.display !== 'granted') {
        const requestResult = await LocalNotifications.requestPermissions()
        hasPermission.value = requestResult.display === 'granted'
      }
    } catch (err) {
      error.value = err.message
      console.error('Error checking notification permissions:', err)
    }
  }

  // Check and request permissions for web platform
  const checkWebPermissions = async () => {
    try {
      console.log('Current notification permission:', Notification.permission)
      const permission = Notification.permission
      hasPermission.value = permission === 'granted'
      
      if (permission === 'default') {
        console.log('Requesting notification permission...')
        const result = await Notification.requestPermission()
        console.log('Permission request result:', result)
        hasPermission.value = result === 'granted'
      } else if (permission === 'denied') {
        console.warn('Notifications are denied. User needs to enable them manually in browser settings.')
      }
    } catch (err) {
      error.value = err.message
      console.error('Error checking web notification permissions:', err)
    }
  }

  // Schedule a notification (with web fallback)
  const scheduleNotification = async (notification) => {
    if (!hasPermission.value) {
      await checkSupport()
    }

    if (!hasPermission.value) {
      throw new Error('Notification permission not granted')
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor for native platforms (ID must be a number)
        const nativeId = toNativeId(notification.id)
        await LocalNotifications.schedule({
          notifications: [
            {
              id: nativeId,
              title: notification.title,
              body: notification.body,
              schedule: notification.schedule,
              sound: 'beep.wav',
              attachments: notification.attachments || [],
              actionTypeId: notification.actionTypeId || 'OPEN_APP',
              extra: notification.extra || {}
            }
          ]
        })
      } else {
        // Use web notifications for browsers
        await scheduleWebNotification(notification)
      }
    } catch (err) {
      error.value = err.message
      console.error('Error scheduling notification:', err)
      throw err
    }
  }

  // Schedule web notification with setTimeout for scheduling
  const scheduleWebNotification = async (notification) => {
    const scheduleTime = notification.schedule?.at
    const now = new Date()
    
    if (scheduleTime && scheduleTime > now) {
      // Schedule for future
      const delay = scheduleTime.getTime() - now.getTime()
      const timeoutId = setTimeout(() => {
        showWebNotification(notification)
        webNotificationTimeouts.delete(notification.id)
      }, delay)
      
      // Store timeout for potential cancellation
      webNotificationTimeouts.set(notification.id, timeoutId)
      console.log(`Web notification scheduled for ${scheduleTime.toLocaleString()}`)
    } else {
      // Show immediately
      showWebNotification(notification)
    }
  }

  // Show immediate web notification
  const showWebNotification = (notification) => {
    try {
      console.log('Attempting to show web notification:', notification)
      
      const webNotification = new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico', // Use favicon instead of manifest
        tag: notification.id?.toString(),
        data: notification.extra || {},
        requireInteraction: false, // Don't require user interaction to dismiss
        silent: false
      })

      console.log('Web notification created successfully:', webNotification)

      // Auto-close after 8 seconds (longer for better visibility)
      setTimeout(() => {
        webNotification.close()
        console.log('Web notification auto-closed')
      }, 8000)

      // Handle click
      webNotification.onclick = () => {
        console.log('Web notification clicked')
        window.focus()
        webNotification.close()
      }

      // Handle show event
      webNotification.onshow = () => {
        console.log('Web notification displayed successfully')
      }

      // Handle error
      webNotification.onerror = (err) => {
        console.error('Web notification error:', err)
      }

    } catch (err) {
      console.error('Error showing web notification:', err)
      // Fallback: show an in-page notification
      showFallbackNotification(notification)
    }
  }

  // Fallback in-page notification
  const showFallbackNotification = (notification) => {
    console.log('Showing fallback notification')
    const fallback = document.createElement('div')
    fallback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 320px;
      font-family: system-ui, -apple-system, sans-serif;
    `
    fallback.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${notification.title}</div>
      <div style="font-size: 14px; opacity: 0.9;">${notification.body}</div>
    `
    
    document.body.appendChild(fallback)
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (fallback.parentNode) {
        fallback.parentNode.removeChild(fallback)
      }
    }, 5000)
  }

  // Schedule daily reminder for visits (legacy)
  const scheduleDailyReminder = async (time = '07:00') => {
    const [hours, minutes] = time.split(':').map(Number)
    
    await scheduleNotification({
      id: 1,
      title: 'Return Visit Reminder',
      body: 'Check your scheduled visits for today',
      schedule: {
        repeats: true,
        every: 'day',
        at: new Date().setHours(hours, minutes, 0, 0)
      },
      extra: {
        type: 'daily_reminder'
      }
    })
  }

  // Schedule weekly reminder for specific weekday
  const scheduleWeeklyReminder = async (options) => {
    const { id, title, body, schedule, extra } = options
    const [hours, minutes] = schedule.time.split(':').map(Number)
    
    // Create a date for next occurrence of this weekday
    const now = new Date()
    const targetDay = schedule.weekday
    const currentDay = now.getDay()
    
    let daysUntilTarget = (targetDay - currentDay + 7) % 7
    if (daysUntilTarget === 0) {
      // If it's the same day, schedule for next week unless it's before the target time
      const targetTime = new Date()
      targetTime.setHours(hours, minutes, 0, 0)
      if (now >= targetTime) {
        daysUntilTarget = 7
      }
    }
    
    const nextOccurrence = new Date(now.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000)
    nextOccurrence.setHours(hours, minutes, 0, 0)
    
    await scheduleNotification({
      id,
      title,
      body,
      schedule: {
        repeats: true,
        every: 'week',
        at: nextOccurrence
      },
      extra
    })
  }

  // Schedule notification for specific visit
  const scheduleVisitReminder = async (contact, reminderTime) => {
    const visitDate = new Date(contact.next_visit_at)
    const reminderDate = new Date(visitDate.getTime() - reminderTime * 60 * 1000) // reminderTime in minutes

    await scheduleNotification({
      id: `visit_${contact.id}`,
      title: 'Upcoming Visit',
      body: `Visit ${contact.name} at ${contact.hostel_name}`,
      schedule: {
        at: reminderDate
      },
      extra: {
        type: 'visit_reminder',
        contactId: contact.id
      }
    })
  }

  // Cancel a notification
  const cancelNotification = async (id) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.cancel({
          notifications: [{ id: toNativeId(id) }]
        })
      } else {
        // Cancel web notification timeout
        const timeoutId = webNotificationTimeouts.get(id)
        if (timeoutId) {
          clearTimeout(timeoutId)
          webNotificationTimeouts.delete(id)
          console.log(`Cancelled web notification: ${id}`)
        }
      }
    } catch (err) {
      error.value = err.message
      console.error('Error canceling notification:', err)
      throw err
    }
  }

  // Get pending notifications
  const getPendingNotifications = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await LocalNotifications.getPending()
        return result.notifications
      } else {
        // Return web notifications that are scheduled
        const pending = []
        for (const [id, timeoutId] of webNotificationTimeouts.entries()) {
          pending.push({
            id: id,
            title: 'Scheduled Notification',
            body: 'Web notification pending'
          })
        }
        return pending
      }
    } catch (err) {
      error.value = err.message
      console.error('Error getting pending notifications:', err)
      return []
    }
  }

  // Initialize notifications
  const init = async () => {
    await checkSupport()
    if (isSupported.value && Capacitor.isNativePlatform()) {
      await checkPermissions()
    }
  }

  return {
    // State
    isSupported,
    hasPermission,
    error,
    isWebPlatform,

    // Methods
    init,
    checkPermissions,
    scheduleNotification,
    scheduleDailyReminder,
    scheduleWeeklyReminder,
    scheduleVisitReminder,
    cancelNotification,
    getPendingNotifications
  }
} 