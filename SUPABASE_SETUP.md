# Supabase Setup Guide

Follow these steps to set up your Supabase project for the SRCC Placement Cell App.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Fill in the details:
   - **Name**: SRCC Placement Cell
   - **Database Region**: Choose closest to you
   - **Password**: Set a strong password (save this!)
4. Wait for the project to be created (2-3 minutes)

## Step 2: Get Your API Keys

1. Go to Project Settings > API
2. Copy the following:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: The long string starting with `eyJ...`

## Step 3: Create .env File

Create a file named `.env` in the project root with:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Enable Google OAuth

1. Go to Authentication > Providers > Google
2. Enable it
3. You'll need to create a Google Cloud project:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Go to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://xxxxx.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret
4. Paste these into Supabase Google provider settings
5. Also add your app's URL to authorized redirect URIs in Supabase

## Step 5: Create Database Tables

Go to Supabase Dashboard > SQL Editor and run these queries:

### Users Table
```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  name TEXT,
  roll_no TEXT,
  role TEXT CHECK (role IN ('JC', 'SC', 'F_S')) NOT NULL DEFAULT 'JC',
  upi_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Anyone authenticated can insert users (for auto-creation on sign up)
CREATE POLICY "Authenticated users can insert users" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Vendors Table
```sql
CREATE TABLE vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed some vendors
INSERT INTO vendors (name) VALUES
  ('Stationery Shop'),
  ('Printing Shop'),
  ('Food Court'),
  ('Catering Service'),
  ('Transport'),
  ('Miscellaneous');
```

### Companies Table
```sql
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed some companies
INSERT INTO companies (name) VALUES
  ('Google'),
  ('Microsoft'),
  ('Amazon'),
  ('McKinsey'),
  ('Goldman Sachs'),
  ('Deloitte');
```

### Categories Table
```sql
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed some categories
INSERT INTO categories (name) VALUES
  ('Stationery'),
  ('Printing'),
  ('Food'),
  ('Travel'),
  ('Accommodation'),
  ('Miscellaneous');
```

### Bills Table
```sql
CREATE TABLE bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users NOT NULL,
  sc_id UUID REFERENCES users NOT NULL,
  vendor_id UUID REFERENCES vendors NOT NULL,
  company_id UUID REFERENCES companies NOT NULL,
  category_id UUID REFERENCES categories NOT NULL,
  bill_number TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  process_type TEXT CHECK (process_type IN ('PPT', 'Interview', 'Test', 'GD', 'Other')) NOT NULL,
  file_url TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('pending', 'reimbursed', 'handed_to_fs', 'disputed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vendor_id, bill_number)
);

-- Enable RLS
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can insert bills
CREATE POLICY "Authenticated users can insert bills" ON bills
  FOR INSERT WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'F_S'
  ));

-- Policy: Users can view their own bills
CREATE POLICY "Users can view own bills" ON bills
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = sc_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'F_S'
  ));

-- Policy: SCs can update bills assigned to them
CREATE POLICY "SCs can update bills" ON bills
  FOR UPDATE USING (auth.uid() = sc_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'F_S'
  ));

-- Policy: F&S can delete bills
CREATE POLICY "F&S can delete bills" ON bills
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'F_S'
  ));
```

### POC Mapping Table
```sql
CREATE TABLE poc_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sc_id UUID REFERENCES users NOT NULL,
  fs_jc_id UUID REFERENCES users NOT NULL,
  UNIQUE(sc_id)
);
```

### Reimbursement Cycles Table
```sql
CREATE TABLE reimbursement_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed March 2026 as active cycle
INSERT INTO reimbursement_cycles (name, start_date, is_active)
VALUES ('March 2026', '2026-03-01', TRUE);
```

## Step 6: Create Storage Bucket

1. Go to Storage > New Bucket
2. Name: `bills`
3. Set Public: Yes
4. Create folder structure by adding this policy:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('bills', 'bills', true);

-- Storage policies
CREATE POLICY "Anyone can upload bills" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'bills' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view bills" ON storage.objects
  FOR SELECT USING (bucket_id = 'bills');

CREATE POLICY "Users can update own bills" ON storage.objects
  FOR UPDATE USING (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Step 7: Set Up Auto-Create User Profile

Create a trigger to automatically create a user profile when someone signs up:

```sql
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'JC'  -- Default role, can be changed manually in Supabase
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 8: Update User Roles (Manual)

After users sign up, you'll need to manually update their roles in the `users` table:
- SCs: Update role to 'SC'
- F&S JCs: Update role to 'F_S'

## Step 9: Configure Redirect URL

1. Go to Authentication > URL Configuration
2. Add your app URL to Site URL: `http://localhost:5173` (for local dev)
3. Add to Redirect URLs: `http://localhost:5173/*`

## Testing

1. Start the app: `npm run dev`
2. Sign in with Google
3. Check the `users` table to see your profile
4. Update your role to test different dashboards
