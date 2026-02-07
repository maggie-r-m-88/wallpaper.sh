import fs from 'fs/promises';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const OUTPUT_FILE = './data/images.json';
const BATCH_SIZE = 25;

// --------------------
// Supabase client
// --------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// --------------------
// Helpers
// --------------------
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function cleanHtml(html) {
  if (!html) return '';
  return new JSDOM(html).window.document.body.textContent.trim();
}

function parseCategories(raw) {
  if (!raw) return [];
  return raw.split('|').map(cat => cat.trim()).filter(Boolean);
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// --------------------
// Featured feed (POTD selector)
// --------------------
async function fetchFeaturedFeedTitle(year, month, day) {
  const y = year;
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');

  const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${y}/${m}/${d}`;
  const res = await fetch(url);

  if (!res.ok) return null;

  const data = await res.json();
  return data?.image?.title?.replace(/^File:/, '') || null;
}

// --------------------
// Commons imageinfo
// --------------------
async function fetchImageInfo(title) {
  const encodedTitle = encodeURIComponent('Image:' + title);
  const url =
    `${API_ENDPOINT}?action=query` +
    `&titles=${encodedTitle}` +
    `&prop=imageinfo` +
    `&iiprop=url|size|dimensions|mime|metadata|extmetadata` +
    `&format=json`;

  const res = await fetch(url);
  const data = await res.json();
  const page = Object.values(data.query.pages)[0];
  return page?.imageinfo?.[0] || null;
}

function extractMetadata(title, imageinfo) {
  const meta = imageinfo?.extmetadata || {};

  const userData =
    meta.Artist?.value ||
    meta.Author?.value ||
    meta.Credit?.value ||
    'Unknown';

  const infoUrl = title
    ? `https://commons.wikimedia.org/wiki/File:${title}`
    : null;

  return {
    title,
    url: imageinfo?.url,
    width: imageinfo?.width,
    height: imageinfo?.height,
    mime: imageinfo?.mime,
    addedAt: new Date().toISOString(),
    source: 'Wikimedia Commons',
    attribution: cleanHtml(
      meta.Credit?.value ||
      meta.Artist?.value ||
      meta.Author?.value ||
      ''
    ),
    licenseName: meta.LicenseShortName?.value || '',
    licenseUrl: meta.LicenseUrl?.value || '',
    categories: parseCategories(meta.Categories?.value),
    description: cleanHtml(meta.ImageDescription?.value),
    dateTime: meta.DateTime?.value || '',
    owner: cleanHtml(userData),
    infoUrl,
  };
}

// --------------------
// Fetch POTD via feed → Commons
// --------------------
export async function fetchPotdMonth(year, month) {
  let existingData = [];
  try {
    existingData = JSON.parse(await fs.readFile(OUTPUT_FILE, 'utf-8'));
  } catch {
    existingData = [];
  }

  const existingUrls = new Set(existingData.map(img => img.url));
  const newImages = [];
  const numDays = getDaysInMonth(year, month);

  for (let day = 1; day <= numDays; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log(`📅 Fetching featured image for ${dateStr}`);

    const title = await fetchFeaturedFeedTitle(year, month, day);
    if (!title) {
      console.warn(`⚠️ No featured image for ${dateStr}`);
      continue;
    }

    console.log(`🖼️ Found image: ${title}`);

    const imageinfo = await fetchImageInfo(title);
    if (!imageinfo) {
      console.warn(`⚠️ No imageinfo found for ${title}`);
      continue;
    }

    const metadata = extractMetadata(title, imageinfo);

    if (existingUrls.has(metadata.url)) {
      console.log(`ℹ️ Already exists locally: ${metadata.url}`);
      continue;
    }

    newImages.push(metadata);
    existingUrls.add(metadata.url);
    console.log(`✅ Added ${title}`);
  }

  const finalData = existingData.concat(newImages);

  await fs.mkdir('./data', { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(finalData, null, 2));

  console.log(`\n✅ Saved ${newImages.length} new images to ${OUTPUT_FILE}`);
  return newImages;
}

// --------------------
// Insert-only Supabase import (pre-check for duplicates)
// --------------------
export async function importJsonToSupabase(images) {
  if (!images.length) {
    console.log('ℹ️ No new images to import.');
    return;
  }

  console.log(`📥 Inserting ${images.length} images into Supabase (insert-only)`);

  const rows = images.map(img => ({
    url: img.url,
    title: img.title,
    width: img.width,
    height: img.height,
    mime: img.mime,
    added_at: img.addedAt,
    taken_at: img.dateTime || null,
    source: img.source,
    attribution: img.attribution,
    license_name: img.licenseName,
    license_url: img.licenseUrl,
    description: img.description,
    categories: img.categories || [],
    owner: img.owner,
    info_url: img.infoUrl,
  }));

  for (const batch of chunkArray(rows, BATCH_SIZE)) {
    // Pre-check existing URLs in DB
    const { data: existingRows } = await supabase
      .from('images')
      .select('url')
      .in('url', batch.map(img => img.url));

    const existingUrlsInDB = new Set(existingRows.map(r => r.url));
    const batchToInsert = batch.filter(img => !existingUrlsInDB.has(img.url));

    if (batchToInsert.length === 0) {
      console.log(`⚠️ Skipping batch, all URLs already exist`);
      continue;
    }

    const { error } = await supabase
      .from('images')
      .insert(batchToInsert);

    if (error) {
      console.error('❌ Supabase insert failed:', error);
      throw error;
    }

    console.log(`✅ Inserted batch of ${batchToInsert.length}`);
  }

  console.log('🎉 Supabase import complete (existing rows untouched)');
}

// --------------------
// CLI usage
// --------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, yearArg, monthArg] = process.argv;
  const year = parseInt(yearArg, 10);
  const month = parseInt(monthArg, 10);

  if (!year || !month || month < 1 || month > 12) {
    console.error('Usage: node fetch-potd-month.js <year> <month>');
    process.exit(1);
  }

  fetchPotdMonth(year, month)
    .then(newImages => importJsonToSupabase(newImages))
    .then(() => console.log('🎉 Done for the month!'))
    .catch(console.error);
}
