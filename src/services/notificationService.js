import { contactService } from './db'

class NotificationService {
  constructor() {
    this.notifications = null
    this.isInitialized = false
    this.scheduledVisitIds = new Set()
  }

  // Initialize the notification service
  async init() {
    if (this.isInitialized) return

    try {
      // Import the composable dynamically to avoid SSR issues
      const { useNotifications } = await import('../composables/useNotifications')
      this.notifications = useNotifications()
      await this.notifications.init()
      this.isInitialized = true
      
      // Schedule daily reminder for 7 AM
      if (this.notifications.hasPermission.value) {
        await this.scheduleDailyReminder()
        await this.scheduleVisitReminders()
      }
      
      console.log('Notification service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize notification service:', error)
    }
  }

  // Schedule smart daily reminders for weekdays with contacts
  async scheduleDailyReminder() {
    try {
      // Check if daily reminders are enabled
      const isEnabled = localStorage.getItem('dailyReminderEnabled') === 'true'
      if (!isEnabled) {
        console.log('Daily reminders disabled, skipping')
        return
      }

      const reminderTime = localStorage.getItem('dailyTime') || '07:00'
      console.log('Scheduling smart daily reminders for', reminderTime)

      // Clear existing daily reminders first
      await this.clearDailyReminders()

      // Get all contacts to check which days have contacts
      const contacts = await contactService.getAll()
      
      // Real weekdays only (not Flexible, NotAtHomes, Others)
      const realDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      
      for (const day of realDays) {
        // Check if this day has any contacts
        const dayContacts = contacts.filter(contact => 
          contact.bucket === day && !contact.archived
        )
        
        if (dayContacts.length > 0) {
          await this.notifications.scheduleWeeklyReminder({
            id: `daily_${day.toLowerCase()}`,
            title: '🗓️ Ministry Reminder',
            body: `You have ${dayContacts.length} contact${dayContacts.length > 1 ? 's' : ''} scheduled for ${day}`,
            schedule: {
              weekday: this.getDayIndex(day),
              time: reminderTime
            },
            extra: {
              type: 'daily_reminder',
              day: day,
              contactCount: dayContacts.length
            }
          })
          console.log(`Scheduled daily reminder for ${day} (${dayContacts.length} contacts)`)
        }
      }
    } catch (error) {
      console.error('Failed to schedule daily reminders:', error)
    }
  }

