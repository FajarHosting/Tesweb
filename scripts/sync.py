"""
Generic scheduled ingestion skeleton.

IMPORTANT:
- Configure SOURCE_BASE_URL to a source you are authorized to scrape.
- This file intentionally does not contain a site-specific bypass or
  direct-media extractor.
- It demonstrates the database upsert contract for the frontend.
"""

import os
import re
import asyncio
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from supabase import create_client


SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SECRET_KEY = os.environ["SUPABASE_SECRET_KEY"]
SOURCE_BASE_URL = os.environ["SOURCE_BASE_URL"].rstrip("/")


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9\\s-]", "", value)
    value = re.sub(r"\\s+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


async def fetch_html(page, url: str) -> str:
    await page.goto(url, wait_until="domcontentloaded", timeout=60000)
    return await page.content()


async def main():
    supabase = create_client(
        SUPABASE_URL,
        SUPABASE_SECRET_KEY,
    )

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # TODO:
        # Implement selectors for your authorized source here.
        #
        # Example normalized object:
        # {
        #   "title": "...",
        #   "slug": "...",
        #   "cover_url": "...",
        #   "synopsis": "...",
        #   "status": "...",
        #   "studio": "...",
        #   "source_url": "..."
        # }
        #
        # Then upsert:
        # supabase.table("serials").upsert(
        #   record,
        #   on_conflict="source_url"
        # ).execute()

        html = await fetch_html(page, SOURCE_BASE_URL)
        soup = BeautifulSoup(html, "html.parser")

        print("Source loaded:", SOURCE_BASE_URL)
        print("Title:", soup.title.get_text(strip=True) if soup.title else "-")
        print("Ready for source-specific adapter.")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
