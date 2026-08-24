import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
  path: ".env.local",
});

// ======================================
// CONFIG
// ======================================

const ANICHIN = "https://anichin.cafe";
const ANICHIN_HOSTS = new Set([
  "anichin.cafe",
  "www.anichin.cafe",
]);

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum ada di .env.local"
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Berapa maksimal halaman pagination daftar series
const MAX_LIST_PAGES = 100;

// Delay antar request
const REQUEST_DELAY = 700;

// ======================================
// TYPES
// ======================================

type SeriesLink = {
  slug: string;
  url: string;
};

type SeriesData = {
  slug: string;
  title: string;
  cover_url: string | null;
  synopsis: string | null;
  status: string;
  source_url: string;
};

type EpisodeData = {
  series_id: number;
  episode_number: number;
  title: string;
  episode_url: string;
  player_url: string | null;
};

// ======================================
// UTILITY
// ======================================

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(
  value: string | undefined | null
): string | null {
  if (!value) return null;

  const result = value
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();

  return result || null;
}

function absoluteUrl(
  value: string,
  base = ANICHIN
): string | null {
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

function isAnichinUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    return ANICHIN_HOSTS.has(
      parsed.hostname.toLowerCase()
    );
  } catch {
    return false;
  }
}

function slugFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;

    const parts = pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);

    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    )
    .trim();
}

// ======================================
// EPISODE HELPERS
// ======================================

