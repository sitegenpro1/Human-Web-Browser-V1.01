# ARCHITECTURE.md

# Human Browser Architecture

## 1. Vision

A native-first, AI-free browser. The browser must behave like a normal
browser while removing dependence on fragile DOM manipulation.

## 2. Core Principles

-   Native WebView first.
-   URL-driven Google search modes.
-   No DOM/CSS hacks.
-   Minimal interception.
-   Never regress existing browser features.

## 3. Search Pipeline

User Input → Detect URL vs Search → buildSearchUrl.ts → Canonical Google
URL → WebView → User browses normally

Only app-originated searches generate: - Web: udm=14 - Images:
tbm=isch - News: tbm=nws - Videos: tbm=vid

Live browsing should follow Google's URLs. Do not continually rewrite
navigation.

## 4. File Responsibilities

### artifacts/mobile/lib/buildSearchUrl.ts

Owns: - Query parsing - URL generation - URL normalization

Must NOT: - Manage UI - Manage WebView

### artifacts/mobile/components/BrowserView.native.tsx

Owns: - WebView lifecycle - Downloads - Permissions - Navigation
callbacks - Error handling

Must NOT: - Inject layout CSS - Parse Google HTML - Hide elements

### artifacts/mobile/app/(tabs)/index.tsx

Owns: - Search box - Mode selector - Tabs - Browser UI

Must NOT: - Rewrite URLs directly.

## 5. AI Blocking

Block AI using URL semantics only. Never hide AI using CSS or JavaScript
DOM mutations.

> **Implementation reality (locked).** The shipped engine is URL semantics
> (address bar → `udm=14`, `udm=50` → `udm=14`) *plus* a narrowly scoped
> DOM layer, because Google renders AI Overview inline and the AI Mode tab
> inside the nav strip, neither of which URL semantics can remove. The DOM
> layer is frozen and hash-guarded — see §5.1.

### 5.1 AI-blocking lock (do not modify)

The AI-blocking region of `BrowserView.native.tsx` (from the
`Google AI element selectors` header through the closing of
`YOUTUBE_AI_HIDE_SCRIPT`) is **frozen**. It is verified by hash on every
`pnpm build`, `pnpm typecheck`, and `git commit`:

```bash
pnpm run verify:ai-lock     # node scripts/verify-ai-lock.js
```

Rules that must never regress:

-   `data-hveid` is a **hard boundary**. Google wraps the AI Overview *and*
    the organic results in one `data-hveid` container on multi-result queries,
    so any `[data-hveid]:has(...)` hide rule deletes the whole results list.
-   The stylesheet uses semantic AI markers only (`HWB_AI_STRONG_SELECTORS`).
    Weak rotated classes (`.ULSxyf`, `.TQc1id`, `.M8OgIe`, `.Kevs9`, …) are
    confirmation candidates, never CSS selectors.
-   The AI Mode slot is hidden by CSS **before first paint**
    (`GOOGLE_AI_NAV_RULES`), scoped to `[role='navigation']`, so it cannot
    flash on tab switches.
-   Never hide `#search`, `#main`, `#rso`, or pagination containers.

To change this region deliberately: edit it, re-pin `EXPECTED_SHA256` in
`scripts/verify-ai-lock.js` in its own commit, then re-run the DOM harness
(87 assertions) and the live Google check. Work on incognito tabs, data
sharing, or sessions must not touch it.

## 6. Error Handling

Render website HTTP errors inside the browser. Only show native error UI
for genuine WebView failures.

## 7. Performance Rules

-   Avoid WebView remounts.
-   Avoid unnecessary reloads.
-   Never create navigation loops.

## 8. Regression Checklist

Before every merge verify: - Downloads - Tabs - History - Back/Forward -
Images - News - Videos - Cookies - Permissions - External links - Search
speed

## 9. Future Features

-   Private browsing
-   Reader mode
-   Ad blocking
-   Sync
-   Extensions
