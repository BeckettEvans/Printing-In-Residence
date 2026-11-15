#!/usr/bin/env python3
"""Build the single-page Claude artifact from the site's own files.

Reads the nine guide pages, the printer explorer page and the workspace source,
and writes artifact/index.html. The guide text is copied as it stands; nothing is rewritten.
Run from the repository root:  python3 tools/build_artifact.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = [
    ("index.html", "start-here", "Start Here"),
    ("ask-housing-first.html", "ask-housing-first", "Ask Housing First"),
    ("get-online-h-building.html", "get-online-h-building", "Get Online in H Building"),
    ("get-online-j-building.html", "get-online-j-building", "Get Online in J Building"),
    ("connection-troubleshooting.html", "connection-troubleshooting", "Connection Troubleshooting"),
    ("room-setup-and-inspection.html", "room-setup-and-inspection", "Room Setup and Inspection"),
    ("glossary.html", "glossary", "Glossary"),
    ("references.html", "references", "References"),
    ("about-and-credits.html", "about-and-credits", "About and Credits"),
    ("printer-explorer.html", "printer-explorer", "Printer explorer"),
]
SLUG = {f: s for f, s, _ in PAGES}


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def relink(html, slug, prefix_ids):
    """Point page links at hash routes and keep ids unique across pages."""
    def page_link(m):
        target, frag = SLUG.get(m.group(1)), m.group(2)
        if target is None:
            return m.group(0)
        if frag:
            frag = frag[1:]
            return 'href="#%s"' % (frag if target == "printer-explorer" else target + "--" + frag)
        return 'href="#%s"' % target
    html = re.sub(r'href="([a-z0-9-]+\.html)(#[^"]*)?"', page_link, html)
    if prefix_ids:
        for attr in ("id", "aria-labelledby", "aria-controls", "aria-describedby", "for", "data-copy-target", "headers"):
            html = re.sub(r'\b%s="([^"]+)"' % attr,
                          lambda m: '%s="%s"' % (attr, " ".join(slug + "--" + x for x in m.group(1).split())), html)
        html = re.sub(r'href="#([^"]+)"', lambda m: m.group(0) if m.group(1) in SLUG.values() or "--" in m.group(1)
                      else 'href="#%s--%s"' % (slug, m.group(1)), html)
    return html


def prefix_css(css, scope="#ws"):
    """Scope the workspace rules so they cannot touch the guide."""
    out, i = [], 0
    for m in re.finditer(r'(@media[^{]+)\{((?:[^{}]*\{[^{}]*\})*)\s*\}|([^{}@]+)\{([^{}]*)\}', css):
        if m.group(1):
            out.append("%s{%s}" % (m.group(1), prefix_css(m.group(2), scope)))
            continue
        sel, body = m.group(3).strip(), m.group(4)
        sel = re.sub(r'/\*.*?\*/', '', sel, flags=re.S).strip()
        if not sel:
            continue
        if sel.startswith(":root"):
            out.append("%s{%s}" % (sel, body))
            continue
        if sel in ("html,body", "body", "*"):
            if sel == "body":
                out.append("%s{color:var(--ink);font:400 16px/1.5 var(--font)}" % scope)
            elif sel == "*":
                out.append("%s *{%s}" % (scope, body))
            continue
        parts = []
        for s in sel.split(","):
            s = s.strip()
            s = re.sub(r'^main\b', '.ws-main', s)
            parts.append(s if s.startswith("@") else "%s %s" % (scope, s))
        out.append("%s{%s}" % (",".join(parts), body))
    return "\n".join(out)


def build():
    home = read("index.html")
    header = re.search(r'<header class="site-header">.*?</header>', home, re.S).group(0)
    nav = re.search(r'<nav class="site-nav".*?</nav>', home, re.S).group(0)
    footer = re.search(r'<footer class="site-footer">.*?</footer>', home, re.S).group(0)

    header = header.replace('href="index.html"', 'href="#start-here"').replace(
        '<button class="menu-button"',
        '<div class="header-links"><a class="view-switch" id="view-switch" href="#team">Team workspace</a>\n    <button class="menu-button"').replace(
        '</button>', '</button></div>', 1)
    nav = relink(nav, "", False).replace(' class="is-current"', "").replace(' aria-current="page"', "")
    search = ('<div class="guide-search" role="search"><label for="guide-search">Search the guide</label>'
              '<input type="search" id="guide-search" autocomplete="off">'
              '<ul class="search-results" id="search-results" aria-live="polite"></ul>'
              '<p class="search-none" id="search-none" hidden>No section matches that.</p></div>')
    nav = re.sub(r'(<nav class="site-nav"[^>]*>)', r'\1\n' + search, nav, count=1)
    footer = relink(footer, "", False)
    footer = re.sub(r'\s*<p>Page \d+ of \d+</p>', '', footer)

    articles = []
    for i, (fname, slug, title) in enumerate(PAGES):
        body = re.search(r'<div class="content">(.*)</div>\s*</main>', read(fname), re.S).group(1)
        body = relink(body, slug, slug != "printer-explorer")
        crumb = "Reference" if i >= 6 else "The five steps"
        if slug == "printer-explorer":
            crumb = "Extra"
            body = body.replace(
                '<button type="button" class="explorer-button" id="reset-view">Reset the view</button>',
                '<button type="button" class="explorer-button" id="reset-view">Reset the view</button>\n'
                '            <button type="button" class="explorer-button" id="part-prev">Previous part</button>\n'
                '            <button type="button" class="explorer-button" id="part-next">Next part</button>')
        crumb_html = '<p class="breadcrumb"><a href="#start-here">Guide</a> / %s / %s</p>' % (crumb, title)
        articles.append('<article class="page" data-page="%s"%s>\n%s\n%s\n</article>'
                        % (slug, "" if i == 0 else " hidden", crumb_html, body))

    site_css = re.sub(r'@font-face\s*\{[^}]*\}', '', read("assets/css/site.css"))
    wsrc = read("workspace/index.html")
    ws_css = re.search(r'<style>(.*?)</style>', wsrc, re.S).group(1)
    ws_css = re.sub(r'/\*.*?\*/', '', ws_css, flags=re.S)
    ws_body = re.search(r'<body>(.*?)<script>', wsrc, re.S).group(1)
    ws_js = re.search(r'<script>(.*)</script>', wsrc, re.S).group(1)

    def swap(text, old, new, count=1):
        assert text.count(old) >= 1, "workspace source changed: %r" % old[:60]
        return text.replace(old, new) if count == 0 else text.replace(old, new, count)

    ws_body = swap(ws_body, '<main id="main" aria-live="polite">', '<div id="ws-main" class="ws-main" aria-live="polite">')
    ws_body = swap(ws_body, '</main>', '</div>')
    ws_body = swap(ws_body, '<a href="#overview">', '<a href="#team">')
    ws_body = re.sub(r'href="#(mine|tasks|research|pages|visuals|submissions|questions)"', r'href="#team-\1"', ws_body)
    ws_body = swap(ws_body, '<h1>Printing in Residence <span class="soft" style="font-weight:400">team workspace</span></h1>',
                   '<div><h1>Team workspace</h1><p class="ws-private">Private to the team. Visitors with view-only access cannot read these records.</p></div>')
    ws_js = swap(ws_js, '$("main")', '$("ws-main")', 0)
    ws_js = swap(ws_js,
                 'function route(){var h=(location.hash||"#overview").slice(1);return [',
                 'function route(){var h=location.hash.slice(1);if(h==="team")return "overview";if(h.indexOf("team-")!==0)return null;h=h.slice(5);return [')
    ws_js = swap(ws_js, 'var r=route();\n  document.querySelectorAll("nav.tabs a")', 'var r=route();if(!r)return;\n  document.querySelectorAll("nav.tabs a")')
    ws_js = swap(ws_js, 'a.getAttribute("href")==="#"+r)', 'a.getAttribute("href")==="#"+(r==="overview"?"team":"team-"+r))')
    ws_js = swap(ws_js, 'window.addEventListener("hashchange",function(){render();window.scrollTo(0,0);});',
                 'window.addEventListener("hashchange",function(){if(route()){render();window.scrollTo(0,0);}});')
    ws_js = swap(ws_js, 'Changes need Contributor access', 'Changes need Contributor access') if 'Changes need Contributor access' in ws_js else ws_js

    intro = '''<section class="intro" id="intro" aria-label="Opening">
  <div class="intro-track">
    <div class="intro-stage">
      <canvas aria-hidden="true"></canvas>
      <div class="intro-copy">
        <p class="intro-kicker">CMNS 390 · University of the Fraser Valley · Fall 2026</p>
        <p class="intro-title">Printing in Residence</p>
        <p class="intro-sub">Running a Bambu Lab H2S in UFV Student Housing</p>
      </div>
      <p class="intro-callout" id="intro-callout" aria-hidden="true" hidden></p>
      <p class="intro-step" id="intro-step" aria-hidden="true"></p>
      <p class="intro-hint" aria-hidden="true">Scroll</p>
      <p class="intro-credit">Decorative illustration, simplified and not to scale. AI generated image.</p>
      <div class="intro-actions">
        <button type="button" class="intro-button is-primary" id="intro-skip">Skip intro</button>
        <a class="intro-button" href="#printer-explorer">Explore the printer</a>
      </div>
    </div>
  </div>
</section>'''

    page_meta = json.dumps([{"slug": s, "title": t} for _, s, t in PAGES])
    html = '''<!DOCTYPE html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Printing in Residence</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
%s
%s
%s
/* ---- workspace (scoped) ---- */
%s
</style>
<script>document.documentElement.classList.add("js");</script>
</head>
<body>
<a class="skip-link" href="#guide-body">Skip to content</a>
%s
<div id="guide">
%s
<div class="read-progress" aria-hidden="true"><span></span></div>
<div class="layout" id="guide-body">
%s
<main class="layout-main" id="main">
<div class="content">
%s
</div>
</main>
</div>
%s
</div>
<div id="ws" hidden>
%s
</div>
<script>window.__PAGES=%s;</script>
<script>
%s
</script>
<script>
(function(){
%s
})();
</script>
</body>
</html>
''' % (site_css, read("assets/css/explorer.css"), read("artifact/app.css"), prefix_css(ws_css),
       header, intro, nav, "\n".join(articles), footer, ws_body, page_meta, read("artifact/app.js"), ws_js)
    out = ROOT / "artifact" / "index.html"
    out.write_text(html, encoding="utf-8")
    (ROOT / "artifact" / "explorer.bundle.js").write_bytes((ROOT / "assets/js/explorer.bundle.js").read_bytes())
    print("wrote", out, len(html), "bytes")


if __name__ == "__main__":
    build()
