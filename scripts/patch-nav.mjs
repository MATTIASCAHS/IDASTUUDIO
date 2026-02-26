import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const indexFile = path.join(publicDir, 'index.html');
const kataloogHref = '/kataloog/';

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
    const content = await readFile(filePath, 'utf8');
    if (hasKataloogLink(content)) {
      continue;
    }

    const { changed, html } = injectIntoNav(content);
    if (changed) {
      await writeFile(filePath, html, 'utf8');
      navPatchedCount += 1;
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
