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
