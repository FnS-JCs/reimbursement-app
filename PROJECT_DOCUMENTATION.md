# SRCC Placement Cell - Digital Reimbursement System

## Overview

A comprehensive web application for managing bill submissions and reimbursements for the SRCC Placement Cell's Finance and Strategy (F&S) department.

### Purpose

This system digitizes the manual bill submission and reimbursement workflow, replacing paper-based processes with a streamlined database-driven solution accessible on any device.

---

## Project Structure

```
placement-cell-app/
├── public/                    # Static assets
├── src/
│   ├── assets/               # Images and static files
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Table.tsx
│   │   │   └── index.ts      # Barrel exports
│   │   ├── BillForm.tsx      # Bill submission/edit form
│   │   └── Navigation.tsx     # Top navigation bar
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication state management
│   ├── lib/
│   │   └── supabase.ts        # Supabase client initialization
│   ├── pages/
│   │   ├── Dashboard.tsx       # Role-based dashboard router (demo mode)
│   │   ├── FSDashboard.tsx     # Finance & Strategy admin dashboard
│   │   ├── JCDashboard.tsx     # Junior Coordinator dashboard
│   │   ├── LoginPage.tsx       # Google OAuth login
│   │   └── SCDashboard.tsx     # Senior Coordinator dashboard
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── App.tsx                 # Main app with routing
│   ├── main.tsx               # React entry point
│   └── index.css              # Tailwind CSS styles
├── .env                       # Environment variables (local only)
├── .gitignore
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## User Roles

### 1. Junior Coordinator (JC)
**Role Code:** `JC`

Junior Coordinators are the primary spenders during company placement processes. They:
- Submit bills with vendor details, company name, and expense amount
- Upload photos/PDFs of physical bills or screenshots of digital invoices
- Track reimbursement status (pending, reimbursed, disputed)
- See which F&S POC to hand physical bills to

### 2. Senior Coordinator (SC)
**Role Code:** `SC`

Senior Coordinators head placement processes with JCs under them. They:
- Review bills submitted by their JCs
- Filter bills by company, vendor, or specific JC
- Pay JCs via UPI (deep-linked to payment apps)
- Mark bills as "Paid" when reimbursement is complete
- Flag disputed bills for F&S review
- Submit their own bills (auto-tagged with their name)

### 3. Finance & Strategy (F&S)
**Role Code:** `F_S`

The F&S department handles overall financial management. They have:
- **Master Database Access**: View, edit, delete any bill in the system
- **User Management**: Add/edit/delete JCs and SCs, including UPI IDs
- **Dropdown Management**: Maintain vendors, companies, and expense categories
- **POC Mapping**: Assign each SC to their designated F&S POC
- **Reimbursement Cycles**: Create and manage monthly billing cycles
- **Export Tools**: Generate CSV exports with customizable fields and date ranges

---

## Features

### Bill Submission Form

Each bill submission captures:
1. **Date of Bill** - Calendar date picker
2. **Process Type** - PPT, Interview, Test, GD, Other
3. **Company Name** - Dropdown (managed by F&S)
4. **Associated SC** - Dropdown of all SCs
5. **Vendor** - Dropdown (managed by F&S)
6. **Category** - Stationery, Printing, Food, Travel, etc.
7. **Bill Number** - Manual entry (unique per vendor)
8. **Amount** - Numeric value in INR
9. **File Upload** - Photo/PDF of bill (auto-compressed)
10. **Online Bill Toggle** - Indicates digital invoice (still requires screenshot upload)

**Automation:**
- Files auto-renamed: `SCName_DDMMYYYY_Company_Vendor_BillNo.ext`
- Submitter automatically recorded
- Duplicate detection (blocks same vendor + bill number)

### UPI Payment Integration

SCs can pay JCs via UPI deep links:
- Opens phone's default UPI app (Google Pay, PhonePe, Paytm, etc.)
- Pre-fills JC's UPI ID and amount
- JC UPI IDs are stored in user profiles (editable by F&S)

### Status Workflow

```
[Pending] → SC pays JC → [Reimbursed]
                ↓
           [Disputed] → F&S reviews → [Pending/Reimbursed]
                ↓
         Physical bills handed to F&S → [Handed to F&S]
