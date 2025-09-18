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

// Remote table names
const TABLE = 'contacts'
const OCC_TABLE = 'visit_occurrences'
const MR_TABLE = 'monthly_reports'
const RE_TABLE = 'report_entries'
const MG_TABLE = 'monthly_goals'
const AN_TABLE = 'agenda_notes'

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

  async getUserId() {
    try {
      const { data } = await supabase.auth.getUser()
      return data?.user?.id || null
    } catch {
      return null
    }
  },

  init() {
    if (!isSupabaseConfigured || this._isInitialized) return
    this._isInitialized = true

    // Subscribe to Postgres changes if Realtime is enabled
    try {
      // Scope realtime to the current user if available
      this.getUserId().then((uid) => {
        // Contacts channel
        this._channel = supabase
          .channel('rv_contacts_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: TABLE, filter: uid ? `user_id=eq.${uid}` : undefined },
            async () => {
              clearTimeout(this._debouncedPull)
              this._debouncedPull = setTimeout(() => {
                this.pullAll().catch(() => {})
              }, 300)
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: OCC_TABLE, filter: uid ? `user_id=eq.${uid}` : undefined },
            async () => {
              clearTimeout(this._debouncedPull)
              this._debouncedPull = setTimeout(() => {
                this.pullAll().catch(() => {})
              }, 300)
            }
          )
          .subscribe()

        // Additional domain tables in a separate channel
        this._moreChannel = supabase
          .channel('rv_more_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: MR_TABLE, filter: uid ? `user_id=eq.${uid}` : undefined }, () => {
            clearTimeout(this._debouncedPull)
            this._debouncedPull = setTimeout(() => { this.pullAll().catch(() => {}) }, 300)
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: RE_TABLE, filter: uid ? `user_id=eq.${uid}` : undefined }, () => {
            clearTimeout(this._debouncedPull)
            this._debouncedPull = setTimeout(() => { this.pullAll().catch(() => {}) }, 300)
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: MG_TABLE, filter: uid ? `user_id=eq.${uid}` : undefined }, () => {
            clearTimeout(this._debouncedPull)
            this._debouncedPull = setTimeout(() => { this.pullAll().catch(() => {}) }, 300)
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: AN_TABLE, filter: uid ? `user_id=eq.${uid}` : undefined }, () => {
            clearTimeout(this._debouncedPull)
            this._debouncedPull = setTimeout(() => { this.pullAll().catch(() => {}) }, 300)
          })
          .subscribe()
      })

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
    if (this._moreChannel) {
      try { supabase.removeChannel(this._moreChannel) } catch {}
      this._moreChannel = null
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
    const userId = await this.getUserId()
    if (!userId) return { pushed: 0 }
    const locals = await db.contacts.toArray()
    const occs = await db.visitOccurrences.toArray().catch(() => [])
    const mrs = await db.monthlyReports.toArray().catch(() => [])
    const entries = await db.reportEntries.toArray().catch(() => [])
    const goals = await db.monthlyGoals.toArray().catch(() => [])
    const notes = await db.agendaNotes.toArray().catch(() => [])
    if (locals.length === 0 && occs.length === 0 && mrs.length === 0 && entries.length === 0 && goals.length === 0 && notes.length === 0) return { pushed: 0 }

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

    const payload = withUuid.map((c) => ({ ...toRemote(c), user_id: userId }))
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
    // Push occurrences
    if (Array.isArray(occs) && occs.length > 0) {
      // Ensure occurrence.remote_uuid exists
      const withOccUuid = await Promise.all(
        occs.map(async (o) => {
          if (!o.remote_uuid) {
            const newUuid = generateUuid()
            const nowIso = new Date().toISOString()
            await db.visitOccurrences.update(o.id, { remote_uuid: newUuid, updated_at: nowIso })
            return { ...o, remote_uuid: newUuid, updated_at: nowIso }
          }
          return o
        })
      )
      const occPayload = withOccUuid.map((o) => ({
        remote_uuid: o.remote_uuid,
        contact_remote_uuid: o.contact_remote_uuid || null,
        scheduled_at: o.scheduled_at,
        reminders: o.reminders || ['-30'],
        status: o.status || 'planned',
        updated_at: o.updated_at || new Date().toISOString(),
        user_id: userId,
      }))
      const { data: occData, error: occErr } = await supabase.from(OCC_TABLE).upsert(occPayload, { onConflict: 'remote_uuid' }).select()
      if (occErr) throw occErr
      if (Array.isArray(occData)) {
        await Promise.all(
          occData.map((r) =>
            db.visitOccurrences.where('remote_uuid').equals(r.remote_uuid).modify({ updated_at: r.updated_at })
          )
        )
      }
    }

    // Push monthly reports
    if (Array.isArray(mrs) && mrs.length > 0) {
      const withUuid = await Promise.all(
        mrs.map(async (m) => {
          if (!m.remote_uuid) {
            const newUuid = generateUuid()
            const nowIso = new Date().toISOString()
            await db.monthlyReports.update(m.id, { remote_uuid: newUuid, updated_at: nowIso })
            return { ...m, remote_uuid: newUuid, updated_at: nowIso }
          }
          return m
        })
      )
      const payload = withUuid.map((m) => ({
        remote_uuid: m.remote_uuid,
        year: m.year,
        month: m.month,
        total_minutes: Math.max(m.total_minutes || 0, 0),
        studies_count: Math.max(m.studies_count || 0, 0),
        reported_minutes: m.reported_minutes ?? null,
        carryover_applied: !!m.carryover_applied,
        sent_at: m.sent_at || null,
        sent_channel: m.sent_channel || null,
        updated_at: m.updated_at || new Date().toISOString(),
        user_id: userId,
      }))
      const { data: mrData, error: mrErr } = await supabase.from(MR_TABLE).upsert(payload, { onConflict: 'remote_uuid' }).select()
      if (mrErr) throw mrErr
      if (Array.isArray(mrData)) {
        await Promise.all(
          mrData.map((r) => db.monthlyReports.where('remote_uuid').equals(r.remote_uuid).modify({ updated_at: r.updated_at }))
        )
      }
    }

    // Push report entries
    if (Array.isArray(entries) && entries.length > 0) {
      const withUuid = await Promise.all(
        entries.map(async (e) => {
          if (!e.remote_uuid) {
            const newUuid = generateUuid()
            const nowIso = new Date().toISOString()
            await db.reportEntries.update(e.id, { remote_uuid: newUuid, updated_at: nowIso })
            return { ...e, remote_uuid: newUuid, updated_at: nowIso }
          }
          return e
        })
      )
      const payload = withUuid.map((e) => ({
        remote_uuid: e.remote_uuid,
        year: e.year,
        month: e.month,
        entry_date: e.entry_date,
        minutes: Math.max(e.minutes || 0, 0),
        studies: Math.max(e.studies || 0, 0),
        is_carryover: !!e.is_carryover,
        comment: e.comment || null,
        updated_at: e.updated_at || new Date().toISOString(),
        user_id: userId,
      }))
      const { data: reData, error: reErr } = await supabase.from(RE_TABLE).upsert(payload, { onConflict: 'remote_uuid' }).select()
      if (reErr) throw reErr
      if (Array.isArray(reData)) {
        await Promise.all(
          reData.map((r) => db.reportEntries.where('remote_uuid').equals(r.remote_uuid).modify({ updated_at: r.updated_at }))
        )
      }
    }

    // Push monthly goals
    if (Array.isArray(goals) && goals.length > 0) {
      const withUuid = await Promise.all(
        goals.map(async (g) => {
          if (!g.remote_uuid) {
            const newUuid = generateUuid()
            const nowIso = new Date().toISOString()
            await db.monthlyGoals.update(g.id, { remote_uuid: newUuid, updated_at: nowIso })
            return { ...g, remote_uuid: newUuid, updated_at: nowIso }
          }
          return g
        })
      )
      const payload = withUuid.map((g) => ({
        remote_uuid: g.remote_uuid,
        year: g.year,
        month: g.month,
        minutes_goal: Math.max(g.minutes_goal || 0, 0),
        studies_goal: Math.max(g.studies_goal || 0, 0),
        updated_at: g.updated_at || new Date().toISOString(),
        user_id: userId,
      }))
      const { data: mgData, error: mgErr } = await supabase.from(MG_TABLE).upsert(payload, { onConflict: 'remote_uuid' }).select()
      if (mgErr) throw mgErr
      if (Array.isArray(mgData)) {
        await Promise.all(
          mgData.map((r) => db.monthlyGoals.where('remote_uuid').equals(r.remote_uuid).modify({ updated_at: r.updated_at }))
        )
      }
    }

    // Push agenda notes
    if (Array.isArray(notes) && notes.length > 0) {
      const withUuid = await Promise.all(
        notes.map(async (n) => {
          if (!n.remote_uuid) {
            const newUuid = generateUuid()
            const nowIso = new Date().toISOString()
            await db.agendaNotes.update(n.id, { remote_uuid: newUuid, updated_at: nowIso })
            return { ...n, remote_uuid: newUuid, updated_at: nowIso }
          }
          return n
        })
      )
      const payload = withUuid.map((n) => ({
        remote_uuid: n.remote_uuid,
        title: String(n.title || ''),
        html: String(n.html || ''),
        pinned: !!n.pinned,
        created_at: n.created_at || new Date().toISOString(),
        updated_at: n.updated_at || new Date().toISOString(),
        user_id: userId,
      }))
      const { data: anData, error: anErr } = await supabase.from(AN_TABLE).upsert(payload, { onConflict: 'remote_uuid' }).select()
      if (anErr) throw anErr
      if (Array.isArray(anData)) {
        await Promise.all(
          anData.map((r) => db.agendaNotes.where('remote_uuid').equals(r.remote_uuid).modify({ updated_at: r.updated_at }))
        )
      }
    }

    // Nudge other clients to pull
    try {
      if (this._notifyChannel) {
        await this._notifyChannel.send({ type: 'broadcast', event: 'contacts_changed', payload: { at: Date.now() } })
      }
    } catch {}
    return { pushed: (data?.length || 0) }
  },

  async pullAll() {
    if (!isSupabaseConfigured) return { pulled: 0 }
    const userId = await this.getUserId()
    if (!userId) return { pulled: 0 }
    const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId)
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
    // Pull occurrences
    try {
      const { data: occData, error: occErr } = await supabase.from(OCC_TABLE).select('*').eq('user_id', userId)
      if (occErr) throw occErr
      if (Array.isArray(occData)) {
        for (const remote of occData) {
          // Find local by remote_uuid
          const local = remote.remote_uuid && await db.visitOccurrences.where('remote_uuid').equals(remote.remote_uuid).first()
          if (!local) {
            // Map contact_remote_uuid to local contact_id if possible
            let contactId = null
            if (remote.contact_remote_uuid) {
              const localContact = await db.contacts.where('remote_uuid').equals(remote.contact_remote_uuid).first()
              contactId = localContact?.id || null
            }
            await db.visitOccurrences.add({
              remote_uuid: remote.remote_uuid,
              contact_id: contactId,
              contact_remote_uuid: remote.contact_remote_uuid || null,
              scheduled_at: remote.scheduled_at,
              reminders: remote.reminders || ['-30'],
              status: remote.status || 'planned',
              created_at: remote.created_at || new Date().toISOString(),
              updated_at: remote.updated_at || new Date().toISOString(),
            })
            pulled++
          } else if (isRemoteNewer(remote, local)) {
            let contactId = local.contact_id || null
            if (remote.contact_remote_uuid) {
              const localContact = await db.contacts.where('remote_uuid').equals(remote.contact_remote_uuid).first()
              contactId = localContact?.id || contactId
            }
            await db.visitOccurrences.update(local.id, {
              contact_id: contactId,
              contact_remote_uuid: remote.contact_remote_uuid || null,
              scheduled_at: remote.scheduled_at,
              reminders: remote.reminders || ['-30'],
              status: remote.status || 'planned',
              remote_uuid: remote.remote_uuid,
              updated_at: remote.updated_at,
            })
            pulled++
          }
        }
      }
    } catch (e) {
      console.warn('Pull occurrences failed', e)
    }

    // Pull monthly reports
    try {
      const { data: mrData, error: mrErr } = await supabase.from(MR_TABLE).select('*').eq('user_id', userId)
      if (mrErr) throw mrErr
      if (Array.isArray(mrData)) {
        for (const remote of mrData) {
          const local = remote.remote_uuid && await db.monthlyReports.where('remote_uuid').equals(remote.remote_uuid).first()
          if (!local) {
            await db.monthlyReports.add({
              ...remote,
              id: undefined,
            })
            pulled++
          } else if (isRemoteNewer(remote, local)) {
            await db.monthlyReports.update(local.id, {
              total_minutes: Math.max(remote.total_minutes || 0, 0),
              studies_count: Math.max(remote.studies_count || 0, 0),
              reported_minutes: remote.reported_minutes ?? null,
              carryover_applied: !!remote.carryover_applied,
              sent_at: remote.sent_at || null,
              sent_channel: remote.sent_channel || null,
              remote_uuid: remote.remote_uuid,
              updated_at: remote.updated_at,
            })
            pulled++
          }
        }
      }
    } catch (e) {
      console.warn('Pull monthly reports failed', e)
    }

    // Pull report entries
    try {
      const { data: reData, error: reErr } = await supabase.from(RE_TABLE).select('*').eq('user_id', userId)
      if (reErr) throw reErr
      if (Array.isArray(reData)) {
        for (const remote of reData) {
          const local = remote.remote_uuid && await db.reportEntries.where('remote_uuid').equals(remote.remote_uuid).first()
          if (!local) {
            await db.reportEntries.add({
              ...remote,
              id: undefined,
            })
            pulled++
          } else if (isRemoteNewer(remote, local)) {
            await db.reportEntries.update(local.id, {
              year: remote.year,
              month: remote.month,
              entry_date: remote.entry_date,
              minutes: Math.max(remote.minutes || 0, 0),
              studies: Math.max(remote.studies || 0, 0),
              is_carryover: !!remote.is_carryover,
              comment: remote.comment || '',
              remote_uuid: remote.remote_uuid,
              updated_at: remote.updated_at,
            })
            pulled++
          }
        }
      }
    } catch (e) {
      console.warn('Pull report entries failed', e)
    }

    // Pull monthly goals
    try {
      const { data: mgData, error: mgErr } = await supabase.from(MG_TABLE).select('*').eq('user_id', userId)
      if (mgErr) throw mgErr
      if (Array.isArray(mgData)) {
        for (const remote of mgData) {
          const local = remote.remote_uuid && await db.monthlyGoals.where('remote_uuid').equals(remote.remote_uuid).first()
          if (!local) {
            await db.monthlyGoals.add({
              ...remote,
              id: undefined,
            })
            pulled++
          } else if (isRemoteNewer(remote, local)) {
            await db.monthlyGoals.update(local.id, {
              year: remote.year,
              month: remote.month,
              minutes_goal: Math.max(remote.minutes_goal || 0, 0),
              studies_goal: Math.max(remote.studies_goal || 0, 0),
              remote_uuid: remote.remote_uuid,
              updated_at: remote.updated_at,
            })
            pulled++
          }
        }
      }
    } catch (e) {
      console.warn('Pull monthly goals failed', e)
    }

    // Pull agenda notes
    try {
      const { data: anData, error: anErr } = await supabase.from(AN_TABLE).select('*').eq('user_id', userId)
      if (anErr) throw anErr
      if (Array.isArray(anData)) {
        for (const remote of anData) {
          const local = remote.remote_uuid && await db.agendaNotes.where('remote_uuid').equals(remote.remote_uuid).first()
          if (!local) {
            await db.agendaNotes.add({
              ...remote,
              id: undefined,
            })
            pulled++
          } else if (isRemoteNewer(remote, local)) {
            await db.agendaNotes.update(local.id, {
              title: String(remote.title || ''),
              html: String(remote.html || ''),
              pinned: !!remote.pinned,
              remote_uuid: remote.remote_uuid,
              updated_at: remote.updated_at,
            })
            pulled++
          }
        }
      }
    } catch (e) {
      console.warn('Pull agenda notes failed', e)
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


