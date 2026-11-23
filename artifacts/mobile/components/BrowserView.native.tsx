import { Feather } from "@expo/vector-icons";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import WebView, { WebViewNavigation } from "react-native-webview";

export type BrowserViewHandle = {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stopLoading: () => void;
  injectScript: (script: string) => void;
};

export type BrowserError = {
  description: string;
  code: number;
  url: string;
};

type Props = {
  url: string;
  forceDarkMode?: boolean;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onLoadProgress?: (progress: number) => void;
  onCanGoBack?: (can: boolean) => void;
  onCanGoForward?: (can: boolean) => void;
  onNavigationRequest?: (url: string) => void;
  onError?: (err: BrowserError) => void;
  onAiHideResult?: (success: boolean) => void;
  onTextSelection?: (text: string) => void;
  onScrollAtTop?: (atTop: boolean) => void;
  onPullGesture?: (type: string, dy: number) => void;
  onPopupBlocked?: () => void;
  onDownloadRequest?: (url: string, filename: string) => void;
  onContextRequest?: (info: { kind: "link" | "image"; url: string }) => void;
  onPermissionRequest?: (req: {
    origin: string;
    resources: string[];
    grant: () => void;
    deny: () => void;
  }) => void;
  popupBlockEnabled?: boolean;
  customUserAgent?: string;
  firewallCheck?: (url: string) => boolean;
  extraInjectedJS?: string;
};

const BLOCKED_SCHEMES = ["javascript:", "data:", "file:", "intent:", "vbscript:", "blob:"];

// ─── Google AI element selectors ─────────────────────────────────────────────
const GOOGLE_AI_SELECTORS = [
  ".SOVli", ".M8OgIe", ".zxU76d", ".YyVfkd", ".I6TXqe", ".ULSxyf",
  ".Wt6efb", ".sATSHe", ".kHMNrc", ".OJXvsb", ".TQc1id", ".c2xzTb",
  ".pGEuQe", ".LLtSOc", ".oIk2Cb",
  "[jsname='rymPhb']",
  "[data-feature-id='GENERATIVE_AI_OVERVIEW']",
  "[data-content-feature='1']",
  "a[href*='udm=50']",
  "[data-name='AI Mode']",
  ".LFM2Fb",
  "[jsname='kEVIq']",
  "[data-async-type='ai_mode_entry']",
  ".XqA0Kb",
  "#m-x-content",
  "[data-attrid='AI Overview']",
  "[aria-label='AI Overview']",
  "[data-rl='ai_overview']",
  "[data-async-context*='ai_overview']",
  "[data-attnms]",
  ".Kevs9",
  "button[jsname='B6rgad']",
].join(",");

// Whole-container rules: remove the ENTIRE block/card (header + content), and the
// whole AI Mode tab item, so no blank slot or leftover metadata card remains.
const GOOGLE_AI_BLOCK_RULES = [
  "[data-hveid]:has(#m-x-content)",
  "[data-hveid]:has([data-attrid='AI Overview'])",
  "[data-hveid]:has([aria-label='AI Overview'])",
  "[data-hveid]:has([data-attnms])",
  "[data-hveid]:has([data-async-context*='ai_overview'])",
  "[data-hveid]:has([data-rl='ai_overview'])",
  ".iVzeVc:has([data-attrid='VisualDigestGeneratedDescription'])",
  "[role='tab']:has(a[href*='udm=50'])",
  "[role='tab']:has([data-async-type*='ai_mode'])",
  ".hdtb-mitem:has(a[href*='udm=50'])",
].join(",");

// ─── DuckDuckGo AI element selectors ─────────────────────────────────────────
const DDG_AI_SELECTORS = [
  // AI answer blocks in results
  ".dg-api-result",
  ".zci-wrapper",
  ".zci",
  "[data-testid='dg-result']",
  ".answer__title",
  ".answer",
  ".js-carousel",
  ".result--more--btn",
  ".ia-module",
  "[class*='AIAnswer']",
  "[class*='ai-result']",
  // AI Chat nav button in header
  "a[href='/chat']",
  "a[href*='duckduckgo.com/chat']",
  "[data-testid='duckbar-ai-chat']",
  ".nav-link--chat",
  ".nav--ai",
  ".header-nav--ai",
  // DuckAssist promo banners
  "[class*='duckassist']",
  "[class*='DuckAssist']",
].join(",");

// ─── Brave Search AI selectors ────────────────────────────────────────────────
const BRAVE_AI_SELECTORS = [
  // AI Summary block
  "#summarizer",
  ".answer-summary",
  ".snippet--faq",
  "[data-type='summarizer']",
  ".ai-answer",
  ".summarizer-answer",
  "[class*='Summarizer']",
  "[class*='summarizer']",
  ".infobox",
  // Leo AI chat button and sidebar
  "#show-leo-button",
  "#leo-sidebar",
  "#leo-panel",
  "#leo-main",
  ".show-leo-button",
  "[class*='LeoButton']",
  "[class*='leo-button']",
  "button[aria-label*='Leo']",
  "button[title*='Leo']",
  "[data-testid='leo-button']",
  // "Summarize with AI" action buttons
  "button[data-key='summarize']",
  "[class*='summarize-btn']",
].join(",");