```

### POC Notification

When a JC submits a bill, the app shows:
> "Kindly give the physical bill to [POC Name]"

This POC is determined by the SC-to-F&S POC mapping configured by F&S.

---

## Database Schema

### Tables

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (references auth.users) |
| email | TEXT | User's email |
| name | TEXT | Full name |
| roll_no | TEXT | College roll number |
| role | TEXT | JC, SC, or F_S |
| upi_id | TEXT | UPI payment ID (optional) |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `bills`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | JC who submitted (references users) |
| sc_id | UUID | Associated SC (references users) |
| vendor_id | UUID | Vendor (references vendors) |
| company_id | UUID | Company (references companies) |
| category_id | UUID | Category (references categories) |
| bill_number | TEXT | Unique bill/invoice number |
| date | DATE | Date on the bill |
| amount | NUMERIC | Amount in INR |
| process_type | TEXT | PPT, Interview, Test, GD, Other |
| file_url | TEXT | URL to uploaded file |
| is_online | BOOLEAN | Is digital invoice |
| status | TEXT | pending, reimbursed, handed_to_fs, disputed |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Constraints:** UNIQUE(vendor_id, bill_number)

#### `vendors`, `companies`, `categories`
Standard lookup tables with `id`, `name`, `created_at`.

#### `poc_mapping`
Maps SCs to their F&S POCs:
| Column | Type |
|--------|------|
| id | UUID |
| sc_id | UUID (unique) |
| fs_jc_id | UUID |

#### `reimbursement_cycles`
Monthly billing periods:
| Column | Type |
|--------|------|
| id | UUID |
| name | TEXT |
| start_date | DATE |
| end_date | DATE |
| is_active | BOOLEAN |
| is_closed | BOOLEAN |

---

## API Reference

### Supabase Tables

All tables use Supabase's auto-generated CRUD API. Key relationships:

```sql
-- Bills with relations
bills.*, 
users (jc details),
vendors (name),
companies (name), 
categories (name),
sc:users!bills_sc_id_fkey (sc details)

-- POC mappings
poc_mapping.*,
sc:users!poc_mapping_sc_id_fkey (name),
fs_jc:users!poc_mapping_fs_jc_id_fkey (name)
```

### Row Level Security

- **Users**: Can view/update own profile, insert own record on signup
- **Bills**: Authenticated users can insert; SCs can update assigned bills; F&S can do anything
- **Vendors/Companies/Categories**: F&S can manage; authenticated users can view

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Setup Instructions

### 1. Supabase Project Setup

1. Create project at [supabase.com](https://supabase.com)
2. Enable Google OAuth in Authentication > Providers > Google
3. Create database tables (see `SUPABASE_SETUP.md`)
4. Create storage bucket named `bills` with public access
5. Set up auto-create user profile trigger

### 2. Local Development

```bash
# Clone repository
git clone <repo-url>
cd placement-cell-app

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### 3. Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Deploy to any static hosting (Vercel, Netlify, GitHub Pages, etc.)

---

## Workflow Example

### JC Submits a Bill

1. JC logs in with Google OAuth
2. Clicks "Submit Bill"
3. Fills form: date, vendor, company, category, amount, bill number
4. Uploads photo of bill or screenshot of digital invoice
5. Selects "Associated SC" (the SC heading the process)
6. Submits
7. Sees confirmation: "Kindly give the physical bill to [POC Name]"
8. Bills appear in "Your Bills" list with status tracking

### SC Reviews and Pays

1. SC logs in
2. Sees all bills from JCs under them
3. Filters by company/vendor/JC if needed
4. Clicks bill to view details
5. Clicks "Open UPI App" to pay JC
6. Returns to app, clicks "I Have Paid"
7. Bill status changes to "Reimbursed"

### F&S Monthly Close

1. F&S admin logs in
2. Creates new reimbursement cycle for the month
3. All bills from that month appear filtered
4. Reviews disputed bills, makes corrections
5. Exports to CSV for Admin Office
6. Once Admin Office reimburses, closes the cycle

---

## File Naming Convention

Uploaded files are renamed automatically:
```
{SCName}_{DDMMYYYY}_{Company}_{Vendor}_{BillNumber}.{ext}
```

Example: `RahulSharma_15032024_Google_Swiggy_BILL001.jpg`

---

## Security Considerations

1. **Authentication**: Google OAuth only (no passwords)
2. **Authorization**: Row Level Security policies in Supabase
3. **File Storage**: Supabase Storage with authenticated-only uploads
4. **UPI IDs**: Stored securely in database, editable only by F&S

---

## Known Limitations

1. **Demo Mode**: Currently bypasses auth for development/testing
2. **UPI Integration**: Opens external app; payment confirmation is manual
3. **No Real-time Updates**: Uses polling, not Supabase Realtime subscriptions
4. **Manual Role Assignment**: New users default to JC; F&S must manually update roles

---

## Future Enhancements

1. Real-time bill status updates
2. Push notifications for reimbursement status
3. WhatsApp/Telegram integration
4. Receipt OCR scanning
5. Budget tracking per company
6. Analytics dashboard

---

## Support

For issues or questions, please open an issue on GitHub or contact the F&S department.

---

## License

MIT
