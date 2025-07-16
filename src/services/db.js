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
    
    // Define the Contact table
    this.contacts = this.table('contacts')
    this.backupMeta = this.table('backupMeta')
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
        hostel_name: contact.hostel_name || '',
        location_detail: contact.location_detail || '',
        last_outcome: contact.last_outcome || '',
        notes: contact.notes || '',
        tags: contact.tags || '',
        reminders: contact.reminders || ['-30'],
        display_order: nextDisplayOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
  'Others',
  'NotAtHomes'
]

export const MINISTRY_TAGS = [
  'House-to-House',
  'Public Witnessing',
  'Memorial Invitation',
  'Street Witnessing',
  'Business Territory',
  'Informal Witnessing',
  'LFFI Study'
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