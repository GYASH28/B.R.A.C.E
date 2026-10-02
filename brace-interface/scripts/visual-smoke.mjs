import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
const artifactDir = path.join(appDir, "artifacts");
fs.mkdirSync(artifactDir, { recursive: true });

const electronApp = await electron.launch({
  args: ["."],
  cwd: appDir,
  env: {
    ...process.env,
    BRACE_VISUAL_SMOKE: "1",
  },
});

try {
  const page = await electronApp.firstWindow();
  await page.waitForSelector(".brace-shell", { timeout: 20000 });
  await page.waitForSelector(".brace-orb", { timeout: 20000 });
  await page.waitForSelector(".brace-composer", { timeout: 20000 });

  const metrics = await page.evaluate(() => {
    const shell = document.querySelector(".brace-shell")?.getBoundingClientRect();
    const orb = document.querySelector(".brace-orb")?.getBoundingClientRect();
    const composer = document.querySelector(".brace-composer")?.getBoundingClientRect();
    const sidebar = document.querySelector("aside, nav");
    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      width,
      height,
      shell: shell ? { x: shell.x, y: shell.y, width: shell.width, height: shell.height } : null,
      orb: orb ? { x: orb.x, y: orb.y, width: orb.width, height: orb.height } : null,
      composer: composer ? { x: composer.x, y: composer.y, width: composer.width, height: composer.height } : null,
      hasPermanentSidebar: Boolean(sidebar),
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });

  if (!metrics.shell || !metrics.orb || !metrics.composer) {
    throw new Error("Fresh shell, orb, or composer did not render.");
  }
  if (metrics.hasPermanentSidebar) {
    throw new Error("A permanent sidebar/nav rendered in the fresh shell.");
  }

  const orbCenter = metrics.orb.x + metrics.orb.width / 2;
  const viewportCenter = metrics.width / 2;
  if (Math.abs(orbCenter - viewportCenter) > Math.max(40, metrics.width * 0.04)) {
    throw new Error(`Orb is not horizontally centered: ${JSON.stringify(metrics)}`);
  }

  if (
    metrics.composer.x < 0 ||
    metrics.composer.y < 0 ||
    metrics.composer.x + metrics.composer.width > metrics.width + 1 ||
    metrics.composer.y + metrics.composer.height > metrics.height + 1
  ) {
    throw new Error(`Composer is clipped: ${JSON.stringify(metrics)}`);
  }

  if (metrics.bodyOverflow !== "hidden") {
    throw new Error(`Desktop shell should not page-scroll: ${JSON.stringify(metrics)}`);
  }

  const screenshotPath = path.join(artifactDir, "brace-shell-smoke.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  process.stdout.write(`✅ Electron visual smoke passed · ${metrics.width}x${metrics.height}\n`);
  process.stdout.write(`Screenshot: ${screenshotPath}\n`);
} finally {
  await electronApp.close();
}
