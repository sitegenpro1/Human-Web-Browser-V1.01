import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { safeGet, safeSet } from "@/lib/safeStorage";
import { generateId } from "@/lib/generateId";

export type BuiltInExtId =
  | "cookie_banner_eraser"
  | "focus_mode"
  | "anti_autoplay"
  | "no_comments"
  | "slim_mode"
  | "smooth_scroll"
  | "highlight_links"
  | "large_text";

export type CustomScript = {
  id: string;
  name: string;
  domain: string;
  css: string;
  js: string;
  enabled: boolean;
  createdAt: string;
};

type ExtensionsContextValue = {
  builtIns: Record<BuiltInExtId, boolean>;
  customScripts: CustomScript[];
  toggleBuiltIn: (id: BuiltInExtId) => void;
  addScript: (name: string, domain: string, css: string, js: string) => void;
  updateScript: (id: string, changes: Partial<CustomScript>) => void;
  deleteScript: (id: string) => void;
  getInjectedJS: (currentUrl: string) => string;
};

const ExtensionsContext = createContext<ExtensionsContextValue | null>(null);
const KEY = "hwb_extensions_v1";

const BUILT_IN_JS: Record<BuiltInExtId, string> = {
  cookie_banner_eraser: `(function(){
    var css=document.createElement('style');
    css.id='hwb-cookie-eraser';
    css.textContent=[
      '[class*="cookie"],[class*="Cookie"],[id*="cookie"],[id*="Cookie"]',
      '[class*="consent"],[class*="Consent"],[id*="consent"]',
      '[class*="gdpr"],[class*="GDPR"],[id*="gdpr"]',
      '[class*="banner"i][class*="cookie"i]',
      '[class*="notice"i][class*="privac"i]',
      '[class*="overlay"i][class*="cookie"i]',
      '.cc-banner,.cc-window,.cc-overlay,.cc-revoke',
      '#cookiebanner,#cookie-banner,#cookieConsent,#cookie-consent',
      '.cookiebanner,.cookie-banner,.cookie-notice,.cookie-law',
      '[data-testid*="cookie"],[data-cy*="cookie"]',
    ].join(',') + '{display:none!important;opacity:0!important;pointer-events:none!important;}';
    (document.head||document.documentElement).appendChild(css);
    document.body&&(document.body.style.setProperty('overflow','auto','important'));
  })();`,

  focus_mode: `(function(){
    var css=document.createElement('style');
    css.id='hwb-focus-mode';
    css.textContent=[
      '[class*="sidebar"],[class*="Sidebar"],[id*="sidebar"]',
      '[class*="recommend"],[class*="suggested"],[class*="related"]',
      '[class*="trending"],[class*="popular"]',
      '[class*="widget"],[class*="Widget"]',
      '[class*="newsletter"],[class*="subscribe"]',
      '[class*="promo"],[class*="promotion"]',
      'aside:not([role="main"]):not([aria-label*="main"])',
    ].join(',') + '{display:none!important;}';
    (document.head||document.documentElement).appendChild(css);
  })();`,

  anti_autoplay: `(function(){
    function pauseAll(){
      document.querySelectorAll('video,audio').forEach(function(m){
        try{if(!m.paused&&!m.muted)m.pause();}catch(e){}
      });
    }
    pauseAll();
    if(!window.__hwb_autoplay_obs){
      window.__hwb_autoplay_obs=true;
      new MutationObserver(function(){pauseAll();}).observe(document.body||document.documentElement,{childList:true,subtree:true});
    }
  })();`,

  no_comments: `(function(){
    var css=document.createElement('style');
    css.id='hwb-no-comments';
    css.textContent=[
      '#comments,#comment-section,.comments,.comment-section',
      '.comments-area,.comment-list,#disqus_thread,.disqus-thread',
      '[class*="comment"][class*="section"],[id*="comment"][id*="section"]',
      '[class*="replies"],[class*="discussion"]',
    ].join(',') + '{display:none!important;}';
    (document.head||document.documentElement).appendChild(css);
  })();`,

  slim_mode: `(function(){
    var css=document.createElement('style');
    css.id='hwb-slim-mode';
    css.textContent='article,main,[role="main"],p{max-width:800px!important;}img{max-width:100%!important;height:auto!important;}'+
      'body{overflow-x:hidden!important;}[class*="ad"],[class*="Ad"],[id*="ad"],[id*="Ad"]{min-height:0!important;max-height:4px!important;overflow:hidden!important;opacity:0.2!important;}';
    (document.head||document.documentElement).appendChild(css);
  })();`,

  smooth_scroll: `(function(){
    if(!document.getElementById('hwb-smooth-scroll')){
      var css=document.createElement('style');
      css.id='hwb-smooth-scroll';
      css.textContent='html{scroll-behavior:smooth!important;}';
      (document.head||document.documentElement).appendChild(css);
    }
  })();`,

  highlight_links: `(function(){
    var css=document.createElement('style');
    css.id='hwb-highlight-links';
    css.textContent='a:hover{outline:2px solid rgba(123,92,255,0.6)!important;outline-offset:2px!important;border-radius:2px!important;}';
    (document.head||document.documentElement).appendChild(css);
  })();`,

  large_text: `(function(){
    var css=document.createElement('style');
    css.id='hwb-large-text';
    css.textContent='body,p,li,td,span:not([class*="icon"]):not([class*="Icon"]){font-size:17px!important;line-height:1.7!important;}h1{font-size:26px!important;}h2{font-size:22px!important;}h3{font-size:19px!important;}';
    (document.head||document.documentElement).appendChild(css);
  })();`,
};

