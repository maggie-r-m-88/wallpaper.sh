import fs from 'fs/promises';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const INPUT_FILE = './data/gathered.json';
const BATCH_SIZE = 25;

// --------------------
// Supabase
// --------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// --------------------
// Helpers
// --------------------
function cleanHtml(html) {
  if (!html) return '';
  return new JSDOM(html).window.document.body.textContent.trim();
}

function parseCategories(raw) {
  if (!raw) return [];
  return raw.split('|').map(c => c.trim()).filter(Boolean);
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// --------------------
// Wikimedia
// --------------------
async function fetchImageInfo(filename) {
  const title = `File:${filename}`;
  const encoded = encodeURIComponent(title);

  const url =
    `${API_ENDPOINT}?action=query&titles=${encoded}` +
    `&prop=imageinfo&iiprop=url|size|dimensions|mime|extmetadata&format=json`;

  const res = await fetch(url);

  if (!res.ok) {
    console.warn(`⚠️ HTTP ${res.status} for ${filename}`);
    return null;
  }

  const data = await res.json();
  const pages = data?.query?.pages;
  const page = pages && Object.values(pages)[0];

  return page?.imageinfo?.[0] || null;
}

function extractMetadata(filename, imageinfo) {
  const meta = imageinfo?.extmetadata || {};

  const user =
    meta.Artist?.value ||
    meta.Author?.value ||
    meta.Credit?.value ||
    'Unknown';

  const encodedTitle = encodeURIComponent(filename);

  return {
    title: filename,
    url: imageinfo?.url,
    width: imageinfo?.width,
    height: imageinfo?.height,
    mime: imageinfo?.mime,
    added_at: new Date().toISOString(),
    taken_at: meta.DateTime?.value || null,
    source: 'Wikimedia Commons',
    attribution: cleanHtml(
      meta.Credit?.value ||
      meta.Artist?.value ||
      meta.Author?.value ||
      ''
    ),
    license_name: meta.LicenseShortName?.value || '',
    license_url: meta.LicenseUrl?.value || '',
    description: cleanHtml(meta.ImageDescription?.value),
    categories: parseCategories(meta.Categories?.value),
    owner: cleanHtml(user),
    info_url: `https://commons.wikimedia.org/wiki/File:${encodedTitle}`,
  };
}

// --------------------
// Main
// --------------------
async function run() {
  const raw = await fs.readFile(INPUT_FILE, 'utf-8');
  //const filenames = JSON.parse(raw);
  const START_INDEX = 105;

const allFilenames = JSON.parse(raw);
const filenames = allFilenames.slice(START_INDEX);

console.log(
  `📂 Loaded ${allFilenames.length} filenames, starting at index ${START_INDEX} (${filenames.length} remaining)`
);


  console.log(`📂 Loaded ${filenames.length} filenames`);

  const rows = [];

  for (const filename of filenames) {
    console.log(`🔍 Fetching ${filename}`);

    const imageinfo = await fetchImageInfo(filename);

    if (!imageinfo) {
      console.warn(`⚠️ No imageinfo for ${filename}`);
      continue;
    }

    const meta = extractMetadata(filename, imageinfo);

    if (!meta.url) {
      console.warn(`⚠️ Missing URL for ${filename}`);
      continue;
    }

    rows.push(meta);
    console.log(`✅ OK: ${filename}`);
  }

  if (!rows.length) {
    console.log('ℹ️ Nothing to import');
    return;
  }

  console.log(`📥 Importing ${rows.length} images into Supabase...`);

  for (const batch of chunkArray(rows, BATCH_SIZE)) {
    const { error } = await supabase
      .from('images')
      .upsert(batch, { onConflict: 'url' });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
  }

  console.log('🎉 Import complete');
}

run().catch(console.error);