  // Helper to get day index for scheduling (0 = Sunday, 6 = Saturday)
  getDayIndex(dayName) {
    const dayMap = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    }
    return dayMap[dayName] || 0
  }

  // Clear all daily reminders
  async clearDailyReminders() {
    try {
      const pendingNotifications = await this.notifications.getPendingNotifications()
      
      for (const notification of pendingNotifications) {
        if (notification.extra?.type === 'daily_reminder') {
          await this.notifications.cancelNotification(notification.id)
        }
      }
      
      console.log('Cleared all daily reminders')
    } catch (error) {
      console.error('Failed to clear daily reminders:', error)
    }
  }

  // Schedule reminders for all upcoming visits
  async scheduleVisitReminders() {
    if (!this.notifications?.hasPermission.value) {
      console.log('No notification permission, skipping visit reminders')
      return
    }

    try {
      const contacts = await contactService.getAll()
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Clear existing visit reminders
      await this.clearVisitReminders()

      for (const contact of contacts) {
        if (!contact.next_visit_at) continue

        const visitDate = new Date(contact.next_visit_at)
        
        // Only schedule notifications for future visits within the next 7 days
        if (visitDate > now && visitDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
          await this.scheduleVisitReminder(contact)
        }
      }

      console.log(`Scheduled reminders for ${this.scheduledVisitIds.size} upcoming visits`)
    } catch (error) {
      console.error('Failed to schedule visit reminders:', error)
    }
  }

  // Schedule reminder for a specific visit
  async scheduleVisitReminder(contact) {
    try {
      if (!contact.next_visit_at) return
      const visitDate = new Date(contact.next_visit_at)
      const reminders = Array.isArray(contact.reminders) && contact.reminders.length > 0 ? contact.reminders : ['-30']
      const now = new Date()

      for (const token of reminders) {
        let triggerDate

        if (token === 'morningOf') {
          triggerDate = new Date(visitDate)
          triggerDate.setHours(7, 0, 0, 0)
        } else if (token === 'dayBefore') {
          triggerDate = new Date(visitDate.getTime() - 24 * 60 * 60 * 1000)
          triggerDate.setHours(7, 0, 0, 0)
        } else {
          const offsetMin = Number(token)
          if (isNaN(offsetMin)) continue
          triggerDate = new Date(visitDate.getTime() + offsetMin * 60 * 1000)
        }

        if (triggerDate <= now) {
          if (visitDate > now) {
            triggerDate = new Date(now.getTime() + 2000) // 2 s from now
          } else {
            continue
          }
        }

        const notificationId = `visit_${contact.id}_${token}`

        await this.notifications.scheduleNotification({
          id: notificationId,
          title: '📅 Upcoming Visit',
          body: `Visit ${contact.name} at ${contact.hostel_name || 'Unknown location'} soon`,
          schedule: { at: triggerDate },
          extra: {
            type: 'visit_reminder',
            contactId: contact.id,
            offset: token
          }
        })
      }

      this.scheduledVisitIds.add(contact.id)
    } catch (error) {
      console.error(`Failed to schedule reminder for ${contact.name}:`, error)
    }
  }

  // Cancel reminder for a specific visit
  async cancelVisitReminder(contactId) {
    try {
      const notificationId = `visit_${contactId}`
      await this.notifications.cancelNotification(notificationId)
      this.scheduledVisitIds.delete(contactId)
      console.log(`Cancelled reminder for contact ${contactId}`)
    } catch (error) {
      console.error(`Failed to cancel reminder for contact ${contactId}:`, error)
    }
  }

  // Clear all visit reminders
  async clearVisitReminders() {
    try {
      const pendingNotifications = await this.notifications.getPendingNotifications()
      
      for (const notification of pendingNotifications) {
        if (notification.extra?.type === 'visit_reminder') {
          await this.notifications.cancelNotification(notification.id)
        }
      }
      
      this.scheduledVisitIds.clear()
      console.log('Cleared all visit reminders')
    } catch (error) {
      console.error('Failed to clear visit reminders:', error)
    }
  }

  // Schedule notification for today's visits (called from agenda)
  async scheduleTodaysVisits(todaysContacts) {
    if (!this.notifications?.hasPermission.value) {
      console.log('No notification permission for today\'s visits')
      return
    }

    try {
      // Schedule immediate notification if there are visits today
      if (todaysContacts.length > 0) {
        const visitNames = todaysContacts.slice(0, 3).map(c => c.name).join(', ')
        const moreText = todaysContacts.length > 3 ? ` and ${todaysContacts.length - 3} more` : ''
        
        await this.notifications.scheduleNotification({
          id: `today_${Date.now()}`,
          title: `📋 ${todaysContacts.length} Visit${todaysContacts.length > 1 ? 's' : ''} Today`,
          body: `Scheduled: ${visitNames}${moreText}`,
          schedule: {
            at: new Date(Date.now() + 2000) // 2 seconds from now
          },
          extra: {
            type: 'todays_agenda',
            visitCount: todaysContacts.length
          }
        })

        console.log(`Scheduled today's visits notification for ${todaysContacts.length} visits`)
      }
    } catch (error) {
      console.error('Failed to schedule today\'s visits notification:', error)
    }
  }

  // Update notifications when a contact is modified
  async onContactUpdated(contact, oldContact = null) {
    if (!this.isInitialized) return

    try {
      // Cancel old reminder if visit date changed
      if (oldContact && oldContact.next_visit_at !== contact.next_visit_at) {
        await this.cancelVisitReminder(contact.id)
      }

      // Schedule new reminder if there's a future visit date
      if (contact.next_visit_at) {
        const visitDate = new Date(contact.next_visit_at)
        const now = new Date()
        
        if (visitDate > now && visitDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
          await this.scheduleVisitReminder(contact)
        }
      }

      // Update daily reminders if contact bucket changed
      if (!oldContact || oldContact.bucket !== contact.bucket) {
        await this.scheduleDailyReminder()
      }
    } catch (error) {
      console.error('Failed to update notifications for contact:', error)
    }
  }

  // Remove notifications when a contact is deleted
  async onContactDeleted(contactId) {
    if (!this.isInitialized) return

    try {
      await this.cancelVisitReminder(contactId)
      // Refresh daily reminders since a contact was removed
      await this.scheduleDailyReminder()
    } catch (error) {
      console.error('Failed to remove notifications for deleted contact:', error)
    }
  }

  // Refresh daily reminders (call when settings change)
  async refreshDailyReminders() {
    if (!this.isInitialized) return

    try {
      await this.scheduleDailyReminder()
      console.log('Daily reminders refreshed')
    } catch (error) {
      console.error('Failed to refresh daily reminders:', error)
    }
  }

  // Get notification service status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasPermission: this.notifications?.hasPermission.value || false,
      isSupported: this.notifications?.isSupported.value || false,
      scheduledVisits: this.scheduledVisitIds.size,
      error: this.notifications?.error.value || null
    }
  }

  // Request notification permissions
  async requestPermissions() {
    if (!this.notifications) {
      await this.init()
    }
    
    return await this.notifications.checkPermissions()
  }
}

// Create singleton instance
export const notificationService = new NotificationService()

// Note: Call notificationService.init() manually when needed 