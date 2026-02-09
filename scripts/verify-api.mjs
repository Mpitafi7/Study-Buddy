#!/usr/bin/env node
/**
 * Call the app's /api/verify endpoint. Run with dev server: npm run dev (then) npm run verify:api
 */
const base = process.env.API_BASE || "http://localhost:8080";
const url = `${base}/api/verify`;

async function main() {
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.ok) {
      console.log("API verification: OK");
      process.exit(0);
    }
    console.error("API verification failed:", data.error || res.statusText);
    process.exit(1);
  } catch (err) {
    console.error("API verification error:", err.message);
    console.error("Make sure the dev server is running: npm run dev");
    process.exit(1);
  }
}

main();
