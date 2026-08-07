# PRODUCT.md

# Human Browser Product Definition

## 1. Product Name

**Human Browser**

Working description:

> A fast, stable, AI-free mobile browser focused on direct access to the open web.

The name and branding may evolve, but the product principle must remain unchanged.

---

## 2. Product Mission

Human Browser exists to give users a clean web-search and browsing experience without forcing AI-generated summaries, AI-first search modes, or unnecessary automated interpretation between the user and the source.

The browser should help users:

- reach original websites quickly
- browse normal search results
- access images, news, videos, and other web verticals
- retain control over what they read
- avoid being forced into AI-generated answer interfaces

The product must remain a real browser, not merely a search wrapper.

---

## 3. Product Promise

Human Browser should feel:

- fast
- predictable
- simple
- trustworthy
- native
- stable
- respectful of user intent

The browser must never claim to remove every form of machine learning from the internet.

The product promise is narrower and more defensible:

> Human Browser minimizes forced AI search experiences and prioritizes direct web results.

---

## 4. Core User Problem

Modern search engines increasingly place AI-generated interfaces between users and original sources.

This creates several problems:

- users may receive summaries instead of source pages
- search intent may be redirected into AI chat experiences
- publishers may receive fewer direct visits
- users may have less control over how information is presented
- search pages may become slower, heavier, and less predictable

Human Browser addresses this by favoring direct-result search modes and preserving normal browsing behavior.

---

## 5. Target Users

Primary users:

- people who prefer traditional web search
- students and researchers who want original sources
- bloggers, publishers, and SEO professionals
- users who dislike AI-generated search summaries
- privacy-conscious users
- users with low-end or mid-range Android devices
- users who want a lightweight alternative to large browsers

Secondary users:

- journalists
- content writers
- developers
- website owners
- users in regions with slower internet connections

---

## 6. Primary Use Cases

### 6.1 Direct Web Search

The user enters a query and receives normal web results without being routed into AI Mode.

### 6.2 Image Search

The user can search images and open image results without breaking the browser session.

### 6.3 News Search

The user can browse Google News-style result pages without being forced back into another mode.

### 6.4 Video Search

The user can search videos through normal search-result pages.

### 6.5 General Browsing

The user can open arbitrary websites, navigate back and forward, use multiple tabs, download files, upload files, and handle permissions normally.

### 6.6 Publisher Discovery

The user can reach original websites from search results with minimal friction.

---

## 7. Product Principles

### 7.1 User Intent Comes First

The browser should follow the destination the user selected.

It must not silently force the user back into a previous search mode unless the user is attempting to enter a deliberately blocked AI-only mode.

### 7.2 Direct Sources Over Generated Answers

Whenever practical, the browser should route users toward source pages and traditional result lists.

### 7.3 Stability Over Cleverness

A simple, reliable implementation is better than a sophisticated implementation that breaks when Google changes its page markup.

### 7.4 Native Browser Behavior

The product should preserve standard browser expectations:

- page navigation
- cookies
- sessions
- authentication
- downloads
- file uploads
- permissions
- tabs
- history
- external links

### 7.5 Honest User Interface

The browser must not rename Google-owned UI elements in misleading ways.

If a feature is blocked, it should be blocked or redirected clearly rather than disguised.

### 7.6 Minimal Interference

The browser should intervene only where necessary to enforce the product mission.

Normal website behavior should remain untouched.

---

## 8. Core Features

### Required for Version 1

- Android browser experience
- native WebView-based browsing
- address/search bar
- normal web search
- image search
- news search
- video search
- multiple tabs
- back and forward navigation
- refresh and stop loading
- loading indicator
- bookmarks
- browsing history
- downloads
- file uploads
- external-link handling
- cookies and session persistence
- basic permission handling
- AI Mode URL blocking
- AI-free web-search URL generation
- stable error handling

### Strongly Preferred

- private browsing
- share page
- copy URL
- open in external browser
- configurable default search engine
- lightweight start page
- dark mode
- clear browsing data

---

## 9. Non-Goals

