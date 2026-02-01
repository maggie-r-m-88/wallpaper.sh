// fetch-potd-month.js
import fs from 'fs/promises';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const OUTPUT_FILE = './data/images.json';

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

async function expandPotdTemplate(dateStr) {
  const url = `${API_ENDPOINT}?action=expandtemplates&text={{Potd/${dateStr}}}&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.expandtemplates?.['*'] || null;
}

async function fetchImageInfo(title) {
  const encodedTitle = encodeURIComponent('Image:' + title);
  const url = `${API_ENDPOINT}?action=query&titles=${encodedTitle}&prop=imageinfo&iiprop=url|size|dimensions|mime|metadata|extmetadata&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data.query.pages;
  const page = Object.values(pages)[0];
  return page?.imageinfo?.[0] || null;
}

function extractMetadata(title, imageinfo) {
  const meta = imageinfo?.extmetadata || {};
  return {
    title,
    url: imageinfo?.url,
    width: imageinfo?.width,
    height: imageinfo?.height,
    mime: imageinfo?.mime,
    addedAt: new Date().toISOString(),
    source: 'Wikipedia Commons',
    attribution: cleanHtml(meta.Credit?.value || meta.Artist?.value || ''),
    licenseName: meta.LicenseShortName?.value || '',
    licenseUrl: meta.LicenseUrl?.value || '',
    categories: parseCategories(meta.Categories?.value),
    description: cleanHtml(meta.ImageDescription?.value),
    dateTime: meta.DateTime?.value || ''
  };
}

export async function fetchPotdMonth(year, month) {
  // Load existing JSON if it exists
  let existingData = [];
  try {
    const raw = await fs.readFile(OUTPUT_FILE, 'utf-8');
    existingData = JSON.parse(raw);
  } catch (err) {
    // file might not exist, that's fine
    existingData = [];
  }

  const existingUrls = new Set(existingData.map(img => img.url));
  const numDays = getDaysInMonth(year, month);
  const newImages = [];

  for (let day = 1; day <= numDays; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log(`📅 Fetching POTD for ${dateStr}...`);

    const title = await expandPotdTemplate(dateStr);
    if (!title) {
      console.warn(`⚠️ No POTD template found for ${dateStr}`);
      continue;
    }

    const imageinfo = await fetchImageInfo(title);
    if (!imageinfo) {
      console.warn(`⚠️ No imageinfo found for ${title}`);
      continue;
    }

    const metadata = extractMetadata(title, imageinfo);

    if (existingUrls.has(metadata.url)) {
      console.log(`ℹ️ Image already exists: ${metadata.url}`);
      continue; // skip duplicates
    }

    newImages.push(metadata);
    existingUrls.add(metadata.url);
    console.log(`✅ Fetched ${title}`);
  }

  const finalData = existingData.concat(newImages);

  await fs.mkdir('./data', { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
  console.log(`\n✅ Saved ${newImages.length} new images to ${OUTPUT_FILE}`);
  return finalData;
}

// -----------------------------
// CLI usage: node fetch-potd-month.js <year> <month>
// -----------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, yearArg, monthArg] = process.argv;
  const year = parseInt(yearArg, 10);
  const month = parseInt(monthArg, 10);

  if (!year || !month || month < 1 || month > 12) {
    console.error('Usage: node fetch-potd-month.js <year> <month>');
    process.exit(1);
  }

  fetchPotdMonth(year, month)
    .then(() => console.log('Done'))
    .catch(err => console.error(err));
}
