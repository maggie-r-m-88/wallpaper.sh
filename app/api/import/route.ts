import { NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const API_ENDPOINT = "https://commons.wikimedia.org/w/api.php";

console.log("📦 /api/import route loaded");

// --------------------
// Supabase
// --------------------
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

console.log("🔌 Supabase client initialized");

// --------------------
// Types
// --------------------
type WikimediaImageInfo = {
  url: string;
  width: number;
  height: number;
  mime: string;
  extmetadata?: Record<
    string,
    {
      value?: string;
    }
  >;
};

type ImportRequestBody = {
  filename: string;
};

// --------------------
// Helpers
// --------------------
function cleanHtml(html?: string): string {
  if (!html) return "";
  return new JSDOM(html).window.document.body.textContent?.trim() ?? "";
}

function parseCategories(raw?: string): string[] {
  if (!raw) return [];
  return raw.split("|").map(c => c.trim()).filter(Boolean);
}

// --------------------
// Wikimedia
// --------------------
async function fetchImageInfo(
  filename: string
): Promise<WikimediaImageInfo | null> {
  console.log("🌐 Fetching Wikimedia info for:", filename);

  const title = `File:${filename}`;
  const encoded = encodeURIComponent(title);

  const url =
    `${API_ENDPOINT}?action=query&titles=${encoded}` +
    `&prop=imageinfo&iiprop=url|size|dimensions|mime|extmetadata&format=json`;

  console.log("➡️ Wikimedia API URL:", url);

  const res = await fetch(url);
  console.log("⬅️ Wikimedia response status:", res.status);

  if (!res.ok) {
    console.warn("⚠️ Wikimedia fetch failed");
    return null;
  }

  const data = await res.json();
  const page = Object.values(data?.query?.pages ?? {})[0] as any;

  if (!page?.imageinfo?.[0]) {
    console.warn("⚠️ No imageinfo in response");
    return null;
  }

  console.log("✅ Wikimedia imageinfo found");
  return page.imageinfo[0];
}

function extractMetadata(
  filename: string,
  imageinfo: WikimediaImageInfo
) {
  console.log("🧩 Extracting metadata for:", filename);

  const meta = imageinfo.extmetadata ?? {};

  const user =
    meta.Artist?.value ||
    meta.Author?.value ||
    meta.Credit?.value ||
    "Unknown";

  return {
    title: filename,
    url: imageinfo.url,
    width: imageinfo.width,
    height: imageinfo.height,
    mime: imageinfo.mime,
    added_at: new Date().toISOString(),
    taken_at: meta.DateTime?.value ?? null,
    source: "Wikimedia Commons",
    attribution: cleanHtml(user),
    license_name: meta.LicenseShortName?.value ?? "",
    license_url: meta.LicenseUrl?.value ?? "",
    description: cleanHtml(meta.ImageDescription?.value),
    categories: parseCategories(meta.Categories?.value),
    owner: cleanHtml(user),
    info_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(
      filename
    )}`,
  };
}

// --------------------
// POST /api/import
// --------------------
export async function POST(req: Request) {
  console.log("📥 POST /api/import hit");

  try {
    const body = (await req.json()) as ImportRequestBody;
    console.log("📨 Request body:", body);

    if (!body?.filename) {
      console.warn("⚠️ Missing filename");
      return NextResponse.json(
        { error: "Missing filename" },
        { status: 400 }
      );
    }

    const imageinfo = await fetchImageInfo(body.filename);

    if (!imageinfo) {
      console.warn("⚠️ No imageinfo returned");
      return NextResponse.json(
        { error: "No imageinfo found" },
        { status: 404 }
      );
    }

    const meta = extractMetadata(body.filename, imageinfo);
    console.log("🗂 Prepared metadata:", meta);

    console.log("📤 Upserting into Supabase…");

    const { error } = await supabase
      .from("images")
      .upsert(meta, {
        onConflict: "url",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    console.log("✅ Import successful");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("🔥 Import crashed:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
