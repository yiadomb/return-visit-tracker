import { supabase, isSupabaseConfigured } from './supabaseClient'
import { db } from './db'

// Generate UUID (use browser crypto when available)
const generateUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Simple v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Remote table name
const TABLE = 'contacts'

// Map local contact to remote row
const toRemote = (c) => ({
  remote_uuid: c.remote_uuid ?? undefined,
  name: c.name || '',
  phone: c.phone || '',
  bucket: c.bucket || 'Saturday',
  next_visit_at: c.next_visit_at || null,
  hostel_name: c.hostel_name || '',
  location_detail: c.location_detail || '',
  last_outcome: c.last_outcome || '',
  notes: c.notes || '',
  tags: c.tags || '',
  display_order: c.display_order ?? 0,
  updated_at: c.updated_at || new Date().toISOString(),
})

// Merge strategy: last write wins by updated_at
const isRemoteNewer = (remote, local) => {
  const r = new Date(remote.updated_at || 0).getTime()
  const l = new Date(local.updated_at || 0).getTime()
  return r > l
}

export const syncService = {
  _channel: null,
  _notifyChannel: null,
  _pollTimer: null,
  _isInitialized: false,
  _debouncedPull: null,

  isReady() {
    return isSupabaseConfigured
  },

  init() {
    if (!isSupabaseConfigured || this._isInitialized) return
    this._isInitialized = true

    // Subscribe to Postgres changes if Realtime is enabled
    try {
      this._channel = supabase
        .channel('contacts_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: TABLE },
          async () => {
            clearTimeout(this._debouncedPull)
            this._debouncedPull = setTimeout(() => {
              this.pullAll().catch(() => {})
            }, 300)
          }
        )
        .subscribe()

      // Broadcast channel as a secondary nudge (does not need DB realtime config)
      this._notifyChannel = supabase
        .channel('rv_broadcast', { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'contacts_changed' }, () => {
          clearTimeout(this._debouncedPull)
          this._debouncedPull = setTimeout(() => {
            this.pullAll().catch(() => {})
          }, 200)
        })
        .subscribe()
    } catch (e) {
      console.warn('Realtime subscribe failed; falling back to polling', e)
    }

    // Fallback polling every 8s (lightweight) in case realtime is unavailable
    this.startPolling(8000)
  },

  startPolling(intervalMs = 8000) {
    if (this._pollTimer) clearInterval(this._pollTimer)
    if (!isSupabaseConfigured) return
    this._pollTimer = setInterval(() => {
      // Only pull if the tab is visible to avoid unnecessary work
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.pullAll().catch(() => {})
      }
    }, intervalMs)
  },

  stop() {
    if (this._channel) {
      try { supabase.removeChannel(this._channel) } catch {}
      this._channel = null
    }
    if (this._notifyChannel) {
      try { supabase.removeChannel(this._notifyChannel) } catch {}
      this._notifyChannel = null
    }
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
    this._isInitialized = false
  },

  async pushAll() {
    if (!isSupabaseConfigured) return { pushed: 0 }
    // Collapse local duplicates before pushing
    await this._dedupeLocals()
    const locals = await db.contacts.toArray()
    if (locals.length === 0) return { pushed: 0 }

    // Ensure each local has a remote UUID so upsert is deterministic
    const withUuid = await Promise.all(
      locals.map(async (c) => {
        if (!c.remote_uuid) {
          const newUuid = generateUuid()
          const nowIso = new Date().toISOString()
          await db.contacts.update(c.id, { remote_uuid: newUuid, updated_at: nowIso })
          return { ...c, remote_uuid: newUuid, updated_at: nowIso }
        }
        return c
      })
    )

    const payload = withUuid.map(toRemote)
    const { data, error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'remote_uuid' }).select()
    if (error) throw error

    // Sync authoritative updated_at from server
    if (Array.isArray(data)) {
      await Promise.all(
        data.map((r) =>
          db.contacts.where('remote_uuid').equals(r.remote_uuid).modify({ updated_at: r.updated_at })
        )
      )
    }
    // Nudge other clients to pull
    try {
      if (this._notifyChannel) {
        await this._notifyChannel.send({ type: 'broadcast', event: 'contacts_changed', payload: { at: Date.now() } })
      }
    } catch {}
    return { pushed: data?.length || 0 }
  },

  async pullAll() {
    if (!isSupabaseConfigured) return { pulled: 0 }
    const { data, error } = await supabase.from(TABLE).select('*')
    if (error) throw error
    if (!data) return { pulled: 0 }

    let pulled = 0
    for (const remote of data) {
      // Find local by remote_uuid if present, else by name as weak fallback
      let local = null
      if (remote.remote_uuid) {
        local = await db.contacts.where('remote_uuid').equals(remote.remote_uuid).first()
      }
      if (!local) {
        local = await db.contacts.where('name').equals(remote.name || '').first()
      }

      if (!local) {
        await db.contacts.add({
          ...remote,
          id: undefined,
        })
        pulled++
      } else if (isRemoteNewer(remote, local)) {
        await db.contacts.update(local.id, {
          name: remote.name,
          phone: remote.phone,
          bucket: remote.bucket,
          next_visit_at: remote.next_visit_at,
          hostel_name: remote.hostel_name,
          location_detail: remote.location_detail,
          last_outcome: remote.last_outcome,
          notes: remote.notes,
          tags: remote.tags,
          display_order: remote.display_order,
          remote_uuid: remote.remote_uuid,
          updated_at: remote.updated_at,
        })
        pulled++
      }
    }
    // After pulling, run a local de-duplication pass
    await this._dedupeLocals()
    return { pulled }
  },

  async syncAll() {
    if (!isSupabaseConfigured) return { pushed: 0, pulled: 0 }
    const pushed = await this.pushAll().catch(e => { console.warn('Push failed', e); return { pushed: 0 } })
    const pulled = await this.pullAll().catch(e => { console.warn('Pull failed', e); return { pulled: 0 } })
    return { ...pushed, ...pulled }
  }
}

