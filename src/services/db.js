import Dexie from 'dexie'

// Define the database
class ReturnVisitDatabase extends Dexie {
  constructor() {
    super('ReturnVisitTracker')
    
    // Define schemas
    this.version(1).stores({
      contacts: '++id, name, phone, bucket, next_visit_at, hostel_name, location_detail, last_outcome, notes, tags',
      backupMeta: '++id, last_synced_at, remote_id'
    })
    
    // Version 2: Add display_order field for contact reordering
    this.version(2).stores({
      contacts: '++id, name, phone, bucket, next_visit_at, hostel_name, location_detail, last_outcome, notes, tags, display_order',
      backupMeta: '++id, last_synced_at, remote_id'
    }).upgrade(async tx => {
      // Set initial display_order based on creation order for existing contacts
      const contacts = await tx.table('contacts').toArray()
      const bucketGroups = {}
      
      // Group contacts by bucket
      contacts.forEach(contact => {
        if (!bucketGroups[contact.bucket]) {
          bucketGroups[contact.bucket] = []
        }
        bucketGroups[contact.bucket].push(contact)
      })
      
      // Set display_order for each bucket
      for (const bucket in bucketGroups) {
        const bucketContacts = bucketGroups[bucket]
        bucketContacts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        
        for (let i = 0; i < bucketContacts.length; i++) {
          await tx.table('contacts').update(bucketContacts[i].id, {
            display_order: i
          })
        }
      }
    })
    
    // Version 3: Add remote_uuid and updated_at fields for cloud sync
    this.version(3).stores({
      contacts: '++id, remote_uuid, name, phone, bucket, next_visit_at, hostel_name, location_detail, last_outcome, notes, tags, display_order, updated_at',
      backupMeta: '++id, last_synced_at, remote_id'
    }).upgrade(async tx => {
      const contacts = await tx.table('contacts').toArray()
      const updates = contacts.map(c => tx.table('contacts').update(c.id, { updated_at: c.updated_at || new Date().toISOString() }))
      await Promise.all(updates)
    })

    // Version 4: Monthly ministry reports (aggregate minutes + studies per month)
    this.version(4).stores({
      contacts: '++id, remote_uuid, name, phone, bucket, next_visit_at, hostel_name, location_detail, last_outcome, notes, tags, display_order, updated_at',
      backupMeta: '++id, last_synced_at, remote_id',
      monthlyReports: '++id, remote_uuid, year, month, total_minutes, studies_count, updated_at'
    }).upgrade(async tx => {
      // nothing to migrate
      return
    })

    // Version 5: Add archived field for contacts
    this.version(5).stores({
      contacts: '++id, remote_uuid, name, phone, bucket, next_visit_at, hostel_name, location_detail, last_outcome, notes, tags, display_order, updated_at, archived',
      backupMeta: '++id, last_synced_at, remote_id',
      monthlyReports: '++id, remote_uuid, year, month, total_minutes, studies_count, updated_at'
    }).upgrade(async tx => {
      // Set archived to false for all existing contacts
      const contacts = await tx.table('contacts').toArray()
      const updates = contacts.map(c => tx.table('contacts').update(c.id, { archived: false }))
      await Promise.all(updates)
    })

    // Version 6: Add reportEntries, monthlyGoals, agendaNotes
    this.version(6).stores({
      contacts: '++id, remote_uuid, name, phone, bucket, next_visit_at, hostel_name, location_detail, last_outcome, notes, tags, display_order, updated_at, archived',
      backupMeta: '++id, last_synced_at, remote_id',
      monthlyReports: '++id, remote_uuid, year, month, total_minutes, studies_count, updated_at',
      reportEntries: '++id, year, month, entry_date, minutes, studies, is_carryover, updated_at',
      monthlyGoals: '++id, year, month, minutes_goal, studies_goal, updated_at',
      agendaNotes: '++id, pinned, created_at, updated_at'
    }).upgrade(async tx => {
      // nothing to migrate; new tables only
      return
    })

    // Version 7: Add visitOccurrences for multi-date scheduling
    this.version(7).stores({
      contacts: '++id, remote_uuid, name, phone, bucket, next_visit_at, hostel_name, location_detail, last_outcome, notes, tags, display_order, updated_at, archived',
      backupMeta: '++id, last_synced_at, remote_id',
      monthlyReports: '++id, remote_uuid, year, month, total_minutes, studies_count, updated_at',
      reportEntries: '++id, year, month, entry_date, minutes, studies, is_carryover, updated_at',
      monthlyGoals: '++id, year, month, minutes_goal, studies_goal, updated_at',
      agendaNotes: '++id, pinned, created_at, updated_at',
      visitOccurrences: '++id, remote_uuid, contact_id, scheduled_at, status, updated_at, contact_remote_uuid, reminders'
    }).upgrade(async tx => {
      // Backfill: create one occurrence from existing next_visit_at
      try {
        const contacts = await tx.table('contacts').toArray()
        const nowIso = new Date().toISOString()
        for (const c of contacts) {
          if (!c || !c.next_visit_at) continue
          const iso = new Date(c.next_visit_at).toISOString()
          // Avoid duplicate backfill if an occurrence already exists for this exact date
          const existing = await tx.table('visitOccurrences')
            .where('contact_id').equals(c.id)
            .toArray()
          const already = existing && existing.some(o => o.scheduled_at === iso)
          if (already) continue
          await tx.table('visitOccurrences').add({
            contact_id: c.id,
            scheduled_at: iso,
            status: 'planned',
            reminders: c.reminders || ['-30'],
            created_at: nowIso,
            updated_at: nowIso,
            contact_remote_uuid: c.remote_uuid || null,
            remote_uuid: null
          })
        }
      } catch (e) {
        console.warn('visitOccurrences backfill failed', e)
      }
    })

    // Version 8: Add bucket_time (HH:mm) for per-day default time
    this.version(8).stores({
      contacts: '++id, remote_uuid, name, phone, bucket, next_visit_at, hostel_name, location_detail, last_outcome, notes, tags, display_order, updated_at, archived, bucket_time',
      backupMeta: '++id, last_synced_at, remote_id',
      monthlyReports: '++id, remote_uuid, year, month, total_minutes, studies_count, updated_at',
      reportEntries: '++id, year, month, entry_date, minutes, studies, is_carryover, updated_at',
      monthlyGoals: '++id, year, month, minutes_goal, studies_goal, updated_at',
      agendaNotes: '++id, pinned, created_at, updated_at',
      visitOccurrences: '++id, remote_uuid, contact_id, scheduled_at, status, updated_at, contact_remote_uuid, reminders'
    }).upgrade(async tx => {
      // No data migration required. Initialize bucket_time to empty string.
      const contacts = await tx.table('contacts').toArray()
      await Promise.all(contacts.map(c => tx.table('contacts').update(c.id, { bucket_time: c.bucket_time || '' })))
    })

    // Define the Contact table
    this.contacts = this.table('contacts')
    this.visitOccurrences = this.table('visitOccurrences')
    this.backupMeta = this.table('backupMeta')
    this.monthlyReports = this.table('monthlyReports')
    this.reportEntries = this.table('reportEntries')
    this.monthlyGoals = this.table('monthlyGoals')
    this.agendaNotes = this.table('agendaNotes')
  }
}

