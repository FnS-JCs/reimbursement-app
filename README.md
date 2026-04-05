# SRCC Placement Cell - Digital Reimbursement System

A web application for managing bill submissions and reimbursements for the SRCC Placement Cell.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth + Database + Storage)
- **Image Compression**: browser-image-compression

## Getting Started

### 1. Setup Supabase

Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to:
- Create a Supabase project
- Enable Google OAuth
- Create database tables
- Configure storage

### 2. Configure Environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

### For Junior Coordinators (JCs)
- Submit bills with vendor, company, category, and amount
- Upload photos/PDFs of bills
- Track submission status
- View reimbursement status

### For Senior Coordinators (SCs)
- Review bills submitted by JCs
- Filter by company, vendor, or JC
- Pay via UPI deep link
- Mark bills as reimbursed
- Flag disputed bills

### For F&S Admin
- View all bills across the system
- Edit/delete any bill
- Manage dropdown options (vendors, companies, categories)
- Set up SC to F&S POC mappings
- Manage reimbursement cycles
- Export data to CSV

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── BillForm.tsx  # Bill submission form
│   └── Navigation.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   └── supabase.ts   # Supabase client
├── pages/
│   ├── LoginPage.tsx
│   ├── JCDashboard.tsx
│   ├── SCDashboard.tsx
│   └── FSDashboard.tsx
└── types/
    └── index.ts
```

## GitHub Pages Deployment

This repo is configured to deploy to GitHub Pages automatically whenever you push to the `master` branch.

Before the first deployment, configure these in GitHub:

1. Go to `Settings` -> `Pages` and set `Source` to `GitHub Actions`.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Add a repository variable named `VITE_SUPABASE_URL`.
4. Add a repository secret named `VITE_SUPABASE_ANON_KEY`.

After that, each push to `master` will build the app and publish the latest version to GitHub Pages.

## License

MIT
