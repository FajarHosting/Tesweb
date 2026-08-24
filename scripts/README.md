# Scraper

This repository leaves the source adapter intentionally generic.

Recommended production flow:

1. GitHub Actions starts the scraper on a schedule.
2. Python/Playwright reads only sources you are authorized to scrape.
3. Normalize the result into:
   - serials
   - episodes
4. Upsert into Supabase using a server-side secret stored in GitHub Actions Secrets.
5. Do not put a Supabase secret/service-role key in browser code.

The frontend itself is already wired to the public/publishable Supabase key and RLS.
