import fs from 'fs/promises';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const INPUT_FILE = './data/gathered.json';

const FETCH_BATCH_SIZE = 20;   // fetch 20 images at a time
const INSERT_BATCH_SIZE = 20;  // insert 20 at a time
const BATCH_DELAY_MS = 10_000; // 10 seconds between batches

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
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    return { error: `HTTP ${res.status}` };
  }

  const data = await res.json();
  const page = Object.values(data?.query?.pages || {})[0];
  const imageinfo = page?.imageinfo?.[0];

  if (!imageinfo) {
    return { error: 'No imageinfo' };
  }

  return { imageinfo };
}

function extractMetadata(filename, imageinfo) {
  const meta = imageinfo.extmetadata || {};

  const user =
    meta.Artist?.value ||
    meta.Author?.value ||
    meta.Credit?.value ||
    'Unknown';

  return {
    title: filename,
    url: imageinfo.url,
    width: imageinfo.width,
    height: imageinfo.height,
    mime: imageinfo.mime,
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
    info_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
  };
}

// --------------------
// Main
// --------------------
async function run() {
  const raw = await fs.readFile(INPUT_FILE, 'utf-8');
  const filenames = JSON.parse(raw);

  console.log(`📂 Loaded ${filenames.length} filenames`);

  const failures = [];
  let totalInserted = 0;

  const filenameBatches = chunkArray(filenames, FETCH_BATCH_SIZE);

  for (let i = 0; i < filenameBatches.length; i++) {
    const batch = filenameBatches[i];
    console.log(`\n🚚 Processing batch ${i + 1}/${filenameBatches.length}`);

    const rows = [];

    for (const filename of batch) {
      console.log(`🔍 Fetching ${filename}`);

      const result = await fetchImageInfo(filename);

      if (result.error) {
        failures.push({
          filename,
          stage: 'fetch',
          reason: result.error,
        });
        console.warn(`⚠️ ${result.error} — ${filename}`);
        continue;
      }

      const meta = extractMetadata(filename, result.imageinfo);

      if (!meta.url) {
        failures.push({
          filename,
          stage: 'metadata',
          reason: 'Missing URL',
        });
        console.warn(`⚠️ Missing URL — ${filename}`);
        continue;
      }

      rows.push(meta);
      console.log(`✅ OK: ${filename}`);
    }

    if (rows.length) {
      const insertBatches = chunkArray(rows, INSERT_BATCH_SIZE);

      for (const insertBatch of insertBatches) {
        const { error } = await supabase
          .from('images')
          .insert(insertBatch, { ignoreDuplicates: true });

        if (error) {
          for (const row of insertBatch) {
            failures.push({
              filename: row.title,
              stage: 'supabase',
              reason: error.message,
            });
          }
          console.error('❌ Supabase insert failed:', error);
        } else {
          totalInserted += insertBatch.length;
        }
      }
    }

    if (i < filenameBatches.length - 1) {
      console.log(`⏳ Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  // --------------------
  // Final summary
  // --------------------
  console.log('\n🎉 Run complete');
  console.log(`✅ Total inserted: ${totalInserted}`);
  console.log(`❌ Total failures: ${failures.length}`);

  if (failures.length) {
    console.log('\n📄 Failure summary:');
    for (const f of failures) {
      console.log(`- ${f.filename} [${f.stage}]: ${f.reason}`);
    }
  }
}

run().catch(console.error);
