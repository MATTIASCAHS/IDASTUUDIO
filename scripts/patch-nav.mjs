import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const indexFile = path.join(publicDir, 'index.html');
const INTERNAL_HOST_PATTERN = '(?:https?:)?//(?:www\\.)?idastuudio\\.ee';
const CHATBOT_RENDER_ORIGIN = 'https://ida-chatbot.onrender.com';
const CHATBOT_LOCAL_ORIGIN = 'http://localhost:8788';
const CHATBOT_CONFIG_SCRIPT =
  `<script id="ida-chatbot-config">(function(){var host=(window.location.hostname||"").toLowerCase().replace(/^\\[|\\]$/g,"");var isLocal=host==="localhost"||host==="127.0.0.1"||host==="0.0.0.0"||host==="::1"||host.endsWith(".localhost");var chatbotOrigin=isLocal?"${CHATBOT_LOCAL_ORIGIN}":"${CHATBOT_RENDER_ORIGIN}";window.__idastuudioWidgetOrigin=chatbotOrigin;window.__idastuudioWidgetConfig={apiBase:chatbotOrigin,brandName:"IDA SISUSTUSPOOD & STUUDIO",storeOrigin:window.location.origin};})();</script>`;
const CHATBOT_EMBED_SCRIPT =
  `<script id="ida-chatbot-embed">(function(){var host=(window.location.hostname||"").toLowerCase().replace(/^\\[|\\]$/g,"");var isLocal=host==="localhost"||host==="127.0.0.1"||host==="0.0.0.0"||host==="::1"||host.endsWith(".localhost");var origin=window.__idastuudioWidgetOrigin||(isLocal?"${CHATBOT_LOCAL_ORIGIN}":"${CHATBOT_RENDER_ORIGIN}");window.__idastuudioWidgetOrigin=origin;var script=document.createElement("script");script.src=origin+"/widget/embed.js";script.defer=true;script.setAttribute("data-ida-chatbot-loader","1");document.head.appendChild(script);})();</script>`;
const LOCAL_CART_SCRIPT = '<script id="ida-local-cart" src="/localhost-cart.js" defer></script>';

function hasKataloogLink(html) {
  return /href=["']\/kataloog\/["']/i.test(html);
}

function injectIntoNav(html) {
  const navMatch = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i);
  if (!navMatch || navMatch.index === undefined) {
    return { changed: false, html };
  }

  const originalNav = navMatch[0];
  if (hasKataloogLink(originalNav)) {
    return { changed: false, html };
  }

  let patchedNav = originalNav;

  if (/<ul\b[^>]*>[\s\S]*?<\/ul>/i.test(originalNav)) {
    patchedNav = originalNav.replace(
      /<\/ul>/i,
      '  <li class="menu-item menu-item-kataloog"><a href="/kataloog/" aria-label="Ava kataloog">Kataloog</a></li>\n</ul>'
    );
  } else {
    patchedNav = originalNav.replace(
      /<\/nav>/i,
      '  <a href="/kataloog/" aria-label="Ava kataloog">Kataloog</a>\n</nav>'
    );
  }

  if (patchedNav === originalNav) {
    return { changed: false, html };
  }

  const updatedHtml =
    html.slice(0, navMatch.index) +
    patchedNav +
    html.slice(navMatch.index + originalNav.length);

  return { changed: true, html: updatedHtml };
}

function injectFallbackIntoIndex(html) {
  if (hasKataloogLink(html)) {
    return { changed: false, html };
  }

  const fallback =
    '<p id="kataloog-footer-link" style="margin:0;padding:0.65rem 1rem;text-align:center;font-size:0.95rem;border-top:1px solid #d9d9d9;background:#fafafa;">' +
    '<a href="/kataloog/" aria-label="Ava kataloog">Kataloog</a>' +
    '</p>';

  if (/<\/body>/i.test(html)) {
    return { changed: true, html: html.replace(/<\/body>/i, `${fallback}\n</body>`) };
  }

  return { changed: true, html: `${html}\n${fallback}\n` };
}

