# NusaDonghua

A dark-mode donghua catalog/player starter built with Next.js + Supabase.

## Stack

- Next.js App Router
- React
- Supabase PostgreSQL
- Supabase Auth
- @supabase/ssr
- GitHub Actions for scheduled ingestion
- Python + Playwright for the ingestion worker

## 1. Create Supabase

Create a project at Supabase, then open SQL Editor and run:

supabase/schema.sql

## 2. Local environment

Copy:

.env.example -> .env.local

Then fill:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Use the publishable key in browser-facing code. Never expose a secret/service-role key in NEXT_PUBLIC_* variables.

## 3. Install and run

npm install
npm run dev

Open:

http://localhost:3000

## 4. Auth

Enable Email/Password in Supabase Auth.

For email confirmation, configure the confirmation URL for your deployed domain according to the current Supabase SSR Auth guide.

## 5. GitHub Actions

Add these GitHub repository secrets:

SUPABASE_URL
SUPABASE_SECRET_KEY
SOURCE_BASE_URL

The workflow runs every 6 hours and can also be started manually.

The scraper is a generic adapter. Add selectors only for sources you are authorized to scrape.

## 6. Deploy

Deploy the Next.js app to Vercel or another Node-compatible platform.

Set the same public Supabase environment variables in the hosting provider.

## Important security rule

Never put SUPABASE_SECRET_KEY/service-role credentials in browser code or NEXT_PUBLIC_* variables.
