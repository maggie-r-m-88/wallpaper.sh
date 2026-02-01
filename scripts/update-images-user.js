import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const BATCH_SIZE = 30;
const DELAY_MS = 500; // ms delay between requests

function cleanHtml(html) {
  if (!html) return '';
  return new JSDOM(html).window.document.body.textContent.trim();
}

async function fetchArtist(title) {
  const encodedTitle = encodeURIComponent('Image:' + title);
  const url = `${API_ENDPOINT}?action=query&titles=${encodedTitle}&prop=imageinfo&iiprop=extmetadata&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = Object.values(data.query.pages);
  const imageinfo = pages[0]?.imageinfo?.[0];

  const userData = imageinfo?.extmetadata?.Artist?.value || null;
  return cleanHtml(userData);
}

async function updateMissingOrDirtyUsers() {
  while (true) {
    // Fetch rows where user is NULL, "NULL", or contains HTML tags
    const { data: images, error } = await supabase
      .from('images')
      .select('id,title,owner')
      .or('owner.is.null,owner.eq.NULL,owner.ilike.%<%')
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!images.length) break; // nothing left to update

    console.log(`ℹ️ Processing ${images.length} images...`);

    for (const img of images) {
      try {
        const artist = await fetchArtist(img.title);
        if (!artist) continue;

        await supabase
          .from('images')
          .update({ owner: artist })
          .eq('id', img.id);

        console.log(`✅ Updated ${img.title} → ${artist}`);
      } catch (err) {
        console.error(`❌ Failed ${img.title}:`, err.message);
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log('🎉 All missing/dirty owners updated!');
}

updateMissingOrDirtyUsers().catch(err => console.error(err));
