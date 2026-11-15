# Printing in Residence

A guide to running a Bambu Lab H2S in UFV student housing. CMNS 390 major project, Fall 2026.

The site is plain HTML on GitHub Pages. There is no build step for the nine guide pages: edit a file, commit, and the change is live.

## Pages

| # | File | Page | Owner |
|---|------|------|-------|
| 1 | `index.html` | Start Here | Beckett |
| 2 | `ask-housing-first.html` | Ask Housing First | Jade |
| 3 | `get-online-h-building.html` | Get Online in H Building | Bennett |
| 4 | `get-online-j-building.html` | Get Online in J Building | Bennett |
| 5 | `connection-troubleshooting.html` | Connection Troubleshooting | Bennett |
| 6 | `room-setup-and-inspection.html` | Room Setup and Inspection | Jade |
| 7 | `glossary.html` | Glossary | Beckett compiles |
| 8 | `references.html` | References | Beckett compiles |
| 9 | `about-and-credits.html` | About and Credits | Beckett |

Not part of the guide:

- `template.html` has copy-and-paste blocks (steps, warnings, figures, tables, FAQ) for moving drafts in.
- `printer-explorer.html` is an optional 3D illustration. To leave it out, delete the file and remove its line from the menu in each page.
- `404.html` is the "page not found" page.
- `workspace/index.html` is a backup of the team's private workspace, which runs as a Claude artifact. It holds no project data and does nothing when opened from this site.

## Moving a draft into a page

1. Open the page file and find the section heading.
2. Replace `<p class="placeholder">To be written.</p>` with the text. Keep paragraphs to three sentences.
3. Copy blocks from `template.html` for steps, warnings, tables and FAQs.
4. For each visual, put the image in `assets/img/`, then replace the `figure-slot` div with an `<img>` that has `alt` text, and write the caption.
5. Remove the `draft-note` line under the page title when the page is final.
6. Run the checks.

## Checks

```
python3 tools/check.py
```

This checks headings, alt text, captions, links, anchors, the menu, page numbers and colour contrast. It also runs on every push (see `.github/workflows/check.yml`).

Still to do by hand before the Dec 4 review: open every external link, test on an iPhone and an Android phone, and print one page in black and white.

## Publishing

In the repository on GitHub: Settings, Pages, "Deploy from a branch", branch `main`, folder `/ (root)`. The site then appears at `https://beckettevans.github.io/Printing-In-Residence/`.

## Design rules built into the template

These follow the team charter: one typeface (IBM Plex Sans), one heading hierarchy, bold for emphasis, one primary colour (graphite) and one accent (green), and every colour pair passes WCAG AA contrast so the pages read in black and white. Links keep an underline so they can be found without colour. Printing a page gives a clean export with the project title in the header and the page number in the footer.

## Printer explorer bundle

Only needed if `src/explorer.js` changes:

```
npm install
npm run build
```

## Claude artifact

`artifact/index.html` is the whole guide plus the team workspace as one page, published as a Claude artifact. It is generated, so do not edit it by hand:

```
python3 tools/build_artifact.py
```

## Project records

- `docs/project-spec.yaml`: site map, owners, deadlines, rules and the requirements traceability map, compiled from the team's project doc.
- `docs/ai-use-log.md`: what in this repository was made with generative AI, for the References and About and Credits pages.

## Licences

IBM Plex Sans is under the SIL Open Font License (`assets/fonts/OFL.txt`). The explorer bundle includes three.js (MIT License).
