# Return-Visit Tracker: Implementation Plan

This document outlines the features, technology stack, and staged implementation plan for the Return-Visit & Bible-Study Tracker PWA, based on the provided PRD.

---

## 1. Feature Analysis

Features extracted from the PRD are categorized by priority.

### Must-Have (MVP)
- **Spreadsheet-like Grid View:** A virtualized, scrollable grid showing all contacts organized by day-buckets.
- **Tap-to-Edit Cells:** Context-aware inputs for quick in-place editing (e.g., date-picker for dates).
- **Add/Edit Contact Drawer:** A form to add new contacts or modify existing ones.
- **Offline-First Data Storage:** All data is stored locally in IndexedDB via Dexie.js, making the app fully functional without an internet connection.
- **Local Notifications:** Daily reminders for scheduled visits, handled by the Capacitor Local Notifications plugin.
- **Responsive UI:** A fluid user interface that works seamlessly from small phone screens to large tablets.
- **PWA Functionality:** The application will be installable on user devices (Android/iOS) via Capacitor.

### Should-Have (Post-MVP)
- **Automatic Cloud Backup:** Silent, automatic background sync to the user's personal Google Drive.
- **Export to PDF:** Generate a PDF of the current view or a selected timeframe, purely on the client-side.
- **Export to Google Sheets:** A manual option to back up the entire database to a Google Sheet.
- **Context-Sensitive Drawers:** Tapping a contact cell reveals contact details and actions, while tapping a hostel cell shows location details.
- **Tag Filter & Sort:** The ability to filter and view contacts based on predefined ministry-context tags.

### Nice-to-Have (Polish & Enhancements)
- **UI Themes:** User-selectable themes including Light, Dark, and custom color palettes.
- **Advanced Performance Optimization:** Fine-tuning to meet the sub-100ms perceived latency target.

---

## 2. Recommended Technology Stack

The tech stack is adopted from the PRD, which is well-suited for this project's requirements.

| Layer | Technology | Official Documentation |
|---|---|---|
| **Front‑end** | Vue 3 + Vite + Capacitor | [Vue 3](https://vuejs.org/), [Vite](https://vitejs.dev/), [Capacitor](https://capacitorjs.com/) |
| **Grid UI** | TanStack Table (Vue) | [TanStack Table v8 for Vue](https://tanstack.com/table/v8/docs/adapters/vue-table) |
| **Local DB** | Dexie.js | [Dexie.js](https://dexie.org/) |
| **Cloud Sync** | Supabase + Google Drive API | [Supabase](https://supabase.com/), [Google Drive API](https://developers.google.com/drive/api) |
| **Notifications** | Capacitor Local Notifications | [Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications) |
| **PDF Export** | pdfmake | [pdfmake](http://pdfmake.org/) |

---

## 3. Implementation Stages

The project will be built in logical stages, ensuring a solid foundation and iterative delivery of features.

### Stage 1: Foundation & Setup
- [x] Initialize a new Vue 3 project using Vite and the pnpm package manager.
- [x] Set up the project structure, including the `/src`, `/components`, `/views`, and other necessary directories.
- [x] Install and configure Dexie.js.
- [x] Define the Dexie database schema for `Contact` and `BackupMeta` tables as per the PRD.
- [x] Create a `db.js` service with basic CRUD functions (Create, Read, Update, Delete) for the `Contact` entity.
- [x] Test CRUD operations via the browser's developer console to ensure the database layer is working correctly.
- [x] Integrate Capacitor into the project to establish the PWA shell.

### Stage 2: Core Features (MVP)
- [x] Install and configure TanStack Table for Vue. (Note: custom grid used; TanStack reserved for future)
- [x] Develop the main `Grid` view component.
- [x] Connect the `Grid` component to Dexie to display contacts in their respective "day-buckets".
- [x] Implement the `Add/Edit Contact` drawer/modal component with a form.
- [x] Enable tap-to-edit functionality on grid cells, opening the drawer with the correct contact data.
- [x] Implement inline cell editing for name, hostel, date and notes (drawer still available for full edit).
- [x] Implement the logic to create, update, and delete contacts in the Dexie database via the UI.
- [x] Set up the Capacitor Local Notifications plugin (with web fallback) and scheduling.
- [x] Create a simple `Agenda` view to list today's scheduled visits.
- [x] Implement the logic to schedule daily local notifications and visit reminders.

### Stage 3: Advanced Features
- [ ] Set up a new project on Supabase.
- [ ] Implement the Google OAuth flow to allow users to sign in and grant Google Drive permissions.
- [ ] Create a Supabase Edge Function to handle interactions with the Google Drive API securely.
- [ ] Implement the client-side logic for "Export to Google Sheets".
- [ ] Develop the automatic backup feature to sync Dexie data to a file in the user's Google Drive.
- [ ] Install `pdfmake` and implement the "Export to PDF" feature.
- [ ] Develop the context-sensitive drawers for `Contact` and `Hostel` cells.
- [ ] Implement the UI and logic for filtering contacts by tags.
  
  Status: Tag filter implemented; sorting to be added later.

### Stage 4: Polish & Optimization
- [ ] Implement the UI theming system (Light, Dark, and custom themes) using CSS variables.
- [ ] Conduct thorough responsive design testing and apply fixes for a polished mobile and tablet experience.
- [ ] Analyze grid performance and apply optimizations like virtualization.  
  Note: Virtualization is planned to keep large buckets smooth; not required for current data sizes.
- [ ] Review the entire application for performance bottlenecks and UX improvements.
- [ ] Final user-acceptance testing (UAT) and bug squashing. 

---

## Current MVP Status (Completed in v1)

- Offline-first PWA with improved service worker (navigation fallback and asset caching)
- Main contact grid with drag & drop across day buckets and natural reordering within buckets
- Inline editing for core fields (name, hostel, date, notes) + drawer for full edit
- Tag filter + CSV export from the grid toolbar
- Agenda view with today’s visits, quick call/WhatsApp actions
- Local notifications service (daily reminder + upcoming visit reminders) with native (Capacitor) and web fallback
- Android builds: debug APK and signed release APK produced; AAB planned if store publishing is needed

## Upcoming (Post‑MVP)

- Virtualized lists for very large buckets (planned)
- Sorting and multi-tag filtering options
- PDF export and optional Google Sheets/Drive backup (requires auth setup)
- Theme switcher and an accessibility pass