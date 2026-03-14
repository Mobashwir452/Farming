# Admin UI Layout & Component Strategy

## Overview
This document outlines the UI plan for the AgriTech Admin Dashboard. The design must be 100% responsive (Desktop + Mobile) and maintain the premium, modern aesthetic of the public frontend. To keep the code clean and maintainable using Vanilla HTML/JS, core UI elements like the Sidebar and Header will be built as reusable Web Components (or injected via JS Fetch).

---

## 1. Reusable Components Strategy (Vanilla JS)

Instead of copying and pasting the Sidebar and Header into every HTML file (`users.html`, `helpdesk.html`), we will create a central `js/admin-components.js` file.

**Implementation Plan:**
1. Create `admin/components/sidebar.html` and `admin/components/header.html`.
2. In `admin-components.js`, write a script that fetches these HTML snippets and injects them into a predefined `<div id="admin-sidebar"></div>` and `<div id="admin-header"></div>` on every page.
3. This ensures that adding a new menu item only requires editing one file.

---

## 2. Layout Structure (Responsive Design)

### Desktop View (Width > 1024px)
*   **Sidebar:** Fixed on the left side (width: ~260px). Always visible.
*   **Header:** Fixed at the top, spanning the remaining width to the right of the sidebar.
*   **Main Content:** Occupies the remaining space below the header and right of the sidebar.

### Mobile/Tablet View (Width < 1024px)
*   **Sidebar:** Hidden by default. Acts as a "Drawer" (Off-canvas menu) that slides in from the left when a hamburger menu icon is clicked.
*   **Header:** Fixed at the top, spanning 100% width. Contains a hamburger icon on the left to toggle the sidebar.
*   **Main Content:** Occupies 100% width below the header.

---

## 3. Component Details

### A. Login Page (`index.html` or `login.html`)
*   **Layout:** Centered card on a clean, light-colored background (perhaps with a subtle, blurred agricultural background image or pattern).
*   **Components:**
    *   App Logo and "Admin Portal" heading.
    *   Email Input.
    *   Password/PIN Input.
    *   "Login" button.
    *   Error message placeholder (for invalid credentials).
*   **Behavior:** No sidebar or header is shown on this page.

### B. Header Component (`components/header.html`)
*   **Left Side (Mobile only):** Hamburger menu icon (☰) to toggle the sidebar.
*   **Left Side (Desktop):** Page Title (e.g., "Dashboard", "User Management") dynamically updated via JS based on the current page.
*   **Right Side:**
    *   **Search Bar (Optional):** Global search for users or lands.
    *   **Notification Bell:** Alerts for new helpdesk tickets or system warnings.
    *   **Admin Profile Badge:** Shows admin name/role. Clicking opens a dropdown with:
        *   Settings
        *   Logout

### C. Sidebar Component (`components/sidebar.html`)
*   **Top:** App Logo and "AgriTech Admin" text.
*   **Menu Items (Links):**
    *   📊 **Dashboard** (`dashboard.html`)
    *   👥 **Users & Farmers** (`users.html`)
    *   🧠 **AI Prompt Engine** (`ai_settings.html`)
    *   📑 **AI Audit Logs** (`ai_logs.html`)
    *   💬 **Expert Helpdesk** (`helpdesk.html`)
    *   📢 **Community Mod** (`community_mod.html`)
    *   🔔 **Broadcast & Limits** (`broadcast.html`)
*   **Active State:** The current page's menu item should be highlighted.
*   **Bottom:** Perhaps a persistent "Logout" button or system version number.

### D. Dashboard Page (`dashboard.html`)
*   **Layout:** A grid-based layout using CSS Grid or Flexbox.
*   **Grid Structure:**
    *   **Top Row (Cards):** 4 Summary Cards (Total Users, Daily Active, AI Hits, Pending Tickets).
    *   **Middle Row (Charts):** 2 large panels side-by-side (Desktop) or stacked (Mobile).
        *   Left: User Growth Chart.
        *   Right: AI Usage or Crop Distribution Chart.
    *   **Bottom Row (Tables/Lists):** Recent alerts, latest flagged community posts, or quick action buttons.

## 4. CSS Strategy (`css/admin-global.css`)
*   Use CSS Variables (`:root`) for consistent theming matching the public app (Primary greens, Neutral grays).
*   Use standard CSS classes for rapid UI building (e.g., `.card`, `.btn-primary`, `.table-responsive`).
*   Ensure every table is wrapped in a horizontally scrollable container so it doesn't break the layout on mobile phones.
