// Shared iframe HTML builder — used by WorkspacePanel and inline chat preview

const BASE_STYLES = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #faf7f2; --surface: #fff; --border: #e2d8cc;
  --text: #1a1714; --muted: #78716c; --accent: #c2714f;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
}
body { font-family: var(--font); font-size: 14px; line-height: 1.6; color: var(--text); background: var(--bg); overflow: hidden; }
#root { }
h1,h2,h3,h4 { font-weight: 700; line-height: 1.3; color: var(--text); }
h1 { font-size: 1.5rem; margin-bottom: .7rem; }
h2 { font-size: 1.2rem; margin-bottom: .5rem; }
h3 { font-size: 1rem; margin-bottom: .4rem; }
p  { margin-bottom: .7rem; color: #44403c; }
a  { color: var(--accent); }
pre, code { font-family: ui-monospace, monospace; font-size: .85em; background: #f0ebe3; border-radius: 5px; }
pre  { padding: .85rem 1rem; overflow-x: auto; border: 1px solid var(--border); }
code { padding: .15em .4em; }
table { border-collapse: collapse; width: 100%; }
th { background: #f0ebe3; font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); padding: .55rem .9rem; text-align: left; border-bottom: 1px solid var(--border); }
td { padding: .5rem .9rem; border-bottom: 1px solid #ede8e0; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(0,0,0,.018); }
button { cursor: pointer; font-family: inherit; font-size: .875rem; padding: .4rem .9rem; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); transition: background .15s; }
button:hover { background: #f0ebe3; }
input, select, textarea { font-family: inherit; font-size: .875rem; padding: .4rem .7rem; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); outline: none; width: 100%; }
input:focus, select:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(194,113,79,.12); }
/* Bar helpers — Claude generates these class names */
.bar-track { background: #e8e0d4; border-radius: 6px; height: 26px; overflow: hidden; }
.bar-fill  { height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 10px; }
.bar-label { color: #fff; font-size: 11px; font-weight: 600; white-space: nowrap; }
`;

// Injected after render — animates vertical bars (height) and horizontal fills (width)
const ANIMATE_SCRIPT = `
<script>
(function() {
  var EASE = 'cubic-bezier(0.34, 1.15, 0.64, 1)';
  var BASE_DELAY = 60;
  var STAGGER = 80;

  function animateBars() {
    var idx = 0;

    // ── 1. Vertical columns: elements with class "v-bar" or data-height attr ──
    var vBars = document.querySelectorAll('.v-bar, [data-height]');
    vBars.forEach(function(el) {
      if (el._barAnimated) return;
      el._barAnimated = true;
      var targetH = el.dataset.height
        ? (el.dataset.height + 'px')
        : el.style.height;
      if (!targetH || targetH === '0px') return;
      el.style.transition = 'none';
      el.style.height = '0px';
      var delay = BASE_DELAY + idx * STAGGER;
      idx++;
      setTimeout(function() {
        el.style.transition = 'height 0.65s ' + EASE;
        el.style.height = targetH;
      }, delay);
    });

    // ── 2. Horizontal fills: .bar-fill or divs with % width + fixed height ──
    var hFills = document.querySelectorAll('.bar-fill, .bar-fill *');
    hFills.forEach(function(el) {
      if (el._barAnimated) return;
      el._barAnimated = true;
      var target = el.style.width || '0%';
      if (!target || target === '0%') return;
      el.style.transition = 'none';
      el.style.width = '0%';
      var delay = BASE_DELAY + idx * STAGGER;
      idx++;
      setTimeout(function() {
        el.style.transition = 'width 0.65s ' + EASE;
        el.style.width = target;
      }, delay);
    });

    // ── 3. Fallback: any div with inline % width + px height (horizontal bar pattern) ──
    if (idx === 0) {
      var all = document.querySelectorAll('[style*="width"]');
      Array.from(all).forEach(function(el) {
        if (el._barAnimated) return;
        var w = el.style.width;
        var h = el.style.height;
        if (!w || !w.endsWith('%') || parseFloat(w) === 0) return;
        if (!h || h.endsWith('%')) return;
        el._barAnimated = true;
        var target = w;
        el.style.transition = 'none';
        el.style.width = '0%';
        var delay = BASE_DELAY + idx * STAGGER;
        idx++;
        setTimeout(function() {
          el.style.transition = 'width 0.65s ' + EASE;
          el.style.width = target;
        }, delay);
      });
    }
  }

  // Wait for React/Babel to finish mounting before animating
  var wait = document.readyState === 'complete' ? 350 : 0;
  window.addEventListener('load', function() { setTimeout(animateBars, 350); });
  if (wait) setTimeout(animateBars, wait);
})();
</script>
`;

// Sends content height to parent so the iframe can auto-size (no scrollbar)
const RESIZE_SCRIPT = `
<script>
(function() {
  function report() {
    var h = Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0
    );
    try { parent.postMessage({ type: '__iframeResize__', height: h }, '*'); } catch(e) {}
  }
  // 'load' fires after CDN scripts finish — wait extra 300ms for Babel to transpile
  window.addEventListener('load', function() { setTimeout(report, 300); });
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(report).observe(document.documentElement);
  }
  // Hard fallback in case load fired before this script ran
  setTimeout(report, 1200);
})();
</script>
`;

export function buildPreviewHtml(code: string, language: string): string | null {
  const lang = language.toLowerCase();

  if (lang === "html") {
    const body = code.includes("<html") ? code : `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${BASE_STYLES}</style>
</head><body style="padding:20px">${code}${ANIMATE_SCRIPT}${RESIZE_SCRIPT}</body></html>`;
    return body;
  }

  if (lang === "css") {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>${BASE_STYLES}${code}</style></head><body style="padding:20px">
<div class="preview-root"></div>${ANIMATE_SCRIPT}${RESIZE_SCRIPT}</body></html>`;
  }

  if (["tsx", "jsx", "ts", "typescript", "js", "javascript"].includes(lang)) {
    let processed = code
      .replace(/^import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, "")
      .replace(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm, "");

    let componentName = "App";
    processed = processed.replace(/export\s+default\s+function\s+(\w+)/, (_, n) => {
      componentName = n; return `function ${n}`;
    });
    processed = processed.replace(/export\s+default\s+class\s+(\w+)/, (_, n) => {
      componentName = n; return `class ${n}`;
    });
    processed = processed.replace(/export\s+default\s+(\w+)\s*;?$/m, (_, n) => {
      componentName = n; return "";
    });
    processed = processed.replace(/export\s+(default\s+)?/g, "");

    return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${BASE_STYLES}</style>
</head><body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react,typescript">
const { useState, useEffect, useRef, useCallback, useMemo, useReducer, useContext, createContext, Fragment } = React;

${processed}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${componentName}));
} catch(e) {
  document.getElementById('root').innerHTML =
    '<div style="padding:20px;color:#b91c1c;font-family:system-ui;font-size:13px"><strong>Preview error</strong><pre style="margin-top:8px;white-space:pre-wrap;font-size:12px">' + e.message + '</pre></div>';
}
  </script>
  ${ANIMATE_SCRIPT}
  ${RESIZE_SCRIPT}
</body></html>`;
  }

  return null;
}
