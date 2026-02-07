import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// --------------------
// Config
// --------------------
const RATE_LIMIT_MS = 1500; // ms between OpenAI calls
const BATCH_SIZE = 50;
const MAX_RETRIES = 5;

// --------------------
// Supabase
// --------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// --------------------
// OpenAI
// --------------------
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// --------------------
// Tag generation
// --------------------
async function generateTags(image, attempt = 1) {
  const prompt = `
You are generating discovery tags for a large photo collection.

Rules:
- Output 10–15 tags
- lowercase
- 1–2 words per tag
- no years
- no camera, lens, or contest names
- no photographer names
- generic but meaningful
- allowed proper nouns: cities, countries

Input:
Title: ${image.title || ''}
Description: ${image.description || ''}
Categories: ${image.categories || ''}

Output:
JSON array of strings only.
`;

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const text = await res.text();
      const status = res.status;

      if ((status === 429 || status === 503) && attempt <= MAX_RETRIES) {
        const wait = RATE_LIMIT_MS * attempt;
        console.warn(`⚠️ OpenAI rate limit/service error, retrying in ${wait / 1000}s (attempt ${attempt})`);
        await sleep(wait);
        return generateTags(image, attempt + 1);
      }

      throw new Error(`OpenAI error ${status}: ${text}`);
    }

    const json = await res.json();
    const content = json.choices[0].message.content;
    return JSON.parse(content);

  } catch (err) {
    if (attempt <= MAX_RETRIES) {
      const wait = RATE_LIMIT_MS * attempt;
      console.warn(`⚠️ OpenAI error, retrying in ${wait / 1000}s (attempt ${attempt})`);
      await sleep(wait);
      return generateTags(image, attempt + 1);
    }
    throw err;
  }
}

// --------------------
// Main
// --------------------
async function run() {
  const failedImages = [];

  while (true) {
    console.log('🔍 Fetching next batch of untagged images...');

    const { data: images, error } = await supabase
      .rpc('get_untagged_images', { batch_size: BATCH_SIZE });

    if (error) {
      console.error('❌ Supabase fetch failed:', error);
      break;
    }

    if (!images.length) {
      console.log('🎉 No untagged images found, all done!');
      break;
    }

    console.log(`📸 Found ${images.length} images to tag`);

    for (const image of images) {
      try {
        console.log(`🏷️ Tagging image ${image.id}`);

        const tags = await generateTags(image);

        const { error: insertError } = await supabase
          .from('image_tag_candidates')
          .insert({
            image_id: image.id,
            image_url: image.url,
            tags,
            model: 'gpt-4.1-mini',
            prompt_version: 'v1'
          });

        if (insertError) {
          console.error(`❌ Insert failed for ${image.id}`, insertError);
          failedImages.push({ id: image.id, reason: 'supabase_insert', error: insertError });
          continue;
        }

        console.log(`✅ Tags saved for image ${image.id}`);
        await sleep(RATE_LIMIT_MS);

      } catch (err) {
        console.error(`❌ Failed image ${image.id}`, err.message);
        failedImages.push({ id: image.id, reason: 'openai', error: err.message });
      }
    }

    console.log('🎉 Batch complete');
  }

  if (failedImages.length) {
    console.log('🚨 Summary of failed images:');
    console.table(failedImages);
  }
}

run();
