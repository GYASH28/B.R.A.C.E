#!/usr/bin/env node
/**
 * Check Voicebox connectivity and list profiles.
 */
const http = require("node:http");
const url = process.env.VOICEBOX_BASE_URL || "http://127.0.0.1:17493";

console.log(`\n  Checking Voicebox at ${url}...\n`);

const req = http.get(`${url}/profiles`, { timeout: 5000 }, (res) => {
  let data = "";
  res.on("data", (c) => { data += c; });
  res.on("end", () => {
    try {
      const profiles = JSON.parse(data);
      console.log(`  ✅ Voicebox is running (HTTP ${res.statusCode})`);
      if (Array.isArray(profiles) && profiles.length > 0) {
        console.log(`  📋 ${profiles.length} voice profile(s) available:\n`);
        for (const p of profiles.slice(0, 10)) {
          const name = p.name || p.id || JSON.stringify(p).slice(0, 50);
          console.log(`     • ${name}`);
        }
      } else {
        console.log("  📋 No profiles found (or empty response).");
      }
    } catch {
      console.log(`  ✅ Voicebox responded (HTTP ${res.statusCode}), but response was not JSON.`);
    }
    console.log();
  });
});

req.on("error", (e) => {
  console.log(`  ❌ Voicebox is not running.`);
  console.log(`     Error: ${e.message}`);
  console.log(`\n  To fix:`);
  console.log(`  1. Download Voicebox from https://voicebox.sh`);
  console.log(`  2. Install and launch Voicebox`);
  console.log(`  3. Re-run this check: npm run brace:voicebox:check\n`);
  process.exit(1);
});

req.on("timeout", () => {
  req.destroy();
  console.log("  ❌ Voicebox timed out.\n");
  process.exit(1);
});
