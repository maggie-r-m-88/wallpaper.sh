import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const IMAGES_JSON = './data/images.json';
const BATCH_SIZE = 25; // small batch to avoid overflow

// Helper to split array into chunks
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function importImages() {
  const raw = await fs.readFile(IMAGES_JSON, 'utf-8');
  const images = JSON.parse(raw);

  console.log(`📥 Importing ${images.length} images...`);

  // Map images into table rows
  const imageRows = images.map(img => ({
    url: img.url,
    title: img.title,
    width: img.width,
    height: img.height,
    mime: img.mime,
    added_at: img.addedAt,
    taken_at: img.dateTime,
    source: img.source,
    attribution: img.attribution,
    license_name: img.licenseName,
    license_url: img.licenseUrl,
    description: img.description,
    categories: img.categories || [], // store categories as JSON array
    owner: img.owner,
  }));

  // Upsert in batches
  for (const batch of chunkArray(imageRows, BATCH_SIZE)) {
    const { error } = await supabase
      .from('images')
      .upsert(batch, { onConflict: 'url' }); // upsert by URL
    if (error) throw error;
  }

  console.log(`✅ Imported ${images.length} images successfully!`);
}

importImages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
