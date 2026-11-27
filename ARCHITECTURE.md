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

## 6. Private (Incognito) Session Isolation

Incognito must not leak data in either direction. Skipping our own history array
is not enough, because the WebView's storage is shared by the whole app: Google
persists the last query in `localStorage` (`sb_wiz.pq`,
`sb_wiz.zpc.gws-wiz-serp.`), so a private search appeared in the normal search
box and vice versa.

### 6.1 Why the `incognito` WebView prop is not used

On Android, `react-native-webview` implements `incognito` by calling
`CookieManager.getInstance().removeAllCookies(null)` — a **process-wide** wipe,
not a per-WebView one (upstream issue #3988). Enabling it for a single private
tab would silently log the user out of every normal tab, and it cannot be undone
without a restart. The library exposes no per-WebView cookie profile or data
directory on this stack, so native isolation does not exist here.

### 6.2 What is used instead

`PRIVATE_SESSION_SCRIPT` in `BrowserView.native.tsx` is injected through
`injectedJavaScriptBeforeContentLoaded` ahead of the AI script when the tab is
private, and re-injected on same-document navigation. It gives the document
throwaway in-memory storage:

-   `localStorage` / `sessionStorage` start empty and persist nothing.
-   Reads and writes behave normally *within* the page (no throw), including
    bracket access, `Object.keys()`, `for..in`, `in`, `delete` and
    `Storage.prototype` calls — implemented with a `Proxy` so enumeration
    matches real `Storage`.
-   `indexedDB.open()` fails with a real `SecurityError` `DOMException` and a
    request that supports both `onerror` and `addEventListener`.
-   `document.cookie` is a per-document in-memory jar, so CSRF tokens set and
    read back in JS still work, but normal-mode cookies are never visible and
    nothing written survives the document.
-   The Cache API resolves to an empty cache instead of rejecting, avoiding
    unhandled rejections in pages that probe for it.

The real on-disk data is never modified, so leaving private mode needs no
re-download. Toggling the flag on a live WebView reloads once in either
direction, because a document cannot be un-shielded in place.

### 6.3 Invariants

-   Never set `incognito` on the WebView.
-   The shield must not alter the frozen AI region (§5.1) or its behaviour; the
    two scripts are concatenated, private first.
-   Normal mode must remain byte-for-byte unaffected when `isPrivate` is false.

## 7. Error Handling

Render website HTTP errors inside the browser. Only show native error UI
for genuine WebView failures.

## 8. Performance Rules

-   Avoid WebView remounts.
-   Avoid unnecessary reloads.
-   Never create navigation loops.

## 9. Regression Checklist

Before every merge verify: - Downloads - Tabs - History - Back/Forward -
Images - News - Videos - Cookies - Permissions - External links - Search
speed - Incognito isolation (both directions, §6)

## 10. Future Features

-   Reader mode
-   Ad blocking
-   Sync
-   Extensions
