import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const ANICHIN = "https://anichin.cafe";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum ada di .env.local"
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ======================================
// TYPES
// ======================================

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
// UTILITIES
// ======================================

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(
  value: string | undefined | null
) {
  if (!value) return null;

  return value
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function absoluteUrl(
  url: string,
  base = ANICHIN
) {
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

function slugFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;

    return (
      pathname
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .filter(Boolean)
        .pop() || ""
    );
  } catch {
    return "";
  }
}

function titleFromSlug(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    )
    .trim();
}

function parseEpisodeNumber(
  text: string,
  url = ""
) {
  const source = `${text} ${url}`;

  const patterns = [
    /episode[\s._-]*(\d+(?:\.\d+)?)/i,
    /ep[\s._-]*(\d+(?:\.\d+)?)/i,
    /eps[\s._-]*(\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);

    if (match) {
      const number = Number(match[1]);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return null;
}

function isEpisodeLink(
  url: string,
  text: string
) {
  const value =
    `${url} ${text}`.toLowerCase();

  return (
    /episode/.test(value) ||
    /\bep\b/.test(value) ||
    /\beps\b/.test(value)
  );
}

// ======================================
// FETCH HTML
// ======================================

async function fetchHtml(url: string) {
  console.log(`GET ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36",

      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

      "Accept-Language":
        "id-ID,id;q=0.9,en;q=0.8",

      Referer: ANICHIN,
    },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText} - ${url}`
    );
  }

  return await response.text();
}

// ======================================
// COLLECT SERIES LINKS
// ======================================

async function collectSeriesLinks() {
  const sources = [
    `${ANICHIN}/seri/`,
    `${ANICHIN}/seri/list-mode/`,
    `${ANICHIN}/ongoing/`,
    `${ANICHIN}/completed/`,
  ];

  const map = new Map<string, string>();

  console.log("");
  console.log("======================================");
  console.log("       MENCARI DAFTAR SERIES");
  console.log("======================================");

  for (const source of sources) {
    try {
      const html = await fetchHtml(source);
      const $ = cheerio.load(html);

      let found = 0;

      $("a[href]").each((_, element) => {
        const href = $(element).attr("href");

        if (!href) return;

        const absolute = absoluteUrl(href);

        if (!absolute) return;

        let parsed: URL;

        try {
          parsed = new URL(absolute);
        } catch {
          return;
        }

        /*
         * Hanya ambil link dari domain Anichin.
         */
        if (parsed.hostname !== "anichin.cafe") {
          return;
        }

        const pathname = parsed.pathname;

        /*
         * Series Anichin berada di:
         *
         * /seri/nama-series/
         */
        if (!pathname.startsWith("/seri/")) {
          return;
        }

        /*
         * Buang halaman index / pagination.
         */
        if (
          pathname === "/seri/" ||
          pathname === "/seri/list-mode/" ||
          pathname === "/seri/feed/" ||
          pathname.includes("/page/")
        ) {
          return;
        }

        const slug = slugFromUrl(absolute);

        if (!slug) return;

        /*
         * Pastikan bukan link episode.
         */
        const text =
          cleanText($(element).text()) ||
          titleFromSlug(slug);

        if (isEpisodeLink(absolute, text)) {
          return;
        }

        if (!map.has(slug)) {
          map.set(slug, absolute);
          found++;

          console.log(`  + ${slug}`);
        }
      });

      console.log("");
      console.log(`Sumber: ${source}`);
      console.log(`Series ditemukan: ${found}`);

      await sleep(700);
    } catch (error) {
      console.error(
        `Gagal membaca ${source}:`,
        error instanceof Error
          ? error.message
          : error
      );
    }
  }

  const result = [...map.entries()].map(
    ([slug, url]) => ({
      slug,
      url,
    })
  );

  console.log("");
  console.log("======================================");
  console.log(
    `TOTAL SERIES UNIK: ${result.length}`
  );
  console.log("======================================");
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

  // ------------------------------------
  // TITLE
  // ------------------------------------

  let title =
    cleanText(
      $("h1")
        .first()
        .text()
    ) ||
    cleanText(
      $("h2")
        .first()
        .text()
    ) ||
    cleanText(
      $("title").text()
    ) ||
    titleFromSlug(slug);

  title = title
    .replace(
      /\s*-\s*Anichin.*$/i,
      ""
    )
    .trim();

  // ------------------------------------
  // COVER
  // ------------------------------------

  let cover:
    string | null = null;

  const coverCandidates = [
    ".summary_image img",
    ".thumb img",
    ".c-tabs-item__content .tab-thumb img",
    ".item-summary img",
    ".summary_image",
    "meta[property='og:image']",
    "meta[name='twitter:image']",
  ];

  for (
    const selector of coverCandidates
  ) {
    const element =
      $(selector).first();

    if (!element.length) {
      continue;
    }

    const value =
      element.attr("content") ||
      element.attr(
        "data-src"
      ) ||
      element.attr(
        "data-lazy-src"
      ) ||
      element.attr("src");

    if (value) {
      const resolved =
        absoluteUrl(value);

      if (resolved) {
        cover = resolved;
        break;
      }
    }
  }

  // ------------------------------------
  // SYNOPSIS
  // ------------------------------------

  let synopsis:
    string | null = null;

  const synopsisCandidates = [
    ".summary__content",
    ".summary_content",
    ".description",
    ".desc",
    ".tab-summary",
    "[class*='description']",
  ];

  for (
    const selector of
      synopsisCandidates
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

  // ------------------------------------
  // STATUS
  // ------------------------------------

  const bodyText =
    cleanText(
      $("body").text()
    ) || "";

  let status = "ongoing";

  if (
    /completed|complete|selesai/i.test(
      bodyText
    )
  ) {
    status = "completed";
  }

  // ------------------------------------
  // EPISODES
  // ------------------------------------

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

      let parsed: URL;

      try {
        parsed =
          new URL(
            episodeUrl
          );
      } catch {
        return;
      }

      if (
        parsed.hostname !==
          "anichin.cafe" &&
        parsed.hostname !==
          "www.anichin.cafe"
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

          title: text,

          episode_url:
            episodeUrl,

          player_url: null,
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
      cover_url: cover,
      synopsis,
      status,
      source_url: url,
    },

    episodes,
  };
}

// ======================================
// UPSERT SERIES
// ======================================

async function upsertSeries(
  data: SeriesData
) {
  const {
    data: row,
    error,
  } = await supabase
    .from("series")
    .upsert(
      {
        slug: data.slug,
        title: data.title,
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
        onConflict: "slug",
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
  if (!episodes.length) {
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
// MAIN IMPORTER
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

  // ------------------------------------
  // COLLECT SERIES
  // ------------------------------------

  const seriesLinks =
    await collectSeriesLinks();

  console.log("");

  console.log(
    `Ditemukan ${seriesLinks.length} kemungkinan series.`
  );

  if (
    seriesLinks.length === 0
  ) {
    console.log("");

    console.log(
      "Tidak ada series yang ditemukan."
    );

    console.log(
      "Importer dihentikan agar database tidak diproses kosong."
    );

    return;
  }

  // ------------------------------------
  // PROCESS
  // ------------------------------------

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
        `Title: ${parsed.series.title}`
      );

      console.log(
        `Status: ${parsed.series.status}`
      );

      console.log(
        `Episodes ditemukan: ${parsed.episodes.length}`
      );

      // ------------------------------
      // UPLOAD SERIES
      // ------------------------------

      const seriesId =
        await upsertSeries(
          parsed.series
        );

      // ------------------------------
      // UPLOAD EPISODES
      // ------------------------------

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

      await sleep(900);
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

  // ------------------------------------
  // SUMMARY
  // ------------------------------------

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