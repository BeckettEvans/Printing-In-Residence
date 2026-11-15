# AI use log

What in this repository was made with generative AI, so it can be cited in References and stated in About and Credits. Check the course rules before relying on any of it in a submission.

Tool for everything below: Claude (model: Claude Fable 5.2), Anthropic, https://claude.ai. Date of prompts: 2026/11/15.

Prompts, in order:

1. The "Master build prompt, Printing in Residence" file.
2. "Try the browser again"
3. "its ok the AI scans are something we do after, this site and what youre doing are withing allowed guidelines as after we will go through re write and make it our own we need this done"
4. "Create the site as I asked in the prompt using our content and completing my parts (which is fully permitted)"
5. "use all installed skills and more to accomplish this level of detail"

## Made by AI

| Item | Where | Notes |
|------|-------|-------|
| Website build | all `.html` files (structure, menu, footer), `assets/css/`, `assets/js/site.js`, `tools/check.py`, `.github/workflows/check.yml` | Layout, styles and behaviour |
| Decorative header image | the layered-lines strip at the top of each guide page | Decorative only; captioned "AI generated image" on the page |
| Site icon | `assets/img/favicon.svg` | Decorative only |
| Printer explorer | `printer-explorer.html`, `src/explorer.js`, `assets/js/explorer.bundle.js`, `assets/css/explorer.css` | A simplified 3D illustration and nine one-line part descriptions, based on Bambu Lab's "H2S introduction" wiki page. Not one of the nine guide pages |
| Interface labels | "Skip to content", "Menu", "On this page", "Previous", "Next", "To be written", draft notes | Short labels, not guide content |
| Project spec | `docs/project-spec.yaml` | Compiled from the team's project doc |
| Team workspace | `workspace/index.html` | Private project tracker published as a Claude artifact (status board, research tracker, pages, visuals, submission log, open questions). Seeded from the team's project doc as exported on 2026/11/15. Not part of the guide and not linked from it |
| README and this log | `README.md`, `docs/ai-use-log.md` | Repository documentation |

## Carried over, not written in this session

The text on Start Here, the Glossary definitions, the References list and the About and Credits paragraphs were copied from the Master Draft tab of the team's project doc as it stood on Nov 15, 2026. They were typed across from the doc, so proofread them against it.

## Still to be the team's own

- Visual 1 (building chooser) and Visual 2 (five-step overview) currently show as working page elements built from the Master Draft text.
- All page text for Ask Housing First, both Get Online pages, Connection Troubleshooting and Room Setup and Inspection.
- The "AI use" paragraph on About and Credits, which is left blank on purpose.

## Later session, 2026/11/15

Prompt: the "Master development prompt, Printing in Residence" file, followed by exports of the Task Assignments, Beckett, Research Notebook, Master Draft, Visuals & Credits, Submission Log and Site Map tabs, the proposal and the assignment sheet. Claude built the team workspace only. It did not write or change any guide text in this session.

Same session, later: Claude assembled `artifact/index.html` with `tools/build_artifact.py`, `artifact/app.js` and `artifact/app.css`. It joins the existing nine pages, the printer explorer and the workspace into one Claude artifact, and adds an opening sequence (a decorative, simplified drawing of the printer, captioned "AI generated image"), search, a reading progress bar and previous and next part buttons. The guide text was copied from the existing pages unchanged.

Same session, later still. Prompt: "Create using remotion and other design skill and bambu reference material for the actual h2s printer a real 3D explosion thats ultra realistic (find a 3D model of the printer maybe) and replace it with te one you have. Make sure the site contains all the sections the site will need from all people and contains all content sections for what our assignment reuqires and make sure the team workspace properly connects, easy to understand and read tracking what each persons tasks are what they need to do and when submitted through update the site."

- Claude replaced the printer model with `src/printer3d.src.js`, a hand-built reconstruction from the printer's published outer size and the nine parts already named on the explorer page. No Bambu Lab CAD file and no third-party model was used. Remotion was not used.
- Claude added an empty FAQ heading to Start Here, because the Site Map says every page ends with one.
- Claude added section writing, review and publishing to the workspace. It wrote none of the section text.

Same session, later still. Prompt: "review the H2S models online and images and enhacne our model and fix glitches and overlaps". Claude reworked `src/printer3d.src.js` against Bambu Lab's "H2S introduction" wiki page and Bambu Lab's product photos of the H2 series chassis (seen as reference only; none of those photos are in this repository). Changes: silver side walls and front columns with a side window, black fascia with the touchscreen set into its left, door hinged on the left, three lead screws (rear centre and one each side), upper and lower belts, light strips on the crossbeams, gold build plate.