// Create database instance
export const db = new ReturnVisitDatabase()

// CRUD Operations for Contacts
export const contactService = {
  // Create a new contact
  async create(contact) {
    try {
      // Get the next display_order for the bucket
      const existingContacts = await db.contacts
        .where('bucket')
        .equals(contact.bucket || 'Saturday')
        .toArray()
      
      const nextDisplayOrder = existingContacts.length
      
      const id = await db.contacts.add({
        name: contact.name || '',
        phone: contact.phone || '',
        bucket: contact.bucket || 'Saturday',
        next_visit_at: contact.next_visit_at || null,
        bucket_time: contact.bucket_time || '',
        hostel_name: contact.hostel_name || '',
        location_detail: contact.location_detail || '',
        last_outcome: contact.last_outcome || '',
        notes: contact.notes || '',
        tags: contact.tags || '',
        reminders: contact.reminders || ['-30'],
        display_order: nextDisplayOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        remote_uuid: contact.remote_uuid || null,
        archived: false
      })
      return await db.contacts.get(id)
    } catch (error) {
      console.error('Error creating contact:', error)
      throw error
    }
  },

  // Get all contacts
  async getAll() {
    try {
      return await db.contacts.orderBy('name').toArray()
    } catch (error) {
      console.error('Error getting all contacts:', error)
      throw error
    }
  },

  // Get contacts by bucket
  async getByBucket(bucket) {
    try {
      return await db.contacts.where('bucket').equals(bucket).toArray()
    } catch (error) {
      console.error('Error getting contacts by bucket:', error)
      throw error
    }
  },

  // Get contact by ID
  async getById(id) {
    try {
      return await db.contacts.get(id)
    } catch (error) {
      console.error('Error getting contact by ID:', error)
      throw error
    }
  },

  // Update a contact
  async update(id, changes) {
    try {
      await db.contacts.update(id, {
        ...changes,
        updated_at: new Date().toISOString()
      })
      return await db.contacts.get(id)
    } catch (error) {
      console.error('Error updating contact:', error)
      throw error
    }
  },

  // Delete a contact
  async delete(id) {
    try {
      await db.contacts.delete(id)
      return true
    } catch (error) {
      console.error('Error deleting contact:', error)
      throw error
    }
  },

  // Get today's scheduled visits
  async getTodaysVisits() {
    try {
      const today = new Date().toISOString().split('T')[0]
      return await db.contacts.where('next_visit_at').equals(today).toArray()
    } catch (error) {
      console.error('Error getting today\'s visits:', error)
      throw error
    }
  }
}