// ─── Google AI hide script ────────────────────────────────────────────────────
// Strategy 1 (PRIMARY): Force udm=14 in URL — silently overrides history methods.
// Strategy 2 (BACKUP): CSS hide + continuous DOM monitoring.
const GOOGLE_AI_HIDE_SCRIPT = `
(function() {
  'use strict';
  try {
    // ─── Strategy 1: Force udm=14 in current URL ───
    function forceUdm14() {
      var u = window.location.href;
      if (!u || u.indexOf('google.') === -1) return;
      var cleaned = u.split('#')[0];
      var hash = u.split('#')[1] || '';
      var base = cleaned.split('?')[0];
      var qs = cleaned.split('?')[1] || '';
      var params = qs ? qs.split('&').filter(Boolean) : [];
      var hasUdm14 = false;
      var hasTbm = false;
      var hasExplicitUdm = false;
      var i, p, eq;
      var newParams = [];
      for (i = 0; i < params.length; i++) {
        p = params[i];
        eq = p.indexOf('=');
        var key = eq > -1 ? p.substring(0, eq) : p;
        var val = eq > -1 ? p.substring(eq + 1) : '';
        if (key === 'tbm' || key.indexOf('tbm') === 0) {
          hasTbm = true;
        }
      }
      for (i = 0; i < params.length; i++) {
        p = params[i];
        eq = p.indexOf('=');
        var key = eq > -1 ? p.substring(0, eq) : p;
        var val = eq > -1 ? p.substring(eq + 1) : '';
        if (key === 'udm' || key === 'udm ') {
          if (val === '14') { hasUdm14 = true; newParams.push(p); }
          else if (val === '50') { hasUdm14 = true; newParams.push('udm=14'); }
          else { hasExplicitUdm = true; newParams.push(p); }
        } else {
          newParams.push(p);
        }
      }
      // Only AI Mode (udm=50) is forced to Web mode (udm=14) above.
      // Explicit verticals (udm=2 Images, other udm values) and true "All"
      // (no udm / no tbm) are preserved exactly. Do NOT append udm=14 here:
      // that would rewrite Google's All tab into Web mode and trigger a
      // client re-render that wipes/intermittently rebuilds the results.
      var newQs = newParams.join('&');
      var newUrl = base + '?' + newQs + (hash ? '#' + hash : '');
      if (newUrl !== u && !window.__hwb_google_replacing) {
        window.__hwb_google_replacing = true;
        window.history.replaceState({}, '', newUrl);
        window.__hwb_google_replacing = false;
      }
    }
    forceUdm14();

    // ─── Override history.pushState / replaceState to inject udm=14 ───
    if (!window.__hwb_history_overridden) {
      window.__hwb_history_overridden = true;
      var origPushState = window.history.pushState;
      var origReplaceState = window.history.replaceState;
      function injectUdm14(url) {
        if (!url || typeof url !== 'string' || url.indexOf('google.') === -1) return url;
        try {
          var hash = url.split('#')[1] || '';
          var cleaned = url.split('#')[0];
          var base = cleaned.split('?')[0];
          var qs = cleaned.split('?')[1] || '';
          var params = qs ? qs.split('&').filter(Boolean) : [];
          var hasUdm14 = false;
          var hasTbm = false;
          var hasExplicitUdm = false;
          var newParams = [];
          for (var j = 0; j < params.length; j++) {
            var k = params[j].split('=')[0];
            if (k === 'tbm' || k.indexOf('tbm') === 0) {
              hasTbm = true;
            }
          }
          for (var j = 0; j < params.length; j++) {
            var k = params[j].split('=')[0];
            var v = params[j].split('=')[1];
            if (k === 'udm' || k === 'udm ') {
              if (v === '14') { hasUdm14 = true; newParams.push(params[j]); }
              else if (v === '50') { hasUdm14 = true; newParams.push('udm=14'); }
              else { hasExplicitUdm = true; newParams.push(params[j]); }
            } else {
              newParams.push(params[j]);
            }
          }
          // Only AI Mode (udm=50) is forced to Web mode above.
          // Google's "All" tab (no udm / no tbm) and explicit verticals are
          // preserved — do NOT append udm=14, or the SPA nav rewrites All into Web.
          var newQs = newParams.join('&');
          return base + '?' + newQs + (hash ? '#' + hash : '');
        } catch(e) { return url; }
      }
      window.history.pushState = function(state, unused, url) {
        if (typeof url === 'string') url = injectUdm14(url);
        return origPushState.call(this, state, unused, url);
      };
      window.history.replaceState = function(state, unused, url) {
        if (typeof url === 'string') url = injectUdm14(url);
        return origReplaceState.call(this, state, unused, url);
      };
      // Override onpopstate for back/forward
      var origOnPopState = window.onpopstate;
      window.onpopstate = function(event) {
        setTimeout(forceUdm14, 50);
        if (origOnPopState) return origOnPopState.apply(this, arguments);
      };
    }

    // ─── Strategy 2: CSS hide (backup) ───
    if (!document.getElementById('hwb-ai-hide')) {
      var s = document.createElement('style');
      s.id = 'hwb-ai-hide';
      s.textContent = ${JSON.stringify(GOOGLE_AI_SELECTORS + "," + GOOGLE_AI_BLOCK_RULES + "{display:none!important;}")};
      (document.head || document.documentElement).appendChild(s);
    }

    // ─── Hide the smallest safe AI Overview container of an AI element ───
    function hideAiBlock(el) {
      // Recipe: verify connected (a transient/mutating node may not be attached yet)
      if (!el || !el.style || !el.isConnected) return;
      var cur = el;
      var i = 0;
      while (cur && cur !== document.body && i < 15) {
        if (cur.id === 'search' || cur.id === 'main') break; // boundary: results area
        if (cur.getAttribute) {
          var al = cur.getAttribute('aria-label') || '';
          var ad = cur.getAttribute('data-attrid') || '';
          var ar = cur.getAttribute('data-rl') || '';
          var ac = cur.getAttribute('data-async-context') || '';
          // Hide ONLY at a confirmed AI container, then return immediately.
          if (cur.id === 'm-x-content' || al === 'AI Overview' || ad === 'AI Overview' || ar === 'ai_overview' || ac.indexOf('ai_overview') !== -1) {
            cur.style.setProperty('display', 'none', 'important');
            return;
          }
          // data-hveid is stamped on organic/related result cards (and shared
          // containers during transient DOM states). NEVER hide or climb across
          // it — that would hide normal All results and cause the incomplete /
          // "More search results" intermediate state. Treat it as a boundary.
          if (cur.getAttribute('data-hveid')) break;
        }
        cur = cur.parentElement;
        i++;
      }
      // No confirmed AI container above: hide only the matched element itself
      // (the smallest safe container for a direct AI-selector hit).
      el.style.setProperty('display', 'none', 'important');
    }

    // ─── Hide the whole AI Mode tab item (removes its slot, no blank gap) ───
    function hideAiTab(el) {
      if (!el || !el.style) return;
      var cur = el;
      var i = 0;
      while (cur && cur !== document.body && i < 8) {
        if (cur.getAttribute) {
          var role = cur.getAttribute('role');
          var dat = cur.getAttribute('data-async-type') || '';
          var cn = String(cur.className || '');
          if (role === 'tab' || dat.indexOf('ai_mode') !== -1 || cn.indexOf('hdtb-mitem') !== -1 || cn.indexOf('XqA0Kb') !== -1 || cn.indexOf('sATSHe') !== -1 || cn.indexOf('LFM2Fb') !== -1) {
            cur.style.setProperty('display', 'none', 'important');
            return;
          }
        }
        cur = cur.parentElement;
        i++;
      }
      el.style.setProperty('display', 'none', 'important');
    }

    // ─── Confirm an element sits inside a real AI container ───
    function findAiMarker(el) {
      var cur = el;
      var i = 0;
      while (cur && cur !== document.body && i < 15) {
        if (cur.id === 'search' || cur.id === 'main') return null;
        if (cur.getAttribute) {
          var al = cur.getAttribute('aria-label') || '';
          var ad = cur.getAttribute('data-attrid') || '';
          var ar = cur.getAttribute('data-rl') || '';
          var ac = cur.getAttribute('data-async-context') || '';
          var cn = String(cur.className || '');
          if (cur.id === 'm-x-content' || al === 'AI Overview' || ad === 'AI Overview' || ar === 'ai_overview' || ac.indexOf('ai_overview') !== -1 || cn.indexOf('Kevs9') !== -1 || cn.indexOf('SOVli') !== -1 || cn.indexOf('M8OgIe') !== -1 || cn.indexOf('I6TXqe') !== -1 || cn.indexOf('ULSxyf') !== -1) return cur;
          if (cur.getAttribute('data-hveid')) return null;
        }
        cur = cur.parentElement;
        i++;
      }
      return null;
    }

    // ─── Main hide pass ───
    function hideAi(root) {
      if (!root || !root.querySelectorAll) return;
      try {
        var els = root.querySelectorAll(${JSON.stringify(GOOGLE_AI_SELECTORS)});
        for (var i = 0; i < els.length; i++) {
          var el = els[i];
          var isTab = el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href').indexOf('udm=50') !== -1;
          var isTabEl = el.getAttribute('data-async-type') === 'ai_mode_entry' || el.getAttribute('data-name') === 'AI Mode' || el.getAttribute('jsname') === 'kEVIq' || el.getAttribute('jsname') === 'B6rgad' || String(el.className || '').indexOf('XqA0Kb') !== -1;
          if (isTab || isTabEl) { hideAiTab(el); } else { hideAiBlock(el); }
        }
        // Text fallback: only for headings/nav items, only inside confirmed AI containers
        var heads = root.querySelectorAll('h1,h2,h3,[role="tab"],.hdtb-mitem,[data-async-type]');
        for (var j = 0; j < heads.length; j++) {
          var h = heads[j];
          var txt = (h.textContent || '').trim();
          if (/^AI\s*Overview/i.test(txt)) {
            if (findAiMarker(h)) hideAiBlock(h);
          } else if (/^AI\s*Mode/i.test(txt)) {
            hideAiTab(h);
          }
        }
      } catch(e2) {}
    }

    hideAi(document.body);

    // Set up MutationObserver only once
    if (!window.__hwb_g_obs) {
      window.__hwb_g_obs = true;
      var t;
      new MutationObserver(function(ms) {
        clearTimeout(t);
        t = setTimeout(function() {
          ms.forEach(function(m) {
            m.addedNodes.forEach(function(n) {
              if (n.nodeType === 1) hideAi(n);
            });
          });
        }, 50);
      }).observe(document.body, { childList: true, subtree: true });
    }

    // Continuous monitoring for 5 seconds (10 × 500ms)
    var intervalCount = 0;
    var interval = setInterval(function() {
      try { hideAi(document.body); } catch(e) {}
      forceUdm14();
      if (++intervalCount >= 10) clearInterval(interval);
    }, 500);
  } catch(e) {
    // Silent failure
  }
})();
true;
`;

