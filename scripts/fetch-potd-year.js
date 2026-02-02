// fetch-potd-year.js
import { fetchPotdMonth } from './fetch-potd-month.js';
import { importJsonToSupabase } from './fetch-potd-month.js'; // import the function
import fs from 'fs/promises';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPotdYear(year) {
  for (let month = 1; month <= 12; month++) {
    console.log(`\n📆 Fetching POTD for ${year}-${String(month).padStart(2, '0')}...`);

    try {
      // 1️⃣ Fetch month images
      await fetchPotdMonth(year, month);

      // 2️⃣ Import JSON to Supabase and clear it
      await importJsonToSupabase();

      console.log(`✅ Completed and imported ${year}-${String(month).padStart(2, '0')}`);
    } catch (err) {
      console.error(`❌ Error processing ${year}-${String(month).padStart(2, '0')}:`, err.message);
    }

    // 3️⃣ Wait 1–2 minutes before next month
    if (month < 12) {
      const delayMs = 90_000; // 1.5 minutes
      console.log(`⏱ Waiting ${delayMs / 1000} seconds before next month...`);
      await sleep(delayMs);
    }
  }

  console.log(`🎉 Finished fetching and importing all months for ${year}`);
}

// --------------------
// CLI usage: node fetch-potd-year.js 2024
// --------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, yearArg] = process.argv;
  const year = parseInt(yearArg, 10);

  if (!year) {
    console.error('Usage: node fetch-potd-year.js <year>');
    process.exit(1);
  }

  fetchPotdYear(year).catch(err => console.error(err));
}
