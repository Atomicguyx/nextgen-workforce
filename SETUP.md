# Setup guide (your own Supabase + Vercel)

## 1. Create your database (Supabase)
1. Make a free project at https://supabase.com
2. Open **SQL Editor** and run these files from `drizzle/migrations/`, one at a time, in order:
   `0000_migration.sql`, `0001_add_job_site_records.sql`, `0002_store_job_photos_inline.sql`,
   `0003_add_sales_leads.sql`, `0004_finance_and_auditor.sql`
3. Open **Project Settings > API** and copy: Project URL, publishable (anon) key, service_role key.

## 2. Put the code on GitHub
Create a private repo and push this folder. `.env` is ignored, so your keys stay out of GitHub.

## 3. Deploy on Vercel
1. vercel.com > Add New > Project > import the repo (Framework: it should detect itself; otherwise "Other")
2. Add these Environment Variables (values from `.env.example`):
   `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy.

## 4. Allow your site to log people in
Supabase > **Authentication > URL Configuration**: set Site URL to your Vercel address
(later your own domain) and add it under Redirect URLs, including `/reset-password`.

## 5. First login
The **first person to sign up becomes super admin** (see migration 0000). Sign up yourself
before sharing the link. Everyone after that starts as "pending" unless invited.

## Moving old data from Lovable (optional)
Export your tables as CSV from the Lovable Cloud database view and import them in Supabase
(Table Editor > Import). Users must sign up again; passwords can't be moved.

## Later: custom domain
Vercel > Project > Settings > Domains. Then update the URLs in step 4.