// ─── DuckDuckGo AI hide script ────────────────────────────────────────────────
const DDG_AI_HIDE_SCRIPT = `
(function() {
  'use strict';
  try {
    if (!document.getElementById('hwb-ddg-ai-hide')) {
      var s = document.createElement('style');
      s.id = 'hwb-ddg-ai-hide';
      s.textContent = ${JSON.stringify(DDG_AI_SELECTORS + "{ display:none!important; }")};
      (document.head || document.documentElement).appendChild(s);
    }

    function hideDDGAi(root) {
      if (!root || !root.querySelectorAll) return;
      try {
        // AI answer blocks
        var els = root.querySelectorAll('.dg-api-result,.zci,.zci-wrapper,.answer,.ia-module');
        for (var i = 0; i < els.length; i++) {
          els[i].style.setProperty('display', 'none', 'important');
        }
        // AI Chat nav button — find links pointing to /chat and hide them + parent nav item
        var chatLinks = root.querySelectorAll('a[href="/chat"],a[href*="duckduckgo.com/chat"],[data-testid="duckbar-ai-chat"]');
        for (var j = 0; j < chatLinks.length; j++) {
          var lnk = chatLinks[j];
          lnk.style.setProperty('display', 'none', 'important');
          if (lnk.parentElement) lnk.parentElement.style.setProperty('display', 'none', 'important');
        }
      } catch(e) {}
    }

    hideDDGAi(document.body);

    if (window.MutationObserver && !window.__hwb_ddg_obs) {
      window.__hwb_ddg_obs = true;
      var t;
      new MutationObserver(function(ms) {
        clearTimeout(t);
        t = setTimeout(function() {
          ms.forEach(function(m) {
            m.addedNodes.forEach(function(n) { if (n.nodeType === 1) hideDDGAi(n); });
          });
        }, 200);
      }).observe(document.body, { childList: true, subtree: true });
    }

    // Delayed second pass for late-rendered AI elements
    if (!window.__hwb_ddg_delayed) {
      window.__hwb_ddg_delayed = true;
      setTimeout(function() { try { hideDDGAi(document.body); } catch(e) {} }, 1500);
    }

    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'ai_hide', ok: true })
    );
  } catch(e) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'ai_hide', ok: false })
    );
  }
})();
true;
`;

