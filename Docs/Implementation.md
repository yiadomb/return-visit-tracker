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
- [x] Install and configure TanStack Table for Vue.
- [x] Develop the main `Grid` view component.
- [x] Connect the `Grid` component to Dexie to display contacts in their respective "day-buckets".
- [x] Implement the `Add/Edit Contact` drawer/modal component with a form.
- [x] Enable tap-to-edit functionality on grid cells, opening the drawer with the correct contact data.
- [x] Implement the logic to create, update, and delete contacts in the Dexie database via the UI.
- [ ] Set up the Capacitor Local Notifications plugin.
- [ ] Create a simple `Agenda` view to list today's scheduled visits.
- [ ] Implement the logic to schedule daily local notifications for the user.

### Stage 3: Advanced Features
- [ ] Set up a new project on Supabase.
- [ ] Implement the Google OAuth flow to allow users to sign in and grant Google Drive permissions.
- [ ] Create a Supabase Edge Function to handle interactions with the Google Drive API securely.
- [ ] Implement the client-side logic for "Export to Google Sheets".
- [ ] Develop the automatic backup feature to sync Dexie data to a file in the user's Google Drive.
- [ ] Install `pdfmake` and implement the "Export to PDF" feature.
- [ ] Develop the context-sensitive drawers for `Contact` and `Hostel` cells.
- [ ] Implement the UI and logic for filtering contacts by tags.

### Stage 4: Polish & Optimization
- [ ] Implement the UI theming system (Light, Dark, and custom themes) using CSS variables.
- [ ] Conduct thorough responsive design testing and apply fixes for a polished mobile and tablet experience.
- [ ] Analyze grid performance and apply optimizations like virtualization.
- [ ] Review the entire application for performance bottlenecks and UX improvements.
- [ ] Final user-acceptance testing (UAT) and bug squashing. 