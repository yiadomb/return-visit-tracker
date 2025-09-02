# Archive Functionality Test Checklist

## Test Archive Feature on All Devices

### 1. Mobile (Phone) Test
- [ ] Long press on a contact
- [ ] Action sheet appears with 3 options (Move, Archive, Delete)
- [ ] Tap "Archive" 
- [ ] Contact disappears from the list
- [ ] Contact count in bucket header decreases

### 2. Tablet Test  
- [ ] Double-click to open a contact
- [ ] Scroll down to "Quick Actions" section
- [ ] See 3-4 buttons (Call/WhatsApp if phone exists, Archive, Delete)
- [ ] Click "Archive" button
- [ ] Drawer closes and contact disappears from list

### 3. Desktop Test
- [ ] Double-click to open a contact
- [ ] Scroll down to "Quick Actions" section  
- [ ] See 3-4 buttons (Call/WhatsApp if phone exists, Archive, Delete)
- [ ] Click "Archive" button
- [ ] Drawer closes and contact disappears from list

### 4. View Archived Contacts (All Devices)
- [ ] Open Menu (hamburger icon)
- [ ] Look for "Archived Contacts" section
- [ ] See count of archived contacts (should match number archived)
- [ ] Click "View" button
- [ ] Modal opens showing archived contacts
- [ ] Each contact shows name, hostel, and bucket
- [ ] "Restore" button is visible for each

### 5. Restore Archived Contact
- [ ] Click "Restore" on any archived contact
- [ ] Contact disappears from archived list
- [ ] Close modal
- [ ] Archived count decreases
- [ ] Go back to Contacts view
- [ ] Restored contact appears in its original bucket

## Expected Behavior Summary

1. **Archive removes contact from view** - Contact should disappear immediately after archiving
2. **Archive preserves data** - Contact retains all information (name, hostel, bucket, etc.)
3. **Archive count updates** - Settings menu shows accurate count
4. **Restore works** - Contact returns to original bucket with all data intact
5. **Sync compatibility** - If using Supabase, archived field syncs properly

## Database Verification

To verify in browser console:
```javascript
// Check archived contacts in IndexedDB
const db = await Dexie.open('ReturnVisitTracker');
const archived = await db.table('contacts').where('archived').equals(true).toArray();
console.log('Archived contacts:', archived);
```

## Supabase Setup Required

If using cloud sync, run this SQL in Supabase:
```sql
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS contacts_archived_idx ON public.contacts(archived);
```
