# UI/UX Design Documentation

This document specifies the core design system, user experience flows, and responsive standards for the Return-Visit Tracker.

---

## 1. Core Principles

- **Mobile-First:** Design and develop for the smallest screen first, then scale up.
- **Offline-First:** The UI must remain fully functional and responsive even without a network connection.
- **Clarity at a Glance:** The main grid should provide essential information without overwhelming the user. Details are available on demand.
- **Frictionless Input:** Data entry should be as fast and intuitive as possible.

---

## 2. Layout & Responsiveness

- **Phone (Portrait):**
    - A top bar will display filters for the "day-buckets" (e.g., Sat, Sun, No Fixed Days).
    - Selecting a bucket filters the grid to show only contacts within that bucket, creating a focused, single-column view.
- **Tablet & Desktop (Landscape):**
    - The full, multi-column grid is displayed, with each bucket as a separate column.
    - The layout should be scrollable both horizontally and vertically.

---

## 3. Component Design

- **Grid Cell:**
    - **Default State:** Shows only the contact's `Name` and `Hostel`.
    - **Interaction:** A single tap on a cell opens its corresponding drawer.
- **Contact Drawer:**
    - **Content:** Displays the contact's phone number, last outcome, notes, and tags.
    - **Actions:** Contains one-tap buttons for "Call" (`tel:` link) and "Message" (e.g., WhatsApp `https://wa.me/` link).
- **Location Drawer:**
    - **Content:** Provides a free-text area for detailed location information (floor, room, town, etc.).
- **Context-Aware Inputs:**
    - **Dates (`next_visit_at`):** Use a native HTML date picker for ease of use on mobile.
    - **Tags (`last_outcome`):** Use a dropdown or tag selector populated with the predefined list.

---

## 4. Theming & Style

- **Color System:** A theming system will be built using CSS custom properties (variables).
    - `--background-color`
    - `--text-color`
    - `--primary-color` (for accents, buttons, links)
    - `--cell-background-color`
    - `--header-background-color`
- **Themes:**
    - **Light:** Default theme with a light background and dark text.
    - **Dark:** Dark background with light text for reduced eye strain.
    - **Custom:** Allow for future color palettes to be added easily.
- **Typography:** Choose a clean, legible font (like Inter or system UI fonts) that works well at small sizes.

---

## 5. Accessibility (A11y)

- **Color Contrast:** Ensure text and UI elements meet WCAG AA contrast ratio standards.
- **Touch Targets:** All interactive elements (buttons, cells) must have a minimum touch target size of 44x44 CSS pixels.
- **Keyboard Navigation:** The application should be navigable and usable with a keyboard.
- **Screen Readers:** Use semantic HTML and ARIA attributes where necessary to support screen reader users. 