// Occurrence operations (per-visit scheduling)
export const occurrenceService = {
  // Create a new occurrence
  async create({ contact_id, scheduled_at, reminders = null, status = 'planned' }) {
    if (!contact_id || !scheduled_at) throw new Error('contact_id and scheduled_at are required')
    const nowIso = new Date().toISOString()
    const contact = await db.contacts.get(contact_id)
    if (!contact) throw new Error('Contact not found for occurrence')
    const id = await db.visitOccurrences.add({
      contact_id,
      scheduled_at: new Date(scheduled_at).toISOString(),
      reminders: Array.isArray(reminders) ? reminders : (contact.reminders || ['-30']),
      status,
      created_at: nowIso,
      updated_at: nowIso,
      contact_remote_uuid: contact.remote_uuid || null,
      remote_uuid: null
    })
    await this.updateContactNextVisit(contact_id)
    return await db.visitOccurrences.get(id)
  },

  // Ensure an occurrence exists exactly at scheduled_at (idempotent)
  async addOrIgnore({ contact_id, scheduled_at, reminders = null, status = 'planned' }) {
    const iso = new Date(scheduled_at).toISOString()
    const list = await db.visitOccurrences.where('contact_id').equals(contact_id).toArray()
    const targetMs = new Date(iso).getTime()
    const found = list.find(o => new Date(o.scheduled_at).getTime() === targetMs)
    if (found) {
      // Optionally update reminders if provided
      if (Array.isArray(reminders) && reminders.length > 0) {
        await db.visitOccurrences.update(found.id, { reminders, updated_at: new Date().toISOString() })
      }
      return found
    }
    return await this.create({ contact_id, scheduled_at: iso, reminders, status })
  },

  // Update an occurrence
  async update(id, changes) {
    const safe = { ...changes, updated_at: new Date().toISOString() }
    await db.visitOccurrences.update(id, safe)
    const occ = await db.visitOccurrences.get(id)
    if (occ?.contact_id) await this.updateContactNextVisit(occ.contact_id)
    return occ
  },

  async delete(id) {
    const occ = await db.visitOccurrences.get(id)
    await db.visitOccurrences.delete(id)
    if (occ?.contact_id) await this.updateContactNextVisit(occ.contact_id)
    return true
  },

  // Delete all occurrences for the same contact at the exact same datetime
  async deleteByContactAndTime(contact_id, scheduled_at) {
    const targetMs = new Date(scheduled_at).getTime()
    const list = await db.visitOccurrences.where('contact_id').equals(contact_id).toArray()
    const idsToDelete = list
      .filter(o => new Date(o.scheduled_at).getTime() === targetMs)
      .map(o => o.id)
    if (idsToDelete.length > 0) {
      await db.visitOccurrences.bulkDelete(idsToDelete)
      await this.updateContactNextVisit(contact_id)
    }
    return true
  },

  // List occurrences for a specific date (YYYY-MM-DD)
  async listForDate(dateString) {
    const all = await db.visitOccurrences.where('scheduled_at').above('\u0000').toArray()
    return all.filter(o => new Date(o.scheduled_at).toISOString().split('T')[0] === dateString)
  },

  // List upcoming occurrences within N days
  async listUpcoming(withinDays = 7) {
    const now = new Date()
    const end = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)
    const all = await db.visitOccurrences.where('scheduled_at').above('\u0000').toArray()
    return all.filter(o => {
      const d = new Date(o.scheduled_at)
      return d > now && d <= end && o.status !== 'cancelled'
    })
  },

  async listForContact(contact_id) {
    return await db.visitOccurrences.where('contact_id').equals(contact_id).toArray()
  },

  // Recompute and update the contact.next_visit_at to the earliest future occurrence (or null)
  async updateContactNextVisit(contact_id) {
    const occs = await db.visitOccurrences.where('contact_id').equals(contact_id).toArray()
    const now = new Date()
    const future = occs
      .filter(o => new Date(o.scheduled_at) >= now && o.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    const nextIso = future[0]?.scheduled_at || ''
    await db.contacts.update(contact_id, { next_visit_at: nextIso || '', updated_at: new Date().toISOString() })
    return nextIso
  }
}