// ─── Brave Search AI hide script ─────────────────────────────────────────────
const BRAVE_AI_HIDE_SCRIPT = `
(function() {
  'use strict';
  try {
    if (!document.getElementById('hwb-brave-ai-hide')) {
      var s = document.createElement('style');
      s.id = 'hwb-brave-ai-hide';
      s.textContent = ${JSON.stringify(BRAVE_AI_SELECTORS + "{ display:none!important; }")};
      (document.head || document.documentElement).appendChild(s);
    }

    function hideBraveAi(root) {
      if (!root || !root.querySelectorAll) return;
      try {
        // AI Summary blocks
        var els = root.querySelectorAll('#summarizer,.answer-summary,[data-type="summarizer"],.ai-answer,.summarizer-answer');
        for (var i = 0; i < els.length; i++) {
          els[i].style.setProperty('display', 'none', 'important');
        }
        // Leo AI button and sidebar — hide by ID, class, and aria-label
        var leoEls = root.querySelectorAll(
          '#show-leo-button,#leo-sidebar,#leo-panel,#leo-main,.show-leo-button,' +
          'button[aria-label*="Leo"],button[title*="Leo"],[data-testid="leo-button"]'
        );
        for (var j = 0; j < leoEls.length; j++) {
          leoEls[j].style.setProperty('display', 'none', 'important');
        }
      } catch(e) {}
    }

    hideBraveAi(document.body);

    if (window.MutationObserver && !window.__hwb_brave_obs) {
      window.__hwb_brave_obs = true;
      var t;
      new MutationObserver(function(ms) {
        clearTimeout(t);
        t = setTimeout(function() {
          ms.forEach(function(m) {
            m.addedNodes.forEach(function(n) { if (n.nodeType === 1) hideBraveAi(n); });
          });
        }, 200);
      }).observe(document.body, { childList: true, subtree: true });
    }

    // Delayed second pass for late-rendered Leo/Summary elements
    if (!window.__hwb_brave_delayed) {
      window.__hwb_brave_delayed = true;
      setTimeout(function() { try { hideBraveAi(document.body); } catch(e) {} }, 1500);
    }

    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'ai_hide', ok: true })
    );
  } catch(e) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'ai_hide', ok: false })
    );
  }
})();
true;
`;

// ─── Dark mode scripts ────────────────────────────────────────────────────────
// Uses CSS invert+hue-rotate, re-inverts images/video so they look normal.
// The style tag persists but SPAs may wipe head; the script checks and re-injects.
const DARK_MODE_ENTER_SCRIPT = `(function(){
  try {
    if (!document.getElementById('hwb-dark-filter')) {
      var s = document.createElement('style');
      s.id = 'hwb-dark-filter';
      s.textContent = 'html{filter:invert(1) hue-rotate(180deg)!important;background:#000!important;}' +
        'img,video,canvas,picture,svg,iframe,embed{filter:invert(1) hue-rotate(180deg)!important;}' +
        '[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important;}';
      (document.head || document.documentElement).appendChild(s);
    }
  } catch(e) {}
})();true;`;

const DARK_MODE_EXIT_SCRIPT = `(function(){try{var s=document.getElementById('hwb-dark-filter');if(s)s.remove();}catch(e){}})();true;`;

