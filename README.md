# 🏢 Flat Management System

A full-stack Flat Expense, Rent Dividing, Weekly Food & Member Ledger system with **Super Admin & Sub-Admin Roles**, **Member Self-Service Portal**, **Payment Approvals Workflow**, **WhatsApp Sharing**, **PDF Invoicing**, and **Historical Excel Import**.

---

## 🚀 Quick Start

### Option 1: Double-Click
Double-click `run.bat` in the root folder. It starts the server and opens `http://localhost:3000` in your default browser.

### Option 2: Command Line
```bash
npm start
```
Then visit [http://localhost:3000](http://localhost:3000).

---

## 🔑 Login Credentials

### 1. Super Admin
- **Username:** `superadmin`
- **Password:** `admin123`
*(Full control over sub-admins, rooms, members, bills, payments, approvals, settings, and Excel import)*

### 2. Sample Sub-Admin
- **Username:** `manager`
- **Password:** `pass123`
*(Limited permissions: manages members, bills, food, payments; no payment approval rights)*

### 3. Sample Member Portal Login
- **Member ID:** `MEM-001`
- **Password:** `flat123` (Murad)
- **Member ID:** `MEM-002`
- **Password:** `flat123` (Shah G)
- **Member ID:** `MEM-007`
- **Password:** `flat123` (Arman)
*(Members view their personal running balance, monthly breakdown, food share, and submit payment claims for admin approval)*

---

## 🛠️ Features Overview

1. **Rooms Management (Future-Locked)**:
   - Add Room 1, 2, 3, 4, etc. with fixed rent.
   - Assign occupants to rooms. Fixed rent is split equally among room occupants.
   - Rent or occupant changes only affect future months (past bills are preserved).

2. **Members (Inside vs Outside)**:
   - Inside members belong to a room and pay room rent.
   - Outside members belong to no room and pay Rs. 0 rent (they only split utilities or food).
   - Auto-generates unique IDs (`MEM-001`) and passwords.
   - Mid-month join/leave proration (By exact days or full month).
   - Former members archive preserves full historical ledger.

3. **Monthly Bills & Matrix Split Engine**:
   - 1-click **Auto-fill Rent** from active rooms.
   - Custom utility bills: WiFi, Cook Salary, Electricity, Washing Machine, Maintenance, etc.
   - Four flexible split modes:
     - `Everyone` (all active members)
     - `Inside only` (members residing in flat)
     - `By room` (specific room occupants)
     - `Pick people` (custom checkboxes)
   - Real-time matrix table with members as rows and bills as columns.

4. **Weekly Food Tracker**:
   - Record groceries, vegetables, meat by date and amount.
   - Multi-member selection with equal division.
   - Adds directly to member running balances.

5. **Payments & Approval Workflow**:
   - Admin can directly record verified cash/online payments.
   - **Member Self-Submission**: Member logs into their portal, enters payment details (Amount, Method: Cash/Bank/JazzCash/Easypaisa, Date, Bank, Ref/Slip), and submits.
   - **Admin Approval Queue**: Admins view pending claims with 1-click **Approve** (with optional comment) or **Reject** (with required explanation).
   - Running ledger balance updates in real-time.

6. **PDF Invoicing & WhatsApp Sharing**:
   - Itemized PDF invoices for individual members or consolidated flat reports.
   - Includes configurable Flat Bank Account, IBAN, JazzCash, and Easypaisa details.
   - 1-click **WhatsApp button** opens chat with pre-filled invoice message.

7. **Multi-Admin with Granular Permissions**:
   - One Super Admin manages other sub-admins.
   - Permission toggles: `can_manage_members`, `can_manage_rooms`, `can_manage_bills`, `can_manage_food`, `can_manage_payments`, `can_approve_payments`.

8. **Audit Trail & Excel Importer**:
   - Immutable audit log of every change with timestamps and usernames.
   - 1-click import from your desktop file `Expenses F-133-26 update.xlsx` (Feb to Sept historical sheets).
   - Upload any new `.xlsx` file anytime through the Settings page.
