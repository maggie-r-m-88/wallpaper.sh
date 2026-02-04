import fs from 'fs/promises';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const OUTPUT_FILE = './data/images.json';
const BATCH_SIZE = 25; // Supabase batch size
const DELAY_MS = 200; // optional delay between requests to avoid hammering API

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// --------------------
// Helpers
// --------------------
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function extractFilename(url) {
  return url.split('/').pop();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch the first English Wikipedia main article
async function fetchEnglishArticle(filename) {
  const encodedTitle = encodeURIComponent('File:' + filename);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodedTitle}&prop=globalusage&gulimit=50`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0];
    const usage = page?.globalusage;
    if (!usage || !usage.length) return null;

    // Only main English Wikipedia articles (no colon in title)
    const mainArticle = usage.find(u => u.wiki === 'en.wikipedia.org' && !u.title.includes(':'));
    return mainArticle?.url || null;
  } catch (err) {
    console.error(`❌ Failed to fetch English article for ${filename}:`, err);
    return null;
  }
}

// --------------------
// Import JSON into Supabase (insert-only)
// --------------------
export async function importJsonWithArticlesInsertOnly() {
  try {
    const raw = await fs.readFile(OUTPUT_FILE, 'utf-8');
    const images = JSON.parse(raw);

    if (!images.length) {
      console.log('ℹ️ No images to import.');
      return;
    }

    console.log(`📥 Processing ${images.length} images with English Wikipedia article check...`);

    // Enhance each image with article_url
    for (const img of images) {
      if (!img.article_url) {
        const filename = extractFilename(img.url);
        const articleUrl = await fetchEnglishArticle(filename);
        if (articleUrl) {
          console.log(`✅ Found English article for ${filename}: ${articleUrl}`);
          img.article_url = articleUrl;
        } else {
          console.log(`⚠️ No English article found for ${filename}`);
        }
        await delay(DELAY_MS); // gentle delay
      }
    }

    // Insert into Supabase insert-only (skip existing URLs)
    for (const batch of chunkArray(images, BATCH_SIZE)) {
      const { error } = await supabase
        .from('images')
        .insert(batch, { ignoreDuplicates: true });

      if (error) {
        console.error('❌ Error inserting batch:', error);
        throw error;
      } else {
        console.log(`✅ Inserted batch of ${batch.length} images (duplicates skipped)`);
      }
    }

    console.log('\n🎉 Done! Images inserted without overwriting existing rows.');
  } catch (err) {
    console.error('❌ Failed to process images:', err);
    throw err;
  }
}

// --------------------
// CLI
// --------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  importJsonWithArticlesInsertOnly()
    .then(() => console.log('✅ Script finished!'))
    .catch(err => console.error(err));
}