Human Browser is not intended to become:

- a full Chromium fork in the first release
- an AI assistant browser
- an AI chat product
- a Google Search clone
- a search-engine scraper
- a DOM-rewriting extension
- a content summarization product
- an ad network
- a proxy service
- a VPN service
- a server-dependent cloud browser

The product should not require a permanent backend merely to browse the web.

---

## 10. AI-Free Definition

For this product, "AI-free" means:

- app-originated Google web searches prefer non-AI result URLs
- Google AI Mode is blocked or redirected
- the browser does not add its own AI summaries
- the browser does not replace source pages with generated answers
- the browser does not intentionally promote AI-first search interfaces

It does not mean:

- every website is guaranteed to contain no AI-generated content
- every search-engine feature based on machine learning can be removed
- Google Lens can always be converted into a non-AI experience
- third-party sites are modified to remove AI content

The product must be honest about these limits.

---

## 11. Success Criteria

Version 1 is successful when:

- normal web search works reliably
- image, news, and video modes work
- AI Mode is not accessible as an active browsing mode
- the WebView does not remount during normal navigation
- search mode switching does not create loops
- CAPTCHA and consent pages render normally
- users can open arbitrary websites
- back and forward navigation remain reliable
- tabs remain stable
- downloads and uploads work
- the app launches and recovers from common errors
- the UI feels responsive on real Android devices

---

## 12. Product Quality Bar

A feature is not complete merely because it works once.

It is complete only when:

- it works repeatedly
- it does not break unrelated browser features
- it survives normal back/forward use
- it handles loading and error states
- it works on a real Android device
- it does not create visible navigation loops
- it does not require broad DOM hacks
- it has a clear fallback behavior

---

## 13. Product Priorities

Priority order:

1. Stability
2. Correct navigation
3. Search behavior
4. Performance
5. Reliability
6. Clear user interface
7. Privacy
8. Additional features
9. Visual polish
10. Experimental ideas

No visual improvement should be accepted if it reduces stability.

---

## 14. Release Strategy

### Phase 1: Stable Core

- browsing
- search
- modes
- tabs
- history
- bookmarks
- downloads
- error handling
- AI Mode blocking

### Phase 2: Product Polish

- loading experience
- improved tab UI
- settings
- private mode
- clear-data controls
- accessibility
- performance tuning

### Phase 3: Search Engine Flexibility

- Google adapter
- Bing adapter
- DuckDuckGo adapter
- Brave Search adapter
- Startpage or SearXNG support

### Phase 4: Advanced Browser Features

- reader mode
- content blocking
- sync
- import/export
- optional extension-like features

---

## 15. Founder-Level Product Rules

These rules require explicit founder approval before being changed:

- Human Browser remains AI-free in positioning.
- The product must remain usable without a paid backend.
- Search behavior must not depend on fragile DOM manipulation.
- The browser must preserve direct access to source websites.
- Engineers may not convert the product into an AI browser.
- Core navigation must take priority over feature expansion.
- A working stable version must be backed up before major changes.

---

## 16. Product Decision Test

Before adding any feature, ask:

1. Does this improve the direct web-browsing experience?
2. Does this preserve user control?
3. Does this make the browser more stable?
4. Does this reduce dependence on fragile implementation tricks?
5. Can this work without a permanent paid server?
6. Does this align with the AI-free mission?
7. Could this break tabs, navigation, downloads, permissions, or history?

If the answers are unclear, the feature should not be implemented yet.

---

## 17. Definition of Done

A product task is done only when:

- the requested behavior is implemented
- the behavior is tested on a real device
- regressions are checked
- relevant documentation is updated
- the current working version is backed up
- the task result can be reproduced by another engineer
- no unresolved blocker is hidden

---

## 18. Source of Truth

This file defines what the product is.

`ARCHITECTURE.md` defines how it is built.

`AGENTS.md` defines how AI engineers must work on it.

`DECISIONS.md` records important engineering decisions.

`TASKS.md` defines the current implementation work.

No AI engineer may redefine the product mission based on convenience.