// Internal helpers
syncService._dedupeLocals = async function _dedupeLocals() {
  try {
    const locals = await db.contacts.toArray()
    if (!locals || locals.length === 0) return

    const toDeleteIds = new Set()
    const byUuid = new Map()

    // Group by remote_uuid
    for (const c of locals) {
      if (c.remote_uuid) {
        const list = byUuid.get(c.remote_uuid) || []
        list.push(c)
        byUuid.set(c.remote_uuid, list)
      }
    }

    // If same remote_uuid appears multiple times locally, keep the newest
    for (const [, list] of byUuid) {
      if (list.length <= 1) continue
      list.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
      const keeper = list[0]
      for (let i = 1; i < list.length; i++) {
        toDeleteIds.add(list[i].id)
      }
    }

    // If a record has no remote_uuid but matches by name (case-insensitive) to a record that has remote_uuid,
    // merge into the uuid-bearing record and delete the no-uuid duplicate
    const nameToWithUuid = new Map()
    for (const c of locals) {
      if (c.remote_uuid) {
        const key = (c.name || '').trim().toLowerCase()
        if (key) nameToWithUuid.set(key, c)
      }
    }
    for (const c of locals) {
      if (!c.remote_uuid) {
        const key = (c.name || '').trim().toLowerCase()
        const match = key && nameToWithUuid.get(key)
        if (match && match.id !== c.id) {
          // Choose winner by newer updated_at
          const cNewer = new Date(c.updated_at || 0) > new Date(match.updated_at || 0)
          if (cNewer) {
            // Merge newer fields into the uuid record
            await db.contacts.update(match.id, {
              phone: c.phone ?? match.phone,
              bucket: c.bucket ?? match.bucket,
              next_visit_at: c.next_visit_at ?? match.next_visit_at,
              hostel_name: c.hostel_name ?? match.hostel_name,
              location_detail: c.location_detail ?? match.location_detail,
              last_outcome: c.last_outcome ?? match.last_outcome,
              notes: c.notes ?? match.notes,
              tags: c.tags ?? match.tags,
              display_order: c.display_order ?? match.display_order,
              updated_at: c.updated_at || match.updated_at,
            })
          }
          toDeleteIds.add(c.id)
        }
      }
    }

    if (toDeleteIds.size > 0) {
      await Promise.all([...toDeleteIds].map((id) => db.contacts.delete(id)))
    }
  } catch (e) {
    console.warn('Dedup pass failed', e)
  }
}


