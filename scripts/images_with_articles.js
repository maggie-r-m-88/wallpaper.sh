import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const BATCH_SIZE = 40; // number of images to process per batch
const BATCH_DELAY_MS = 60_000;  // 60 seconds between batches

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
function extractFilename(url) {
  return url.split('/').pop();
}

async function fetchMainArticleEn(filename) {
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

    // Filter for English Wikipedia main articles (no colon in title)
    const mainArticle = usage.find(u => u.wiki === 'en.wikipedia.org' && !u.title.includes(':'));
    return mainArticle?.url || null;
  } catch (err) {
    console.error(`❌ Error fetching globalusage for ${filename}:`, err);
    return null;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --------------------
// Main
// --------------------
async function updateAllImages() {
  let batchNumber = 1;

  while (true) {
    console.log(`\n📦 Fetching batch #${batchNumber} of images...`);

    const { data: images, error } = await supabase
      .from('images')
      .select('id,url,title,article_url')
      .is('article_url', null)
      .limit(BATCH_SIZE);

    if (error) {
      console.error('❌ Error fetching images from Supabase:', error);
      break;
    }

    if (!images || !images.length) {
      console.log('🎉 All images processed!');
      break;
    }

    for (const img of images) {
      const filename = extractFilename(img.url);
      console.log(`🔍 [Batch ${batchNumber}] Fetching main English Wikipedia article for ${filename}...`);

      const articleUrl = await fetchMainArticleEn(filename);

      if (articleUrl) {
        console.log(`✅ Found main article: ${articleUrl}`);
      } else {
        console.log(`⚠️ No main article found for ${filename}`);
      }

      // Update the row in Supabase
      const { error: updateError } = await supabase
        .from('images')
        .update({ article_url: articleUrl })
        .eq('id', img.id);

      if (updateError) {
        console.error(`❌ Failed to update row for ${img.id}:`, updateError);
      }
    }

    console.log(`⏳ Waiting 60 seconds before next batch...`);
    await delay(BATCH_DELAY_MS);

    batchNumber++;
  }

  console.log('\n✅ Done processing all images!');
}

// --------------------
// CLI
// --------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  updateAllImages()
    .then(() => console.log('✅ Script finished!'))
    .catch(err => console.error(err));
}