// Re-inject dark mode after SPA navigation (check if style tag got removed)
const DARK_MODE_RECHECK_SCRIPT = `(function(){
  try {
    if (!document.getElementById('hwb-dark-filter')) {
      var s = document.createElement('style');
      s.id = 'hwb-dark-filter';
      s.textContent = 'html{filter:invert(1) hue-rotate(180deg)!important;background:#000!important;}' +
        'img,video,canvas,picture,svg,iframe,embed{filter:invert(1) hue-rotate(180deg)!important;}' +
        '[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important;}';
      (document.head || document.documentElement).appendChild(s);
    }
  } catch(e) {}
})();true;`;

// ─── Text selection script ────────────────────────────────────────────────────
const TEXT_SELECTION_SCRIPT = `(function(){
  if(window.__hwb_sel_init)return;
  window.__hwb_sel_init=true;
  var t;
  document.addEventListener('selectionchange',function(){
    clearTimeout(t);
    t=setTimeout(function(){
      try{
        var sel=window.getSelection();
        var text=sel?sel.toString().trim():'';
        if(text.length>0&&text.length<2000){
          window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'selection',text:text}));
        } else if(!text||text.length===0){
          window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'selection',text:''}));
        }
      }catch(e){}
    },450);
  });
})();true;`;

// ─── YouTube AI element selectors ────────────────────────────────────────────
const YOUTUBE_AI_SELECTORS = [
  "#clarify-box",
  "ytd-rich-section-renderer",
  "[target-id='engagement-panel-summarizer']",
  "#engagement-panel-summarizer",
  "ytd-rich-metadata-renderer",
  "[class*='ai-chip']",
  "[aria-label*='AI']",
].join(",");

// ─── YouTube AI hide script ───────────────────────────────────────────────────
const YOUTUBE_AI_HIDE_SCRIPT = `
(function() {
  'use strict';
  try {
    if (!document.getElementById('hwb-yt-ai-hide')) {
      var s = document.createElement('style');
      s.id = 'hwb-yt-ai-hide';
      s.textContent = ${JSON.stringify(YOUTUBE_AI_SELECTORS + "{ display:none!important; }")};
      (document.head || document.documentElement).appendChild(s);
    }

    function hideYtAi(root) {
      if (!root || !root.querySelectorAll) return;
      try {
        var els = root.querySelectorAll('#clarify-box,[target-id="engagement-panel-summarizer"],ytd-rich-section-renderer');
        for (var i = 0; i < els.length; i++) {
          els[i].style.setProperty('display', 'none', 'important');
        }
      } catch(e) {}
    }

    hideYtAi(document.body);

    if (window.MutationObserver && !window.__hwb_yt_obs) {
      window.__hwb_yt_obs = true;
      var t;
      new MutationObserver(function(ms) {
        clearTimeout(t);
        t = setTimeout(function() {
          ms.forEach(function(m) {
            m.addedNodes.forEach(function(n) { if (n.nodeType === 1) hideYtAi(n); });
          });
        }, 300);
      }).observe(document.body, { childList: true, subtree: true });
    }

    if (!window.__hwb_yt_delayed) {
      window.__hwb_yt_delayed = true;
      setTimeout(function() { try { hideYtAi(document.body); } catch(e) {} }, 2000);
    }
  } catch(e) {}
})();
true;
`;


// ─── Scroll position tracking script ─────────────────────────────────────────
// Posts {type:'scrolltop',atTop:bool} when scroll crosses the top boundary.
const SCROLL_TRACK_SCRIPT = `(function(){
  if(window.__hwb_scroll_track)return;
  window.__hwb_scroll_track=true;
  function report(atTop){
    try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'scrolltop',atTop:atTop}));}catch(e){}
  }
  var lastAtTop=window.scrollY<=8;
  report(lastAtTop);
  window.addEventListener('scroll',function(){
    var now=window.scrollY<=8;
    if(now!==lastAtTop){lastAtTop=now;report(now);}
  },{passive:true});
})();true;`;

// ─── Pull-to-refresh gesture detection script ─────────────────────────────────
// Detects deliberate downward pull at the top of the page.
// Sends {type:'pull',dy:N}, {type:'pull_end'}, {type:'pull_cancel'} messages.
// Only activates when scrollY <= 2 and touch is moving downward.
const PULL_DETECT_SCRIPT = `(function(){
  if(window.__hwb_pull_init)return;
  window.__hwb_pull_init=true;
  var startY=0,lastDy=-1,tracking=false;
  function send(type,dy){
    try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:type,dy:dy||0}));}catch(e){}
  }
  document.addEventListener('touchstart',function(e){
    if(window.scrollY<=2&&e.touches.length===1){
      startY=e.touches[0].clientY;lastDy=-1;tracking=true;
    }else{tracking=false;}
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    if(!tracking||e.touches.length!==1)return;
    if(window.scrollY>2){tracking=false;send('pull_cancel',0);return;}
    var dy=e.touches[0].clientY-startY;
    if(dy<=0){tracking=false;send('pull_cancel',0);return;}
    if(Math.abs(dy-lastDy)>=3){lastDy=dy;send('pull',dy);}
  },{passive:true});
  document.addEventListener('touchend',function(){
    if(tracking){tracking=false;send('pull_end',0);}
  },{passive:true});
  document.addEventListener('touchcancel',function(){
    if(tracking){tracking=false;send('pull_cancel',0);}
  },{passive:true});
})();true;`;

