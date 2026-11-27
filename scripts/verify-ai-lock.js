#!/usr/bin/env node
/**
 * AI-BLOCKING LOCK GUARD
 * ─────────────────────────────────────────────────────────────────────────────
 * The AI-blocking logic in BrowserView.native.tsx is FROZEN. This script fails
 * the build (or a pre-commit run) the moment any byte inside the locked region
 * changes, so feature work — incognito tabbing, data sharing, session handling —
 * cannot silently alter or weaken it.
 *
 * The region is located by CONTENT MARKERS, not fixed line numbers, so adding
 * code above or below it is fine; only changing the AI logic itself fails.
 *
 * Locked region (inclusive), from "const GOOGLE_AI_SELECTORS = [" through the
 * closing backtick-semicolon of YOUTUBE_AI_HIDE_SCRIPT. It contains:
 *   - GOOGLE_AI_SELECTORS / HWB_AI_STRONG_SELECTORS
 *   - GOOGLE_AI_BLOCK_RULES / GOOGLE_AI_NAV_RULES
 *   - DDG_AI_SELECTORS, BRAVE_AI_SELECTORS
 *   - GOOGLE_AI_HIDE_SCRIPT, DDG_AI_HIDE_SCRIPT, BRAVE_AI_HIDE_SCRIPT
 *   - YOUTUBE_AI_SELECTORS, YOUTUBE_AI_HIDE_SCRIPT
 *
 * Usage:
 *   node scripts/verify-ai-lock.js           # verify
 *   node scripts/verify-ai-lock.js --print   # print current hash + bounds
 *
 * Exit codes: 0 = locked region intact, 1 = changed, missing, or ambiguous.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const TARGET = path.join(
  REPO_ROOT,
  "artifacts",
  "mobile",
  "components",
  "BrowserView.native.tsx"
);

const START_MARKER = "Google AI element selectors";
const END_MARKER = "const YOUTUBE_AI_HIDE_SCRIPT = `";
const EXPECTED_SHA256 =
  "c0868e86f69166a61b7ca22b0decc287e2e0bafb0c6eb2a58c1fa1d54a827ecc";

function fail(msg) {
  console.error("\n[AI-LOCK] FAILED: " + msg + "\n");
  process.exit(1);
}

if (!fs.existsSync(TARGET)) fail("target file not found: " + TARGET);

// Normalise line endings first so CRLF<->LF conversion is not "tampering".
const raw = fs.readFileSync(TARGET, "utf8").replace(/\r\n/g, "\n");
const lines = raw.split("\n");

const startIdx = lines.findIndex((l) => l.indexOf(START_MARKER) !== -1);
if (startIdx === -1) {
  fail(
    "start marker not found: " + START_MARKER + "\n" +
      "The AI selector block was deleted or renamed. This region is frozen."
  );
}

const endMarkerIdx = lines.findIndex(
  (l, i) => i > startIdx && l.startsWith(END_MARKER)
);
if (endMarkerIdx === -1) {
  fail(
    "end marker not found after start: " + END_MARKER + "\n" +
      "The YouTube AI script was deleted or renamed. This region is frozen."
  );
}

// The YouTube script is a template literal closed by a line that is exactly
// "`;" (optionally with trailing spaces). Find the first one after the marker.
let closeIdx = -1;
for (let i = endMarkerIdx + 1; i < lines.length; i++) {
  if (/^`;\s*$/.test(lines[i])) {
    closeIdx = i;
    break;
  }
}
if (closeIdx === -1) {
  fail(
    "closing backtick of YOUTUBE_AI_HIDE_SCRIPT not found.\n" +
      "The region was truncated. This region is frozen."
  );
}

const region = lines.slice(startIdx, closeIdx + 1).join("\n");
const hash = crypto.createHash("sha256").update(region, "utf8").digest("hex");

if (process.argv.includes("--print")) {
  console.log("region lines : " + (startIdx + 1) + "-" + (closeIdx + 1));
  console.log("region bytes : " + Buffer.byteLength(region, "utf8"));
  console.log("sha256       : " + hash);
  process.exit(0);
}

if (hash !== EXPECTED_SHA256) {
  fail(
    "AI-blocking region changed.\n" +
      "  expected: " +
      EXPECTED_SHA256 +
      "\n" +
      "  actual  : " +
      hash +
      "\n" +
      "  at lines: " +
      (startIdx + 1) +
      "-" +
      (closeIdx + 1) +
      "\n\n" +
      "This region is frozen: it hides AI Overview content and the AI Mode tab\n" +
      "without touching organic results. Do not edit it as part of other work\n" +
      "(incognito tabs, data sharing, sessions).\n\n" +
      "If the change is deliberate, re-pin EXPECTED_SHA256 in this file in its\n" +
      "own commit and re-run the DOM harness + live Google check."
  );
}

console.log(
  "[AI-LOCK] OK — AI-blocking region intact (lines " +
    (startIdx + 1) +
    "-" +
    (closeIdx + 1) +
    ", " +
    Buffer.byteLength(region, "utf8") +
    " bytes)"
);
