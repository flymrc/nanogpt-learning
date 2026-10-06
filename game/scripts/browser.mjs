import { existsSync } from "node:fs";
import { chromium } from "playwright";

/**
 * Browser for the E2E suites. `CHROME` wins; otherwise use the system
 * Google Chrome when present (it plays the mp3 voice clips, like the
 * suites always did), and fall back to Playwright's own Chromium.
 */
export function chromeLaunchOptions(extra = {}) {
  const system = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome"].find((path) => existsSync(path));
  const executablePath = process.env.CHROME || system;
  return { ...(executablePath ? { executablePath } : {}), ...extra };
}

export function launchChrome(extra = {}) {
  return chromium.launch(chromeLaunchOptions(extra));
}

export { chromium };