function injectLocalScripts(html) {
  const hasChatbotConfig = /<script[^>]*id=["']ida-chatbot-config["'][^>]*>/i.test(html);
  const hasChatbotEmbed =
    /<script[^>]*id=["']ida-chatbot-embed["'][^>]*>/i.test(html) ||
    /<script[^>]*src=["']https:\/\/ida-chatbot\.onrender\.com\/widget\/embed\.js(?:\?[^"']*)?["'][^>]*><\/script>/i.test(
      html
    ) ||
    /<script[^>]*src=["']http:\/\/localhost:8788\/widget\/embed\.js(?:\?[^"']*)?["'][^>]*><\/script>/i.test(
      html
    );
  const hasLocalCart =
    /<script[^>]*id=["']ida-local-cart["'][^>]*>/i.test(html) ||
    /<script[^>]*src=["']\/localhost-cart\.js(?:\?[^"']*)?["'][^>]*><\/script>/i.test(html);

  const scriptsToInject = [];
  if (!hasChatbotConfig) {
    scriptsToInject.push(CHATBOT_CONFIG_SCRIPT);
  }
  if (!hasChatbotEmbed) {
    scriptsToInject.push(CHATBOT_EMBED_SCRIPT);
  }
  if (!hasLocalCart) {
    scriptsToInject.push(LOCAL_CART_SCRIPT);
  }

  if (scriptsToInject.length === 0) {
    return { changed: false, html };
  }

  const injection = scriptsToInject.join('\n');

  if (/<\/body>/i.test(html)) {
    return { changed: true, html: html.replace(/<\/body>/i, `${injection}\n</body>`) };
  }

  return { changed: true, html: `${html}\n${injection}\n` };
}

function stripChatbot(html) {
  let cleaned = html;
  cleaned = cleaned.replace(
    /<script>\s*window\.IdaChatbotConfig[\s\S]*?<\/script>\s*/gi,
    ''
  );
  cleaned = cleaned.replace(
    /<script[^>]*src=["']https:\/\/ida-chatbot\.onrender\.com\/widget\/embed\.js["'][^>]*><\/script>\s*/gi,
    ''
  );
  cleaned = cleaned.replace(
    /<script[^>]*src=["']http:\/\/localhost:8788\/widget\/embed\.js["'][^>]*><\/script>\s*/gi,
    ''
  );
  cleaned = cleaned.replace(
    /<script[^>]*src=["']https:\/\/ida-chatbot\.onrender\.com\/widget\/loader\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,
    ''
  );
  cleaned = cleaned.replace(
    /<script[^>]*src=["']https:\/\/ida-chatbot\.onrender\.com\/widget\/embed\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,
    ''
  );
  cleaned = cleaned.replace(
    /<script[^>]*src=["']http:\/\/localhost:8788\/widget\/embed\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,
    ''
  );
  cleaned = cleaned.replace(
    /<script[^>]*id=["']ida-chatbot-config["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    ''
  );
  cleaned = cleaned.replace(
    /<script[^>]*id=["']ida-chatbot-embed["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    ''
  );
  cleaned = cleaned.replace(
    /<script>\s*window\.__idastuudioWidgetConfig[\s\S]*?<\/script>\s*/gi,
    ''
  );
  cleaned = cleaned.replace(
    /<script[^>]*id=["']ida-local-cart["'][^>]*><\/script>\s*/gi,
    ''
  );
  cleaned = cleaned.replace(
    /<script[^>]*src=["']\/localhost-cart\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,
    ''
  );
  return { changed: cleaned !== html, html: cleaned };
}

function normalizeBrokenLinkAttributes(html) {
  const normalized = html.replace(/\b(href|action)\s*==\s*(["'])/gi, '$1=$2');
  return { changed: normalized !== html, html: normalized };
}

function localizeInternalLinks(html) {
  let localized = html;

  const rewriteAttr = (match, attrPrefix, quote, pathPart) => {
    const normalizedPath = pathPart && pathPart.length > 0 ? pathPart : '/';
    return `${attrPrefix}${quote}${normalizedPath}${quote}`;
  };

  const anchorHrefRegex = new RegExp(
    `(<a\\b[^>]*?\\bhref\\s*=\\s*)(["'])${INTERNAL_HOST_PATTERN}([^"'\\s>]*)\\2`,
    'gi'
  );
  localized = localized.replace(anchorHrefRegex, rewriteAttr);

  const formActionRegex = new RegExp(
    `(<form\\b[^>]*?\\baction\\s*=\\s*)(["'])${INTERNAL_HOST_PATTERN}([^"'\\s>]*)\\2`,
    'gi'
  );
  localized = localized.replace(formActionRegex, rewriteAttr);

  return { changed: localized !== html, html: localized };
}

async function walkHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkHtmlFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const publicExists = await stat(publicDir).then(() => true).catch(() => false);
  if (!publicExists) {
    console.error('public/ directory not found. Run build first.');
    process.exit(1);
  }

  const htmlFiles = await walkHtmlFiles(publicDir);
  let navPatchedCount = 0;

  for (const filePath of htmlFiles) {
    let content = await readFile(filePath, 'utf8');
    let dirty = false;

    const { changed: strippedChatbot, html: strippedHtml } = stripChatbot(content);
    if (strippedChatbot) {
      content = strippedHtml;
      dirty = true;
    }

    const { changed: normalizedBrokenAttrs, html: normalizedAttrsHtml } =
      normalizeBrokenLinkAttributes(content);
    if (normalizedBrokenAttrs) {
      content = normalizedAttrsHtml;
      dirty = true;
    }

    const { changed: localizedInternalLinks, html: localizedHtml } = localizeInternalLinks(content);
    if (localizedInternalLinks) {
      content = localizedHtml;
      dirty = true;
    }

    const { changed: injectedLocalScripts, html: injectedHtml } = injectLocalScripts(content);
    if (injectedLocalScripts) {
      content = injectedHtml;
      dirty = true;
    }

    if (!hasKataloogLink(content)) {
      const { changed, html } = injectIntoNav(content);
      if (changed) {
        content = html;
        dirty = true;
        navPatchedCount += 1;
      }
    }

    if (dirty) {
      await writeFile(filePath, content, 'utf8');
    }
  }

  if (navPatchedCount === 0) {
    const indexExists = await stat(indexFile).then(() => true).catch(() => false);
    if (!indexExists) {
      console.warn('No HTML nav patched and public/index.html is missing. Fallback link not injected.');
      return;
    }

    const indexHtml = await readFile(indexFile, 'utf8');
    const { changed, html } = injectFallbackIntoIndex(indexHtml);
    if (changed) {
      await writeFile(indexFile, html, 'utf8');
      console.log('No <nav> found. Injected homepage fallback kataloog link.');
      return;
    }

    console.log('No <nav> found and kataloog link already present on homepage.');
    return;
  }

  console.log(`Patched ${navPatchedCount} HTML file(s) with Kataloog nav link.`);
}

main().catch((error) => {
  console.error('patch-nav failed:', error);
  process.exit(1);
});
