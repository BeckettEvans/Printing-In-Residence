#!/usr/bin/env python3
"""Checks every page of the site. Standard library only.

Run from the repository root:  python3 tools/check.py

Fails (exit code 1) on:
  - missing or repeated <h1>, or a skipped heading level
  - an <img> without alt text, or a <figure> without a <figcaption>
  - an internal link or #anchor that goes nowhere
  - a repeated id on one page
  - a <u> tag (the charter says no underlining for emphasis)
  - a menu that differs between pages
  - guide pages whose "Page n of 9" footer is out of order
  - colour pairs below WCAG AA contrast (which is also the black-and-white test)
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GUIDE_ORDER = [
    "index.html",
    "ask-housing-first.html",
    "get-online-h-building.html",
    "get-online-j-building.html",
    "connection-troubleshooting.html",
    "room-setup-and-inspection.html",
    "glossary.html",
    "references.html",
    "about-and-credits.html",
]
errors = []


def fail(page, message):
    errors.append(f"{page}: {message}")


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.links = []
        self.headings = []
        self.imgs_without_alt = 0
        self.figures = 0
        self.figcaptions = 0
        self.u_tags = 0
        self.lang = None
        self.has_title = False
        self.has_viewport = False
        self.nav = []
        self._in_nav = 0
        self._stack = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        if tag == "title":
            self.has_title = True
        if tag == "meta" and a.get("name") == "viewport":
            self.has_viewport = True
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "a" and "href" in a:
            self.links.append(a["href"])
        if re.fullmatch(r"h[1-6]", tag):
            self.headings.append(int(tag[1]))
        if tag == "img" and not a.get("alt") and a.get("alt") != "":
            self.imgs_without_alt += 1
        if tag == "figure":
            self.figures += 1
        if tag == "figcaption":
            self.figcaptions += 1
        if tag == "u":
            self.u_tags += 1
        if tag == "nav" and a.get("id") == "site-nav":
            self._in_nav = 1
        elif self._in_nav and tag == "nav":
            self._in_nav += 1
        if self._in_nav and tag == "a":
            self.nav.append(a.get("href"))

    def handle_endtag(self, tag):
        if tag == "nav" and self._in_nav:
            self._in_nav -= 1

    def handle_data(self, data):
        self.text.append(data)


def luminance(hex_colour):
    h = hex_colour.lstrip("#")
    channels = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def check_colours():
    css = (ROOT / "assets/css/site.css").read_text(encoding="utf-8")
    light = dict(re.findall(r"--([a-z-]+):\s*(#[0-9a-fA-F]{6})", css.split("@media (prefers-color-scheme: dark)")[0]))
    dark_block = css.split("@media (prefers-color-scheme: dark)")[1].split("/* ---------- Base")[0]
    dark = dict(light, **dict(re.findall(r"--([a-z-]+):\s*(#[0-9a-fA-F]{6})", dark_block)))
    pairs = [
        ("ink", "paper", 7.0),
        ("ink", "surface", 7.0),
        ("ink-soft", "paper", 4.5),
        ("ink-soft", "surface", 4.5),
        ("accent", "paper", 4.5),
        ("accent", "surface", 4.5),
        ("paper", "ink", 7.0),
        ("rule-strong", "paper", 3.0),
        ("rule-strong", "surface", 3.0),
    ]
    for name, theme in (("light", light), ("dark", dark)):
        for fg, bg, minimum in pairs:
            ratio = contrast(theme[fg], theme[bg])
            if ratio < minimum:
                fail("site.css", f"{name} theme: {fg} on {bg} is {ratio:.2f}:1, needs {minimum}:1")


def main():
    pages = {}
    for path in sorted(ROOT.glob("*.html")):
        parser = Page()
        parser.feed(path.read_text(encoding="utf-8"))
        pages[path.name] = parser

    for name, p in pages.items():
        if not p.lang:
            fail(name, "missing lang on <html>")
        if not p.has_title:
            fail(name, "missing <title>")
        if not p.has_viewport:
            fail(name, "missing viewport meta tag")
        if p.headings.count(1) != 1:
            fail(name, f"expected one <h1>, found {p.headings.count(1)}")
        for before, after in zip(p.headings, p.headings[1:]):
            if after > before + 1:
                fail(name, f"heading level jumps from h{before} to h{after}")
        if p.imgs_without_alt:
            fail(name, f"{p.imgs_without_alt} image(s) without alt text")
        if p.figures != p.figcaptions:
            fail(name, f"{p.figures} figure(s) but {p.figcaptions} caption(s)")
        if p.u_tags:
            fail(name, "uses <u>; use <strong> for emphasis")
        repeated = sorted({i for i in p.ids if p.ids.count(i) > 1})
        if repeated:
            fail(name, f"repeated id(s): {', '.join(repeated)}")
        for href in p.links:
            if re.match(r"^(https?:|mailto:|tel:)", href):
                continue
            target, _, fragment = href.partition("#")
            target = target or name
            if target not in pages:
                if not (ROOT / target).exists():
                    fail(name, f"link to missing file: {href}")
                continue
            if fragment and fragment not in pages[target].ids:
                fail(name, f"link to missing anchor: {href}")

    menus = {name: tuple(p.nav) for name, p in pages.items()}
    reference = menus.get("index.html")
    for name, menu in menus.items():
        if menu != reference:
            fail(name, "menu links differ from index.html")

    for number, name in enumerate(GUIDE_ORDER, start=1):
        if name not in pages:
            fail(name, "guide page is missing")
            continue
        if f"Page {number} of {len(GUIDE_ORDER)}" not in " ".join(pages[name].text):
            fail(name, f'footer should say "Page {number} of {len(GUIDE_ORDER)}"')

    check_colours()

    if errors:
        print(f"{len(errors)} problem(s):")
        for e in errors:
            print("  -", e)
        return 1
    print(f"All checks passed: {len(pages)} pages.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