// Ministry Reports (monthly aggregates)
export const reportService = {
  async getReport(year, month) {
    return await db.monthlyReports.where({ year, month }).first()
  },

  async saveReport({ year, month, total_minutes, studies_count }) {
    const existing = await db.monthlyReports.where({ year, month }).first()
    const nowIso = new Date().toISOString()
    if (existing) {
      await db.monthlyReports.update(existing.id, {
        total_minutes: Math.max(total_minutes || 0, 0),
        studies_count: Math.max(studies_count || 0, 0),
        updated_at: nowIso
      })
      return await db.monthlyReports.get(existing.id)
    } else {
      const id = await db.monthlyReports.add({
        year,
        month,
        total_minutes: Math.max(total_minutes || 0, 0),
        studies_count: Math.max(studies_count || 0, 0),
        updated_at: nowIso,
        remote_uuid: null
      })
      return await db.monthlyReports.get(id)
    }
  },

  async getServiceYear(yearStart) {
    // Service year: Sep (8) .. Dec (11) of yearStart, then Jan (0)..Aug (7) of yearStart+1
    const first = await db.monthlyReports.where('year').equals(yearStart).and(r => r.month >= 8).toArray()
    const second = await db.monthlyReports.where('year').equals(yearStart + 1).and(r => r.month <= 7).toArray()
    const map = new Map()
    ;[...first, ...second].forEach(r => {
      map.set(`${r.year}-${r.month}`, r)
    })
    const months = []
    for (let m = 8; m <= 11; m++) months.push({ year: yearStart, month: m, report: map.get(`${yearStart}-${m}`) || null })
    for (let m = 0; m <= 7; m++) months.push({ year: yearStart + 1, month: m, report: map.get(`${yearStart + 1}-${m}`) || null })
    return months
  },

  // Derived totals from entries; also ensures monthlyReports is kept in sync
  async getMonthlyTotals(year, month) {
    const entries = await db.reportEntries.where({ year, month }).toArray()
    const minutes = entries.reduce((sum, e) => sum + Math.max(e.minutes || 0, 0), 0)
    const studies = entries.reduce((sum, e) => sum + Math.max(e.studies || 0, 0), 0)
    return { minutes, studies }
  },

  async updateMonthlyAggregate(year, month) {
    const { minutes, studies } = await this.getMonthlyTotals(year, month)
    await this.saveReport({ year, month, total_minutes: minutes, studies_count: studies })
    return { minutes, studies }
  },

  // Finalize a month by returning "reported" minutes following policy, and optionally creating carry-over entry
  // Options: { moveLeftover: boolean }
  async finalizeMonth(year, month, { moveLeftover } = { moveLeftover: false }) {
    const { minutes, studies } = await this.getMonthlyTotals(year, month)
    const leftover = minutes % 60
    let reportedMinutes = minutes
    let carryoverApplied = false

    if (moveLeftover && leftover > 0) {
      // Create carry-over entry on 1st of next month
      const next = new Date(year, month + 1, 1)
      await db.reportEntries.add({
        year: next.getFullYear(),
        month: next.getMonth(),
        entry_date: new Date(next.getFullYear(), next.getMonth(), 1).toISOString(),
        minutes: leftover,
        studies: 0,
        comment: `Carry-over from ${new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        is_carryover: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      reportedMinutes = minutes - leftover
      carryoverApplied = true
      // Update aggregates on both months
      await this.updateMonthlyAggregate(year, month)
      await this.updateMonthlyAggregate(next.getFullYear(), next.getMonth())
    } else {
      // Round to nearest hour with 30-minute threshold
      const hours = Math.floor(minutes / 60)
      const roundUp = leftover >= 30
      reportedMinutes = (hours + (roundUp ? 1 : 0)) * 60
    }

    // Save reported_minutes meta on monthly report
    const existing = await this.getReport(year, month)
    const nowIso = new Date().toISOString()
    if (existing) {
      await db.monthlyReports.update(existing.id, {
        reported_minutes: Math.max(reportedMinutes || 0, 0),
        carryover_applied: !!carryoverApplied,
        updated_at: nowIso
      })
    } else {
      const id = await db.monthlyReports.add({
        year,
        month,
        total_minutes: minutes,
        studies_count: studies,
        reported_minutes: Math.max(reportedMinutes || 0, 0),
        carryover_applied: !!carryoverApplied,
        updated_at: nowIso,
        remote_uuid: null
      })
      await db.monthlyReports.get(id)
    }

    return { reported_minutes: reportedMinutes, minutes_sum: minutes, studies_sum: studies, carryover_applied: carryoverApplied }
  }
}

// Entry-level operations for reporting (incremental adds/edits)
export const reportEntryService = {
  async getEntries(year, month) {
    // Ascending by entry_date so newest appears at the bottom
    return await db.reportEntries.where({ year, month }).sortBy('entry_date')
  },

  async addEntry({ year, month, minutes = 0, studies = 0, comment = '', entry_date = null, is_carryover = false }) {
    const now = new Date()
    const iso = (entry_date && new Date(entry_date).toISOString()) || now.toISOString()
    const id = await db.reportEntries.add({
      year,
      month,
      entry_date: iso,
      minutes: Math.max(parseInt(minutes || 0, 10), 0),
      studies: Math.max(parseInt(studies || 0, 10), 0),
      comment: String(comment || '').slice(0, 200),
      is_carryover: !!is_carryover,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    await reportService.updateMonthlyAggregate(year, month)
    try { window.dispatchEvent(new CustomEvent('rv:report:updated')) } catch {}
    return await db.reportEntries.get(id)
  },

  async updateEntry(id, changes) {
    const entry = await db.reportEntries.get(id)
    if (!entry) return null
    const safe = { ...changes }
    if (safe.minutes != null) safe.minutes = Math.max(parseInt(safe.minutes || 0, 10), 0)
    if (safe.studies != null) safe.studies = Math.max(parseInt(safe.studies || 0, 10), 0)
    if (safe.comment != null) safe.comment = String(safe.comment || '').slice(0, 200)
    if (safe.entry_date != null) safe.entry_date = new Date(safe.entry_date).toISOString()
    safe.updated_at = new Date().toISOString()
    await db.reportEntries.update(id, safe)
    await reportService.updateMonthlyAggregate(entry.year, entry.month)
    try { window.dispatchEvent(new CustomEvent('rv:report:updated')) } catch {}
    return await db.reportEntries.get(id)
  },

  async deleteEntry(id) {
    const entry = await db.reportEntries.get(id)
    if (!entry) return true
    await db.reportEntries.delete(id)
    await reportService.updateMonthlyAggregate(entry.year, entry.month)
    try { window.dispatchEvent(new CustomEvent('rv:report:updated')) } catch {}
    return true
  }
}

// Monthly goals operations
export const monthlyGoalService = {
  async getMonthlyGoals(year, month) {
    return await db.monthlyGoals.where({ year, month }).first()
  },

  async listGoalsForYear(year) {
    try {
      // Fallback-safe query that works even without a dedicated 'year' index
      const arr = await db.monthlyGoals.filter(g => g.year === year).toArray()
      return arr
    } catch (e) {
      // Last resort - return empty
      console.error('listGoalsForYear failed', e)
      return []
    }
  },

  async setMonthlyGoals(year, month, { minutes_goal = 0, studies_goal = 0 }) {
    const existing = await this.getMonthlyGoals(year, month)
    const nowIso = new Date().toISOString()
    if (existing) {
      await db.monthlyGoals.update(existing.id, {
        minutes_goal: Math.max(parseInt(minutes_goal || 0, 10), 0),
        studies_goal: Math.max(parseInt(studies_goal || 0, 10), 0),
        updated_at: nowIso
      })
      const g = await db.monthlyGoals.get(existing.id)
      try { window.dispatchEvent(new CustomEvent('rv:report:updated')) } catch {}
      try { window.dispatchEvent(new CustomEvent('rv:goals:updated')) } catch {}
      return g
    } else {
      const id = await db.monthlyGoals.add({
        year,
        month,
        minutes_goal: Math.max(parseInt(minutes_goal || 0, 10), 0),
        studies_goal: Math.max(parseInt(studies_goal || 0, 10), 0),
        updated_at: nowIso
      })
      const g = await db.monthlyGoals.get(id)
      try { window.dispatchEvent(new CustomEvent('rv:report:updated')) } catch {}
      try { window.dispatchEvent(new CustomEvent('rv:goals:updated')) } catch {}
      return g
    }
  }
}

// Agenda Notes (multi-note, WYSIWYG stored as sanitized HTML)
export const notesService = {
  async list() {
    const arr = await db.agendaNotes.toArray()
    // Sort: pinned first, then updated_at desc
    return arr.sort((a, b) => (b.pinned === true) - (a.pinned === true) || new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
  },

  async create({ html = '', pinned = false } = {}) {
    const now = new Date().toISOString()
    const id = await db.agendaNotes.add({ html: String(html || ''), pinned: !!pinned, created_at: now, updated_at: now })
    return await db.agendaNotes.get(id)
  },

  async update(id, { html, pinned }) {
    const changes = { updated_at: new Date().toISOString() }
    if (html != null) changes.html = String(html)
    if (pinned != null) changes.pinned = !!pinned
    await db.agendaNotes.update(id, changes)
    return await db.agendaNotes.get(id)
  },

  async remove(id) {
    await db.agendaNotes.delete(id)
    return true
  }
}

// Backup metadata operations
export const backupService = {
  async getLastSync() {
    try {
      const meta = await db.backupMeta.limit(1).first()
      return meta || null
    } catch (error) {
      console.error('Error getting last sync:', error)
      throw error
    }
  },

  async updateLastSync(syncData) {
    try {
      const existing = await db.backupMeta.limit(1).first()
      if (existing) {
        await db.backupMeta.update(existing.id, {
          last_synced_at: new Date().toISOString(),
          remote_id: syncData.remote_id || existing.remote_id
        })
      } else {
        await db.backupMeta.add({
          last_synced_at: new Date().toISOString(),
          remote_id: syncData.remote_id || null
        })
      }
    } catch (error) {
      console.error('Error updating last sync:', error)
      throw error
    }
  }
}

// Predefined constants from PRD
export const BUCKETS = [
  'Saturday',
  'Sunday', 
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Flexible',
  'NotAtHomes',
  'Others'
]

export const MINISTRY_TAGS = [
  'House-to-House',
  'Public Witnessing',
  'Memorial Invitation',
  'Street Witnessing',
  'Business Territory',
  'Informal Witnessing',
  'Studying Enjoy life'
]

export const OUTCOMES = [
  'Not Home',
  'Busy',
  'Interested',
  'Not Interested',
  'Study Conducted',
  'Literature Placed',
  'Return Visit Made'
] 