# Exhaustive Technical & Functional Specification: SRCC Placement Cell Digital Reimbursement System

## 1. Context and Organizational Structure
This document serves as the absolute "Source of Truth" for the digital transformation of the SRCC Placement Cell's Finance and Strategy (F&S) department.

### 1.1. Personnel and Hierarchy
* **Junior Coordinators (JCs):** Approximately 50 members. These are the primary spenders on the ground during company processes.
* **Senior Coordinators (SCs):** 15 members. Each SC is a coordinator for a specific visiting company and heads a team of multiple JCs.
* **F&S Department:**
    * Consists of 7 JCs who act as Points of Contact (POCs) for the SCs.
    * **The POC Mapping:** Every SC is assigned a specific F&S JC. (Example: Kamal is the POC for SCs Shouraya and Vedank. Shouraya and Vedank hand their bills specifically to Kamal).
    * F&S JCs collate, serialize, and log all bills chronologically for the Admin Office.

---

## 2. The Legacy Workflow (Current Manual State)
* **The Process:** A company visits for a Pre-Placement Talk (PPT). The SC heads the process with JCs under them.
* **The Expense:** If a company needs an item (e.g., a burger), a JC goes to the shop and buys it.
* **The Bill Chain:** * The JC incurs the bill.
    * At the end of the process, the JC gives the bill to the SC.
    * **The SC Reimburses the JC immediately.**
    * The SC "slowly slowly" accumulates these physical bills as they head multiple processes throughout the month.
* **The Monthly Handover:** At the end of the month, the SC hands over all accumulated bills to their designated F&S POC.
* **F&S Processing:** The 7 F&S JCs come together, collate all bills, serialize them in chronological order, and give them to the Admin Office.
* **The Final Payout:** The Admin Office gives money to F&S, and F&S then reimburses the SCs.
* **Data Logging:** F&S currently maintains a "Reimbursement Sheet" logging: Date, Category (Stationery/Printing/Food/etc.), Company Name, and other details.

---

## 3. The New Workflow (The App-Based Solution)
The goal is to move to a Web App to automate database creation and provide easy access to information.

### 3.1. General App Functionality
* **Login System:** Users (JC, SC, F&S) log in using Name, Roll No., and Password. Google Sign-in (using personal Gmail) is the preferred authentication method to avoid password management issues.
* **Web App Platform:** Accessible via browsers on phone/laptop.
* **Database Backend:** SQL (PostgreSQL/MySQL) to manage relational data and allow for complex queries.

### 3.2. Detailed Submission Form (The JC/SC Entry Point)
Every bill submission requires the following exhaustive data points:
1.  **Date of Bill:** (Calendar Date Picker).
2.  **Vendor:** (Dropdown menu managed by F&S).
3.  **Unique Bill Number:** (Manual entry of the invoice/receipt number found on the bill).
4.  **Company Name:** (Dropdown menu of visiting companies).
5.  **Category:** (Dropdown menu: Stationery, Printing, Food, etc.).
6.  **Process Type:** (Dropdown menu: PPT, Interview, Test, etc.).
7.  **Amount:** (Numeric value).
8.  **Associated SC:** (Dropdown menu to select which SC is heading the process).
9.  **File Upload:** Photo of the bill or a PDF (for digital invoices).
10. **Online Bill Toggle:** A checkbox to indicate if it's a digital invoice (e.g., Swiggy/Zomato). If ticked, the system knows no physical bill exists.

**Automation on Upload:**
* The app auto-detects the JC/SC who is logged in.
* **Standardized Naming:** Files are automatically renamed before storage:  
    `SC Name_DDMMYYYY_Company_Vendor_Unique No.`

---

## 4. Role-Specific Dashboards and Permissions

### 4.1. Junior Coordinator (JC) View
* **Submission History:** View all bills they have submitted.
* **Status Tracking:** Track whether the physical bill has been handed to F&S and if they have been reimbursed by the SC.

### 4.2. Senior Coordinator (SC) View
* **Process Overview:** View all bills associated with their name across various processes and JCs.
* **Filters:** Ability to see info by Company, Vendor, or JC.
* **Review Dashboard:** A place to review JC-submitted bills before reimbursing.
* **Payment & Tracking:** * **UPI Connection:** A "Pay" button that triggers a UPI app deep-link (pre-filling JC's UPI ID and Amount).
    * **"I Have Paid" Checkbox:** SC ticks this once they've reimbursed the JC. This reflects on the JC's dashboard.

### 4.3. F&S Admin View (Master Control)
* **Master Database Access:** Ability to view, edit, or delete any entry to handle mistakes or reversals.
* **POC Mapping:** A tool to assign specific SCs to specific F&S JCs.
* **Dynamic UI Notification:** When a JC submits a bill for an SC, the app displays: *"Kindly give the physical bill to [POC Name]."*
* **Dropdown Maintenance:** Only F&S can add/edit/delete options in the Vendor, Company, and Category dropdowns.
* **Reimbursement Cycles:** * F&S sets the "Active Cycle" (e.g., "March 2026").
    * Once Admin reimburses F&S, F&S "Closes" the cycle.
    * Only current cycle bills are shown by default; historical data is archived but accessible.

---

## 5. Technical Architecture and Integrity Logic

### 5.1. File Management & Storage
* **Storage:** Google Drive API (utilizing a Service Account).
* **Organization:** Files organized by automated naming conventions in Drive folders.
* **Optimization:** Automatic image compression to prevent database/storage bloat.

### 5.2. Data Integrity Features
* **Duplicate Detector:** The app will block submissions if the same "Unique Bill Number" and "Vendor" combination already exists in the database.
* **Standardization:** Mandatory dropdowns ensure data is uniform for the Admin Office (no manual typing errors).

### 5.3. Admin Office Export (Customizable Backend)
* **Export Tool:** F&S can export the database to a spreadsheet (Excel/CSV).
* **Customization:** Admins can select specific fields and date ranges for the export to match Admin Office requirements.

---

## 6. Case-by-Case & Edge Case Handling
* **Reversals:** If a bill is rejected or a payment needs to be reversed, F&S handles this manually through their master admin dashboard.
* **Lost Bills:** Protocol for lost physical bills is handled manually by F&S using their database edit privileges.
* **Disputes:** SCs can flag bills they find incorrect for F&S to review before payment.

---
**End of Exhaustive Specification**