// ─── Popup blocker script ─────────────────────────────────────────────────────
// Blocks window.open() popups — the primary source of popup ads.
const POPUP_BLOCK_SCRIPT = `(function(){
  if(window.__hwb_popup_init)return;
  window.__hwb_popup_init=true;
  window.open=function(){
    try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'popup_blocked'}));}catch(e){}
    return null;
  };
})();true;`;

// ─── Download link detection script ──────────────────────────────────────────
// Intercepts clicks on <a download> links and known file-type links.
// Anchors that are part of media playback UI (inside <video>/<audio>/<picture>)
// are left alone — intercepting them breaks inline media pages and players.
const DOWNLOAD_DETECT_SCRIPT = `(function(){
  if(window.__hwb_dl_init)return;
  window.__hwb_dl_init=true;
  var exts=['.pdf','.zip','.apk','.ipa','.mp3','.mp4','.avi','.mov','.mkv','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.csv','.rar','.7z','.tar','.gz','.epub','.wav','.ogg','.flac','.exe','.dmg','.deb'];
  document.addEventListener('click',function(e){
    var el=e.target;
    for(var i=0;i<8&&el;i++){
      if(el.tagName==='A'){
        var href=el.href||'';
        if(!href)break;
        if(el.closest&&el.closest('video,audio,picture'))break;
        var dl=el.getAttribute('download')||'';
        var lower=href.toLowerCase().split('?')[0];
        if(dl||exts.some(function(x){return lower.endsWith(x);})){
          e.preventDefault();
          e.stopPropagation();
          try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'download',url:href,filename:dl||''}));}catch(err){}
        }
        break;
      }
      el=el.parentElement;
    }
  },true);
})();true;`;

// ─── Long-press context menu script ───────────────────────────────────────────
// A 500ms hold on a link or image posts {type:'context',kind,url} so the app
// can show a context menu. Long-press on text is left to the native text
// selection flow (SelectionSheet). Media elements keep native behavior.
const LONG_PRESS_SCRIPT = `(function(){
  if(window.__hwb_lp_init)return;
  window.__hwb_lp_init=true;
  var HOLD_MS=500;
  var t=null,x=0,y=0,active=false;
  function cancel(){
    active=false;
    if(t){clearTimeout(t);t=null;}
  }
  document.addEventListener('touchstart',function(e){
    if(e.touches.length!==1)return;
    cancel();
    active=true;
    var touch=e.touches[0];
    x=touch.clientX;y=touch.clientY;
    t=setTimeout(function(){
      t=null;
      if(!active)return;
      active=false;
      var el=document.elementFromPoint(x,y);
      for(var i=0;i<8&&el;i++){
        if(el.tagName==='VIDEO'||el.tagName==='AUDIO'||el.tagName==='CANVAS'||el.tagName==='PICTURE')break;
        if(el.tagName==='A'||el.tagName==='IMG'){
          var url=el.tagName==='IMG'?(el.currentSrc||el.src||''):(el.href||'');
          if(url){
            try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'context',kind:el.tagName==='IMG'?'image':'link',url:url}));}catch(err){}
            try{var s=window.getSelection();if(s&&s.removeAllRanges)s.removeAllRanges();}catch(err2){}
          }
          break;
        }
        el=el.parentElement;
      }
    },HOLD_MS);
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    if(!active||e.touches.length!==1)return;
    var touch=e.touches[0];
    if(Math.abs(touch.clientX-x)>12||Math.abs(touch.clientY-y)>12)cancel();
  },{passive:true});
  document.addEventListener('touchend',cancel);
  document.addEventListener('touchcancel',cancel);
})();true;`;

// ─── Download URL helpers ─────────────────────────────────────────────────────
const DOWNLOAD_EXTENSIONS = [
  "pdf","zip","apk","ipa","mp3","mp4","avi","mov","mkv",
  "doc","docx","xls","xlsx","ppt","pptx","csv",
  "rar","7z","tar","gz","bz2","epub","wav","ogg","flac",
  "exe","dmg","deb","rpm","msi",
];

function isDownloadUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase().split("?")[0];
    return DOWNLOAD_EXTENSIONS.some((ext) => pathname.endsWith("." + ext));
  } catch {
    return false;
  }
}

function getFilenameFromUrl(url: string): string {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const parts = pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "download";
  } catch {
    return "download";
  }
}

// ─── URL classifiers ──────────────────────────────────────────────────────────
function isGoogleSearch(url: string): boolean {
  return /^https?:\/\/(?:www\.)?google\.[a-z.]+\/search/i.test(url);
}

function isDDGSearch(url: string): boolean {
  return /^https?:\/\/(?:noai\.|www\.)?duckduckgo\.com\/\?/i.test(url);
}

function isBraveSearch(url: string): boolean {
  return /^https?:\/\/search\.brave\.com\/search/i.test(url);
}

function isYouTube(url: string): boolean {
  return /^https?:\/\/(?:www\.)?youtube\.com/i.test(url);
}

function isSensitivePage(url: string): boolean {
  return /accounts\.google\.|pay\.google\.|checkout\.|\/login|\/signin|\/password|\/auth/i.test(url);
}