export const BUILT_IN_META: Record<BuiltInExtId, { name: string; desc: string; icon: string; color: string }> = {
  cookie_banner_eraser: { name: "Cookie Banner Eraser", desc: "Removes cookie consent popups automatically", icon: "x-circle", color: "#00D4A0" },
  focus_mode: { name: "Focus Mode", desc: "Hides sidebars, recommendations, and distractions", icon: "crosshair", color: "#7B5CFF" },
  anti_autoplay: { name: "Anti-Autoplay", desc: "Prevents videos and audio from auto-playing", icon: "pause-circle", color: "#FFB020" },
  no_comments: { name: "No Comments", desc: "Hides comment sections on all sites", icon: "message-square", color: "#5A5A78" },
  slim_mode: { name: "Slim Mode", desc: "Removes excess whitespace and improves layout", icon: "minimize-2", color: "#4FC3F7" },
  smooth_scroll: { name: "Smooth Scroll", desc: "Makes page scrolling silky smooth", icon: "arrow-down", color: "#AED581" },
  highlight_links: { name: "Link Highlighter", desc: "Highlights links on hover for easier navigation", icon: "link", color: "#F06292" },
  large_text: { name: "Large Text Mode", desc: "Increases font size for better readability", icon: "type", color: "#FF9500" },
};

export function ExtensionsProvider({ children }: { children: React.ReactNode }) {
  const [builtIns, setBuiltIns] = useState<Record<BuiltInExtId, boolean>>({
    cookie_banner_eraser: true,
    focus_mode: false,
    anti_autoplay: false,
    no_comments: false,
    slim_mode: false,
    smooth_scroll: true,
    highlight_links: false,
    large_text: false,
  });
  const [customScripts, setCustomScripts] = useState<CustomScript[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    safeGet<{ builtIns: Record<BuiltInExtId, boolean>; scripts: CustomScript[] } | null>(KEY, null).then((stored) => {
      if (stored) {
        setBuiltIns((prev) => ({ ...prev, ...(stored.builtIns ?? {}) }));
        setCustomScripts(Array.isArray(stored.scripts) ? stored.scripts : []);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    safeSet(KEY, { builtIns, scripts: customScripts });
  }, [builtIns, customScripts, loaded]);

  const toggleBuiltIn = useCallback((id: BuiltInExtId) => {
    setBuiltIns((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const addScript = useCallback((name: string, domain: string, css: string, js: string) => {
    const script: CustomScript = {
      id: generateId(),
      name,
      domain: domain.trim() || "*",
      css,
      js,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    setCustomScripts((prev) => [script, ...prev]);
  }, []);

  const updateScript = useCallback((id: string, changes: Partial<CustomScript>) => {
    setCustomScripts((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }, []);

  const deleteScript = useCallback((id: string) => {
    setCustomScripts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getInjectedJS = useCallback((currentUrl: string): string => {
    const parts: string[] = [];

    for (const [id, enabled] of Object.entries(builtIns) as [BuiltInExtId, boolean][]) {
      if (enabled && BUILT_IN_JS[id]) {
        parts.push(BUILT_IN_JS[id]);
      }
    }

    const domain = (() => {
      try {
        let h = new URL(currentUrl).hostname;
        if (h.startsWith("www.")) h = h.slice(4);
        return h;
      } catch { return ""; }
    })();

    for (const script of customScripts) {
      if (!script.enabled) continue;
      const matches = script.domain === "*" || (domain && domain.includes(script.domain));
      if (!matches) continue;
      if (script.css) {
        parts.push(`(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(script.css)};(document.head||document.documentElement).appendChild(s);})();`);
      }
      if (script.js) {
        parts.push(`(function(){try{${script.js}}catch(e){console.error('[HWB Custom Script Error]',e);}})();`);
      }
    }

    return parts.length > 0 ? parts.join("\n") + "\ntrue;" : "";
  }, [builtIns, customScripts]);

  const value = useMemo(() => ({
    builtIns, customScripts, toggleBuiltIn, addScript, updateScript, deleteScript, getInjectedJS,
  }), [builtIns, customScripts, toggleBuiltIn, addScript, updateScript, deleteScript, getInjectedJS]);

  return <ExtensionsContext.Provider value={value}>{children}</ExtensionsContext.Provider>;
}

export function useExtensions() {
  const ctx = useContext(ExtensionsContext);
  if (!ctx) throw new Error("useExtensions must be used inside ExtensionsProvider");
  return ctx;
}
