# Transactions & Ledger (Hishab) Module Plan

This document outlines the UI/UX and functional plan for the financial tracking module of the AgriTech app. It covers the existing `transactions.html` page and the new detailed ledger page (`hishab.html`).

## UX & Design Consistency Goals
- **Theme:** Must strictly adhere to the established AgriTech design system (White backgrounds, Primary Green #10B981, soft shadows, rounded corners, `Inter`/`Hind Siliguri` fonts).
- **Navigation:** Must feature the sticky `app-bottom-nav` on the main transactions page and the standard `app-dash-header` (or `inner-header` with back button depending on hierarchy).
- **Clarity:** Financial data must be easily scannable. Green for Income (+), Red for Expenses (-).
- **Filtering:** Users must be able to filter by Land/Crop or by Date (Month/Year).

---

## 1. Main Transactions Page (`transactions.html`)

**Role:** The primary hub for viewing recent financial activity. Accessible directly from the bottom navigation.

### Structural Updates
- **Top Header:** Use a standard `inner-header` but ensure it includes a "Filter" icon on the right side.
- **Ledger Link Card:** The existing card linking to `hishab.html` is good UX. It serves as an entry point to the detailed, tabular ledger.
- **Quick Filters:** The existing "All", "Income", "Expense" pill tabs (`.transaction-tabs`) should be horizontally scrollable.
- **Transaction List (`.transactions-container`):**
  - **Cards:** Clean white cards with `border-bottom`, except for the last item.
  - **Icons:** Use descriptive icons (e.g., a Fertilizer Sack icon instead of a generic arrow, if possible, or keep the clean arrows but ensure colors are distinct).
  - **Data points:** Title (e.g., "ইউরিয়া সার ক্রয়"), Date & Time, and Amount (styled + / -).

### Functional Additions Needed
- **FAB (Floating Action Button):** The `+` button must trigger a bottom sheet modal to add a quick transaction.
- **Modal Fields:**
  - Type (Income/Expense toggle switch).
  - Amount (Numeric input).
  - Category Dropdown (Seed, Fertilizer, Pesticide, Labor, Sales, Subsidy, Other).
  - Details/Note (Text input).
  - Date (Default today, clickable to change).
  - Linked Crop (Optional dropdown to link this expense directly to an active crop).

---

## 2. Detailed Ledger / Report Page (`hishab.html` - NEW)

**Role:** A deeper analytical view of finances, replacing the need for physical accounting books.

### UI Structure
- **Header:** `inner-header` with Back button and Title "বিস্তারিত হিসাব খাতা" (Detailed Ledger).
- **Summary Cards (Top):**
  - Total Income (মোট আয়) - Green text.
  - Total Expense (মোট ব্যয়) - Red text.
  - Net Balance (বর্তমান ব্যালেন্স) - Large text, color depends on positive/negative.
- **Filter Row:**
  - Month/Year picker (e.g., "মার্চ ২০২৬").
  - Farm/Crop filter (e.g., "সকল জমি" or specific crop).
- **Ledger Table / List:**
  - A more structured list, perhaps grouped by date (e.g., Header: "২০ মার্চ", followed by items for that day).
  - Include a "Download PDF" or "Export" button for power users or NGO reporting.

---

## 3. Backend Data Models Needed

To support this UI, the backend requires a robust `Transactions` table and relationship mapping.

**Table: `Transactions`**
- `id` (Primary Key)
- `user_id` (Foreign Key -> Users)
- `land_id` (Foreign Key -> Lands, *nullable*)
- `crop_id` (Foreign Key -> Crops, *nullable*)
- `type` (Enum: 'income', 'expense')
- `category` (String: 'fertilizer', 'seed', 'labor', 'sales', etc.)
- `amount` (Decimal)
- `description` (String)
- `transaction_date` (DateTime)

**Required APIs:**
- `GET /api/transactions` (With query params for month, type, crop_id)
- `POST /api/transactions` (To add new entries via the FAB modal)
- `GET /api/transactions/summary` (Returns totals for Income, Expense, Net for the top cards on `hishab.html`).

---

## Verification Plan
1. **Visual Check:** Navigate to `transactions.html` via the bottom nav. Ensure the header, tabs, and list follow the design system.
2. **Interaction Check:** Click the FAB. Ensure the modal opens cleanly and contains the new Categorization and Crop Linking fields.
3. **Navigation Check:** Click the top banner to navigate to `hishab.html`.
4. **Implementation Check:** Build `hishab.html` focusing on the Summary Cards and Grouped list view. Ensure responsiveness on mobile views (390px width).
