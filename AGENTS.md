# AGENTS.md

## Mission

Build a stable, AI-free browser.

### Rules

-   Never use DOM hacks.
-   Use URL-based Google modes.
-   Never regress downloads, tabs, history, permissions or WebView
    behavior.
-   Make the smallest safe change.

### File ownership

-   buildSearchUrl.ts: URL generation.
-   BrowserView.native.tsx: WebView lifecycle.
-   index.tsx: UI orchestration.

### Process

Read AGENTS.md before changing code. Read ARCHITECTURE.md next. Document
decisions.