// ─── BrowserView component ────────────────────────────────────────────────────
export const BrowserView = forwardRef<BrowserViewHandle, Props>((props, ref) => {
  const {
    url,
    forceDarkMode,
    onUrlChange,
    onTitleChange,
    onTextSelection,
    onScrollAtTop,
    onPullGesture,
    onPopupBlocked,
    onDownloadRequest,
    onContextRequest,
    onPermissionRequest,
    popupBlockEnabled,
    customUserAgent,
    firewallCheck,
    extraInjectedJS,
    onLoadStart,
    onLoadEnd,
    onLoadProgress,
    onCanGoBack,
    onCanGoForward,
    onNavigationRequest,
    onError,
    onAiHideResult,
  } = props;

  // react-native-webview 14 declares `class WebView<P = undefined>` so the
  // default props resolve to `WebViewProps & undefined` = never. Supplying the
  // `{}` type argument restores the v13 default and real prop typing.
  const webViewRef = useRef<WebView<{}>>(null);
  const popupBlockEnabledRef = useRef(popupBlockEnabled);
  popupBlockEnabledRef.current = popupBlockEnabled;
  const firewallCheckRef = useRef(firewallCheck);
  firewallCheckRef.current = firewallCheck;
  const extraInjectedJSRef = useRef(extraInjectedJS);
  extraInjectedJSRef.current = extraInjectedJS;
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<BrowserError | null>(null);
  const currentUrlRef = useRef(url);
  const prevSourceUrlRef = useRef(url);
  const forceDarkModeRef = useRef(forceDarkMode);
  forceDarkModeRef.current = forceDarkMode;

  useEffect(() => {
    if (prevSourceUrlRef.current !== url) {
      prevSourceUrlRef.current = url;
      setHasError(false);
      setErrorInfo(null);
    }
  }, [url]);

  useImperativeHandle(ref, () => ({
    goBack: () => webViewRef.current?.goBack(),
    goForward: () => webViewRef.current?.goForward(),
    reload: () => {
      setHasError(false);
      setErrorInfo(null);
      webViewRef.current?.reload();
    },
    stopLoading: () => webViewRef.current?.stopLoading(),
    injectScript: (script: string) => {
      try { webViewRef.current?.injectJavaScript(script); } catch {}
    },
  }));

  function injectPageScripts(curUrl: string) {
    // Title
    webViewRef.current?.injectJavaScript(
      `try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'title',title:document.title||''}))}catch(e){}; true;`
    );

    // AI hiding — run for the right engine / site
    if (!isSensitivePage(curUrl)) {
      if (isGoogleSearch(curUrl)) {
        webViewRef.current?.injectJavaScript(GOOGLE_AI_HIDE_SCRIPT);
      } else if (isDDGSearch(curUrl)) {
        webViewRef.current?.injectJavaScript(DDG_AI_HIDE_SCRIPT);
      } else if (isBraveSearch(curUrl)) {
        webViewRef.current?.injectJavaScript(BRAVE_AI_HIDE_SCRIPT);
      } else if (isYouTube(curUrl)) {
        webViewRef.current?.injectJavaScript(YOUTUBE_AI_HIDE_SCRIPT);
      }
    }

    // Dark mode — inject or recheck
    if (forceDarkModeRef.current) {
      webViewRef.current?.injectJavaScript(DARK_MODE_RECHECK_SCRIPT);
    }

    // Text selection listener
    webViewRef.current?.injectJavaScript(TEXT_SELECTION_SCRIPT);

    // Scroll position tracking
    webViewRef.current?.injectJavaScript(SCROLL_TRACK_SCRIPT);

    // Pull-to-refresh gesture detection
    webViewRef.current?.injectJavaScript(PULL_DETECT_SCRIPT);

    // Popup blocker
    if (popupBlockEnabledRef.current) {
      webViewRef.current?.injectJavaScript(POPUP_BLOCK_SCRIPT);
    }

    // Download link interception
    webViewRef.current?.injectJavaScript(DOWNLOAD_DETECT_SCRIPT);

    // Long-press context menu (links / images)
    webViewRef.current?.injectJavaScript(LONG_PRESS_SCRIPT);

    // Extension injected scripts (CSS/JS via ExtensionsContext)
    const extraJS = extraInjectedJSRef.current;
    if (extraJS) {
      webViewRef.current?.injectJavaScript(extraJS);
    }
  }

function handleNavChange(state: WebViewNavigation) {
    
    currentUrlRef.current = state.url;
    if (state.url) onUrlChange?.(state.url);
    onCanGoBack?.(state.canGoBack);
    onCanGoForward?.(state.canGoForward);

    // Re-inject AI hide script immediately on SPA navigation (before full load fires)
    // This keeps the history.pushState override alive when Google navigates internally
    if (state.url && isGoogleSearch(state.url) && !isSensitivePage(state.url)) {
      webViewRef.current?.injectJavaScript(GOOGLE_AI_HIDE_SCRIPT);
    }

    // Re-inject dark mode immediately on SPA navigation (before full load fires)
    // This keeps dark mode alive when Google/DDG navigate internally
    if (forceDarkModeRef.current && state.url) {
      webViewRef.current?.injectJavaScript(DARK_MODE_RECHECK_SCRIPT);
    }
  }

  function handleLoad() {
    setHasError(false);
    onLoadEnd?.();
    injectPageScripts(currentUrlRef.current);
  }

  function handleMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (__DEV__ && ["download", "popup_blocked", "context"].includes(data.type)) {
        console.log(`[WEBVIEW-MSG] type: ${data.type} url: ${String(data.url ?? "")}`);
      }
      if (data.type === "ai_hide") {
        onAiHideResult?.(Boolean(data.ok));
      } else if (data.type === "title" && data.title) {
        onTitleChange?.(String(data.title));
      } else if (data.type === "selection") {
        onTextSelection?.(String(data.text ?? ""));
      } else if (data.type === "scrolltop") {
        onScrollAtTop?.(Boolean(data.atTop));
      } else if (data.type === "pull" || data.type === "pull_end" || data.type === "pull_cancel") {
        onPullGesture?.(String(data.type), Number(data.dy || 0));
      } else if (data.type === "popup_blocked") {
        onPopupBlocked?.();
      } else if (data.type === "download") {
        const dlUrl = String(data.url ?? "");
        const dlFilename = String(data.filename ?? "");
        if (dlUrl) onDownloadRequest?.(dlUrl, dlFilename);
      } else if (data.type === "context") {
        const ctxUrl = String(data.url ?? "");
        if (ctxUrl) onContextRequest?.({ kind: data.kind === "image" ? "image" : "link", url: ctxUrl });
      }
    } catch {}
  }

  function handleShouldStartLoad(req: any): boolean {
    const reqUrl = req.url ?? "";
    
    const lower = reqUrl.toLowerCase();

    // Block dangerous schemes
    for (const scheme of BLOCKED_SCHEMES) {
      if (lower.startsWith(scheme)) return false;
    }

    // NexusShield firewall check
    if (firewallCheckRef.current?.(reqUrl)) return false;

    // Intercept download URLs — hand off to download manager
    if (isDownloadUrl(reqUrl)) {
      onDownloadRequest?.(reqUrl, getFilenameFromUrl(reqUrl));
      return false;
    }

    if (isGoogleSearch(reqUrl)) {
      // If AI Mode (udm=50) is present, force Web Mode (udm=14).
      // Explicit vertical modes (udm=2 Images, tbm=...) and the default
      // "All" tab (no udm param) must be allowed through — that is how
      // Google's tab bar behaves in a real browser.
      if (reqUrl.includes("udm=50")) {
        const corrected = reqUrl.replace(/udm=50/g, "udm=14");
        onNavigationRequest?.(corrected);
        return false;
      }
    }

    
    return true;
  }

  function handleError(event: any) {
    const code = event.nativeEvent?.code ?? -1;
    const statusCode = event.nativeEvent?.statusCode;
    const errUrl = event.nativeEvent?.url ?? url;
    if (__DEV__) {
      console.log(
        `[WEBVIEW-ERROR] code: ${code} status: ${statusCode ?? "-"} url: ${errUrl}` +
          (code === -3 ? " (ERR_ABORTED ignored)" : "")
      );
    }
    if (code === -3) {
      onLoadEnd?.();
      return;
    }
    const err: BrowserError = {
      description:
        event.nativeEvent?.description ??
        (statusCode ? `The page returned HTTP ${statusCode}` : "Failed to load page"),
      code,
      url: errUrl,
    };
    setHasError(true);
    setErrorInfo(err);
    onLoadEnd?.();
    onError?.(err);
  }

  if (hasError && errorInfo) {
    return (
      <View style={styles.error}>
        <View style={styles.errorIcon}>
          <Feather name="wifi-off" size={36} color="#6B6B80" />
        </View>
        <Text style={styles.errorTitle}>Can't reach this page</Text>
        <Text style={styles.errorMsg} numberOfLines={4}>{errorInfo.description}</Text>
        <Text style={styles.errorUrl} numberOfLines={2}>{errorInfo.url}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => {
            setHasError(false);
            setErrorInfo(null);
            webViewRef.current?.reload();
          }}
        >
          <Feather name="refresh-cw" size={13} color="#7B5CFF" />
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <WebView<{}>
      ref={webViewRef}
      source={{ uri: url }}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      injectedJavaScriptBeforeContentLoaded={
        isGoogleSearch(url) && !isSensitivePage(url) ? GOOGLE_AI_HIDE_SCRIPT : undefined
      }
      onNavigationStateChange={handleNavChange}
      onLoadStart={onLoadStart}
      onLoad={handleLoad}
      onLoadProgress={({ nativeEvent }) => onLoadProgress?.(nativeEvent.progress)}
      onError={handleError}
      onHttpError={(event) => {
        // HTTP status errors (403/429 challenge pages, consent interstitials,
        // 404s) are still renderable pages — replacing them with the error
        // screen destroyed Google anti-bot challenges and consent pages.
        // The native error UI is reserved for genuine network failures (onError).
        if (__DEV__) {
          console.log(`[WEBVIEW-HTTP] status: ${event.nativeEvent.statusCode} url: ${event.nativeEvent.url}`);
        }
      }}
      onShouldStartLoadWithRequest={handleShouldStartLoad}
      onMessage={handleMessage}
      // @ts-expect-error — onPermissionRequest exists on Android WebView but is absent from community types
      onPermissionRequest={(event: any) => {
        const ne = event.nativeEvent ?? {};
        onPermissionRequest?.({
          origin: ne.origin ?? "unknown",
          resources: ne.resources ?? [],
          grant: () => { try { ne.grant?.(ne.resources ?? []); } catch {} },
          deny: () => { try { ne.deny?.(); } catch {} },
        });
      }}
      style={styles.webview}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      cacheEnabled
      nestedScrollEnabled
      overScrollMode="never"
      directionalLockEnabled
      userAgent={customUserAgent ?? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"}
      androidLayerType="hardware"
    />
  );
});

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#FFFFFF" },
  error: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#14141F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  errorTitle: { color: "#EEEEFF", fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  errorMsg: { color: "#5A5A78", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  errorUrl: { color: "#7B5CFF", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#14141F",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryText: { color: "#7B5CFF", fontSize: 13, fontFamily: "Inter_500Medium" },
});
