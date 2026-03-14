# Transactions (Hishab) Functional Specification

## Overview
The Transactions page (`transactions.html`) is a global ledger for the farmer. It shows all income and expenses across all lands and crops, allowing them to filter by month or add new general transactions.

## UI Components & Backend Requirements

### 1. Monthly Summary Cards
- **Data Displayed:** "এই মাসের আয়" (This Month's Income) and "এই মাসের ব্যয়" (This Month's Expense).
- **Backend Needed:** 
  - `GET /api/transactions/summary?month=current`
  - Returns the sum of income and sum of expenses for the current month across the entire user account.

### 2. Transaction List
- **Data Displayed:** Detailed list of individual transactions.
- **Backend Needed:**
  - `GET /api/transactions?page=1`
  - Returns a list from the `Transactions` table, sorted by date descending.
  - Each transaction object should include: `id`, `amount`, `type` (income/expense), `category` (e.g., Fertilizer, Sale), `date`, and `linked_land_name/crop_name` if applicable.

### 3. Add Transaction Modal
- **Form Inputs:** Type (Aay/Bae), Amount, Category, Date, Note.
- **Backend Needed:** 
  - `POST /api/transactions`
  - Validates and stores the transaction. If it's linked to a specific crop/land in the UI, that linkage (`crop_id`, `land_id`) must be saved to ensure accurate calculation on the `land_details.html` and `land_history.html` pages.

## Database Entities Used
- `Transactions` (id, user_id, land_id nullable, crop_id nullable, type, category, amount, date, notes).

## Future API Endpoints
- `GET /api/transactions/summary`
- `GET /api/transactions`
- `POST /api/transactions`