function parseEpisodeNumber(
  text: string,
  url = ""
): number | null {
  const source = `${text} ${url}`;

  const patterns = [
    /episode[\s._-]*(\d+(?:\.\d+)?)/i,
    /\bep[\s._-]*(\d+(?:\.\d+)?)/i,
    /\beps[\s._-]*(\d+(?:\.\d+)?)/i,
    /episode[-_]?(\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);

    if (!match) continue;

    const number = Number(match[1]);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function isEpisodeLink(
  url: string,
  text: string
): boolean {
  const value =
    `${url} ${text}`.toLowerCase();

  return (
    /\bepisode\b/.test(value) ||
    /\bep[\s._-]*\d/.test(value) ||
    /\beps[\s._-]*\d/.test(value)
  );
}

// ======================================
// SERIES URL CHECK
// ======================================

function isSeriesPageUrl(
  url: string
): boolean {
  try {
    const parsed = new URL(url);

    if (
      !ANICHIN_HOSTS.has(
        parsed.hostname.toLowerCase()
      )
    ) {
      return false;
    }

    const pathname =
      parsed.pathname.replace(/\/+$/, "") || "/";

    // Harus /seri/...
    if (!pathname.startsWith("/seri/")) {
      return false;
    }

    // Buang index
    if (
      pathname === "/seri" ||
      pathname === "/seri/list-mode" ||
      pathname === "/seri/feed"
    ) {
      return false;
    }

    // Buang pagination
    if (
      /^\/seri\/page\/\d+$/i.test(
        pathname
      )
    ) {
      return false;
    }

    if (
      pathname.includes("/feed") ||
      pathname.includes("/page/")
    ) {
      return false;
    }

    const slug = slugFromUrl(url);

    if (!slug) {
      return false;
    }

    const invalidSlugs = new Set([
      "seri",
      "list-mode",
      "feed",
      "page",
      "genre",
      "tag",
      "search",
    ]);

    if (
      invalidSlugs.has(
        slug.toLowerCase()
      )
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ======================================
// FETCH HTML
// ======================================

async function fetchHtml(
  url: string
): Promise<string> {
  console.log(`GET ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",

      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

      "Accept-Language":
        "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",

      Referer: ANICHIN + "/",
    },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText} - ${url}`
    );
  }

  return response.text();
}

// ======================================
// EXTRACT SERIES FROM ONE PAGE
// ======================================

function extractSeriesLinks(
  html: string
): SeriesLink[] {
  const $ = cheerio.load(html);

  const map =
    new Map<string, SeriesLink>();

  $("a[href]").each(
    (_, element) => {
      const href =
        $(element).attr("href");

      if (!href) return;

      const url =
        absoluteUrl(href);

      if (!url) return;

      if (!isSeriesPageUrl(url)) {
        return;
      }

      const slug =
        slugFromUrl(url);

      if (!slug) return;

      map.set(slug, {
        slug,
        url,
      });
    }
  );

  return [...map.values()];
}

// ======================================
// FIND PAGINATION LINKS
// ======================================

function extractPaginationLinks(
  html: string
): string[] {
  const $ = cheerio.load(html);

  const links =
    new Set<string>();

  $("a[href]").each(
    (_, element) => {
      const href =
        $(element).attr("href");

      if (!href) return;

      const url =
        absoluteUrl(href);

      if (!url) return;

      if (!isAnichinUrl(url)) {
        return;
      }

      let parsed: URL;

      try {
        parsed = new URL(url);
      } catch {
        return;
      }

      const pathname =
        parsed.pathname;

      /*
       * Contoh:
       * /seri/page/2/
       * /ongoing/page/2/
       * /completed/page/2/
       */
      if (
        /\/page\/\d+\/?$/i.test(
          pathname
        )
      ) {
        links.add(url);
      }
    }
  );

  return [...links];
}

// ======================================
// COLLECT ALL SERIES
// ======================================

async function collectSeriesLinks(): Promise<
  SeriesLink[]
> {
  const startPages = [
    `${ANICHIN}/seri/`,
    `${ANICHIN}/seri/list-mode/`,
    `${ANICHIN}/ongoing/`,
    `${ANICHIN}/completed/`,
  ];

  const visited =
    new Set<string>();

  const queue =
    [...startPages];

  const seriesMap =
    new Map<string, SeriesLink>();

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "        MENCARI DAFTAR SERIES"
  );
  console.log(
    "======================================"
  );
  console.log("");

  while (
    queue.length > 0 &&
    visited.size < MAX_LIST_PAGES
  ) {
    const current =
      queue.shift()!;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    try {
      const html =
        await fetchHtml(current);

      const found =
        extractSeriesLinks(html);

      let added = 0;

      for (const item of found) {
        if (
          !seriesMap.has(
            item.slug
          )
        ) {
          seriesMap.set(
            item.slug,
            item
          );

          added++;

          console.log(
            `  + ${item.slug}`
          );
        }
      }

      console.log("");
      console.log(
        `Halaman: ${current}`
      );
      console.log(
        `Series baru: ${added}`
      );
      console.log(
        `Total unik: ${seriesMap.size}`
      );

      /*
       * Cari halaman pagination.
       */
      const pagination =
        extractPaginationLinks(
          html
        );

      for (const page of pagination) {
        if (
          !visited.has(page) &&
          !queue.includes(page) &&
          visited.size +
            queue.length <
            MAX_LIST_PAGES
        ) {
          queue.push(page);
        }
      }

      await sleep(
        REQUEST_DELAY
      );
    } catch (error) {
      console.error(
        `Gagal membaca ${current}:`,
        error instanceof Error
          ? error.message
          : error
      );
    }
  }

  const result =
    [...seriesMap.values()];

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    `TOTAL SERIES UNIK: ${result.length}`
  );
  console.log(
    `HALAMAN DICEK    : ${visited.size}`
  );
  console.log(
    "======================================"
  );
  console.log("");

  return result;
}

// ======================================
// PARSE SERIES PAGE
// ======================================

async function parseSeriesPage(
  slug: string,
  url: string
): Promise<{
  series: SeriesData;
  episodes: Omit<
    EpisodeData,
    "series_id"
  >[];
}> {
  const html =
    await fetchHtml(url);

  const $ =
    cheerio.load(html);

  // ====================================
  // TITLE
  // ====================================

  let title =
    cleanText(
      $("h1").first().text()
    ) ||
    cleanText(
      $(".post-title").first().text()
    ) ||
    cleanText(
      $(".entry-title").first().text()
    ) ||
    cleanText(
      $("meta[property='og:title']")
        .attr("content")
    ) ||
    cleanText(
      $("title").text()
    ) ||
    titleFromSlug(slug);

  title = title
    .replace(
      /\s*[-|]\s*Anichin.*$/i,
      ""
    )
    .trim();

  // ====================================
  // COVER
  // ====================================

  let cover:
    string | null = null;

  const coverSelectors = [
    "meta[property='og:image']",
    "meta[name='twitter:image']",
    ".summary_image img",
    ".summary_image",
    ".thumb img",
    ".item-summary img",
    ".tab-thumb img",
    ".c-tabs-item__content img",
    "img",
  ];

  for (
    const selector of
      coverSelectors
  ) {
    const element =
      $(selector).first();

    if (!element.length) {
      continue;
    }

    const value =
      element.attr("content") ||
      element.attr(
        "data-lazy-src"
      ) ||
      element.attr(
        "data-src"
      ) ||
      element.attr("src");

    if (!value) {
      continue;
    }

    const resolved =
      absoluteUrl(value);

    if (resolved) {
      cover = resolved;
      break;
    }
  }

  // ====================================
  // SYNOPSIS
  // ====================================

  let synopsis:
    string | null = null;

  const synopsisSelectors = [
    ".summary__content",
    ".summary_content",
    ".description",
    ".desc",
    ".tab-summary",
    ".summary_content p",
    "[class*='description']",
  ];

  for (
    const selector of
      synopsisSelectors
  ) {
    const text =
      cleanText(
        $(selector)
          .first()
          .text()
      );

    if (
      text &&
      text.length > 20
    ) {
      synopsis = text;
      break;
    }
  }

  if (!synopsis) {
    synopsis =
      cleanText(
        $(
          "meta[name='description']"
        ).attr("content")
      );
  }

  // ====================================
  // STATUS
  // ====================================

  const bodyText =
    cleanText(
      $("body").text()
    ) || "";

  let status =
    "ongoing";

  if (
    /\bcompleted\b/i.test(
      bodyText
    ) ||
    /\bcomplete\b/i.test(
      bodyText
    ) ||
    /\bselesai\b/i.test(
      bodyText
    )
  ) {
    status =
      "completed";
  }

  // ====================================
  // EPISODES
  // ====================================

  const episodeMap =
    new Map<
      string,
      Omit<
        EpisodeData,
        "series_id"
      >
    >();

  $("a[href]").each(
    (_, element) => {
      const href =
        $(element).attr("href");

      if (!href) return;

      const episodeUrl =
        absoluteUrl(href);

      if (!episodeUrl) {
        return;
      }

      if (
        !isAnichinUrl(
          episodeUrl
        )
      ) {
        return;
      }

      const text =
        cleanText(
          $(element).text()
        ) ||
        titleFromSlug(
          slugFromUrl(
            episodeUrl
          )
        );

      if (
        !isEpisodeLink(
          episodeUrl,
          text
        )
      ) {
        return;
      }

      const episodeNumber =
        parseEpisodeNumber(
          text,
          episodeUrl
        );

      if (
        episodeNumber === null
      ) {
        return;
      }

      episodeMap.set(
        episodeUrl,
        {
          episode_number:
            episodeNumber,

          title:
            text,

          episode_url:
            episodeUrl,

          player_url:
            null,
        }
      );
    }
  );

  const episodes =
    [...episodeMap.values()]
      .sort(
        (a, b) =>
          a.episode_number -
          b.episode_number
      );

  return {
    series: {
      slug,
      title,
      cover_url:
        cover,
      synopsis,
      status,
      source_url:
        url,
    },

    episodes,
  };
}

// ======================================
// UPSERT SERIES
// ======================================

async function upsertSeries(
  data: SeriesData
): Promise<number> {
  const {
    data: row,
    error,
  } = await supabase
    .from("series")
    .upsert(
      {
        slug:
          data.slug,

        title:
          data.title,

        cover_url:
          data.cover_url,

        synopsis:
          data.synopsis,

        status:
          data.status,

        source_url:
          data.source_url,

        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "slug",
      }
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Gagal upsert series ${data.title}: ${error.message}`
    );
  }

  if (!row) {
    throw new Error(
      `Series ${data.title} tidak mengembalikan ID`
    );
  }

  return row.id as number;
}

// ======================================
// UPSERT EPISODES
// ======================================

async function upsertEpisodes(
  seriesId: number,
  episodes: Omit<
    EpisodeData,
    "series_id"
  >[]
) {
  if (
    episodes.length === 0
  ) {
    return;
  }

  const rows =
    episodes.map(
      (episode) => ({
        series_id:
          seriesId,

        episode_number:
          episode.episode_number,

        title:
          episode.title,

        episode_url:
          episode.episode_url,

        player_url:
          episode.player_url,

        updated_at:
          new Date().toISOString(),
      })
    );

  const {
    error,
  } = await supabase
    .from("episodes")
    .upsert(
      rows,
      {
        onConflict:
          "series_id,episode_number",
      }
    );

  if (error) {
    throw new Error(
      `Gagal upsert episodes series ${seriesId}: ${error.message}`
    );
  }
}

// ======================================
// MAIN
// ======================================

async function run() {
  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "          NUSADHUA IMPORTER"
  );
  console.log(
    "======================================"
  );
  console.log("");

  console.log(
    "Supabase:",
    SUPABASE_URL
  );

  console.log(
    "Source  :",
    ANICHIN
  );

  console.log("");

  // ====================================
  // COLLECT
  // ====================================

  const seriesLinks =
    await collectSeriesLinks();

  console.log(
    `Ditemukan ${seriesLinks.length} kemungkinan series.`
  );

  if (
    seriesLinks.length === 0
  ) {
    console.log("");
    console.log(
      "TIDAK ADA SERIES."
    );
    console.log(
      "Importer dihentikan."
    );
    return;
  }

  // ====================================
  // PROCESS
  // ====================================

  let success = 0;
  let failed = 0;
  let totalEpisodes = 0;

  for (
    let i = 0;
    i < seriesLinks.length;
    i++
  ) {
    const item =
      seriesLinks[i];

    console.log("");
    console.log(
      "--------------------------------------"
    );

    console.log(
      `[${i + 1}/${seriesLinks.length}] ${item.slug}`
    );

    console.log(
      `URL: ${item.url}`
    );

    try {
      const parsed =
        await parseSeriesPage(
          item.slug,
          item.url
        );

      console.log(
        `Title   : ${parsed.series.title}`
      );

      console.log(
        `Status  : ${parsed.series.status}`
      );

      console.log(
        `Episodes: ${parsed.episodes.length}`
      );

      const seriesId =
        await upsertSeries(
          parsed.series
        );

      await upsertEpisodes(
        seriesId,
        parsed.episodes
      );

      success++;

      totalEpisodes +=
        parsed.episodes.length;

      console.log(
        `OK: ${parsed.series.title}`
      );

      await sleep(
        REQUEST_DELAY
      );
    } catch (error) {
      failed++;

      console.error(
        "FAILED:",
        error instanceof Error
          ? error.message
          : error
      );
    }
  }

  // ====================================
  // SUMMARY
  // ====================================

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "               SELESAI"
  );
  console.log(
    "======================================"
  );

  console.log(
    `Series berhasil : ${success}`
  );

  console.log(
    `Series gagal    : ${failed}`
  );

  console.log(
    `Episode diproses: ${totalEpisodes}`
  );

  console.log(
    "======================================"
  );
  console.log("");
}

// ======================================
// START
// ======================================

run().catch(
  (error) => {
    console.error("");
    console.error(
      "IMPORTER ERROR"
    );
    console.error(error);
    process.exit(1);
  }
);