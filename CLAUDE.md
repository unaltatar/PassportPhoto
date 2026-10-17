# Passport Photo

A browser-only web app that turns a portrait into a US passport photo (2x2 in) and a 4x6 in print sheet with four copies. Everything runs in the browser with MediaPipe (face landmarks and selfie segmentation). Photos never leave the device. There is no backend, so the site deploys to GitHub Pages as static files.

`PLAN.md` is the original build plan and records why decisions were made. The rules below are the ones that stay true.

## Stack

- Vite with vanilla JavaScript and plain CSS in `web/`. No framework.
- `@mediapipe/tasks-vision` for face landmarks and segmentation.
- Vitest for tests of the pure modules.
- GitHub Pages for hosting, deployed by a GitHub Actions workflow in `.github/workflows/`.

## Commands

```bash
npm --prefix web install            # install dependencies
npm --prefix web run dev            # local dev server
npm --prefix web test               # run tests once
npm --prefix web run build          # production build into web/dist/
npm --prefix web run preview        # serve the production build
```

**Check command** (run before calling any task done): `npm --prefix web test && npm --prefix web run build`

## Layout

- `web/src/spec.js`: US photo rules, print sizes and quality thresholds. Change numbers here, not in other modules.
- `web/src/geometry.js`, `quality.js`, `mask.js`, `tone.js`, `sheet.js` (`layoutSheet`), `jpeg.js`: pure functions with no DOM or MediaPipe access. Each has a `*.test.js` next to it.
- `web/src/vision.js`: the only module that talks to MediaPipe.
- `web/src/render.js`, `sheet.js` (`drawSheet`): canvas drawing.
- `web/src/main.js`: UI wiring and state. `web/src/i18n.js`: Turkish and English strings. Every visible string goes through it.
- `web/scripts/copy-mediapipe-wasm.mjs`: copies the MediaPipe wasm files from `node_modules` into `web/public/mediapipe/` before `dev` and `build`. That folder is generated and ignored by git.
- Models load from `storage.googleapis.com/mediapipe-models/`. Use relative paths (`./mediapipe/wasm`) for local assets, never a leading `/`, or it breaks on GitHub Pages.

## Photo rules

- **Never change the shape of the face.** No warping, no pose correction, no retouching. Allowed edits: rotating the whole photo by at most 10 degrees to level a tilted head, uniform scaling, cropping, replacing the background (toggle), and gently lifting shadows on skin (toggle, off by default, never darkens).
- A photo that does not meet the rules is rejected with a reason and a tip, not fixed. A face turned left, right, up or down is rejected.
- Sources for the numbers in `spec.js`:
  - Head height 1 to 1 3/8 in, chin to top of head: State Department, admin-americanspaces.state.gov/?p=1683.
  - Eye line 1 1/8 to 1 3/8 in from the bottom: secondary sources only (traveldocs.com, smartphone-id.com). Used as a target, never a reason to reject.
  - Online renewal file: travel.state.gov upload page, JPEG between 54 KB and 10 MB. Square 600 to 1200 px comes from third-party guides.

## Conventions

- Keep tasks small. One feature per branch, one commit per working step.
- Every pure function gets a test. Write the test first when fixing a bug. Tests use synthetic coordinates and arrays. Never commit face photos; keep test photos in a scratchpad.
- Ask before adding a dependency, and confirm the package exists on npmjs.com first.
- Look up library APIs (MediaPipe, Vite, Vitest) with Context7 rather than guessing.
- Never use em dashes in anything you write: code, comments, docs, UI copy or commit messages. Use a comma, a colon, brackets or a full stop.
- Commit messages: short imperative subject, for example `Add shadow lift toggle`.

## Do not touch

- `.env` and anything that looks like a secret. Use `.env.example` for variable names.
- `.github/workflows/` and `.claude/settings.json`, unless asked.

## Definition of done

A task is not done until you have shown it working: the check command passes, and you have said exactly how to see the change (the URL, the button to click, or the test that covers it).
