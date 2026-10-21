# Passport Photo

Make a US passport photo from a portrait, right in your browser. Upload a photo, and the page crops it to 2x2 inches, checks it against the main State Department rules, and gives you a 4x6 inch print sheet with four copies plus a single digital photo.

**Try it:** https://unaltatar.github.io/passportphoto/

The interface is available in English and Turkish.

## Privacy

Your photo is processed entirely in your browser. It is never uploaded and never stored. There is no backend: the site is a set of static files on GitHub Pages. The first time you choose a photo, the page downloads the face detection models (about 24 MB), which the browser then keeps in its cache.

## What it does

- **Finds the face.** It detects up to 10 faces and picks the largest one. In a group photo you can tap another face, or draw a box around the person you want.
- **Crops to the rules.** The head (chin to top of head) is sized between 1 and 1 3/8 inches, and the eyes are placed near the recommended line. You can fine tune the head size and position.
- **Levels a slightly tilted head** by rotating the whole photo by up to 10 degrees.
- **Makes the background white** (on by default, can be turned off).
- **Lifts shadows on the face** if you ask it to (off by default, never darkens).
- **Gives you two files:**
  - a 4x6 inch print sheet at 300 dpi with four 2x2 inch photos, cut marks and a 1 inch ruler
  - a square digital JPEG (600x600 or 1200x1200 pixels, at least 54 KB) for online passport renewal
- **Opens HEIC photos** from iPhones, including in browsers that cannot open HEIC themselves.

The face is never reshaped, smoothed or retouched. If a photo does not meet the rules, the page says why and how to retake it instead of trying to fix it.

## Checks

| Check | Result |
|---|---|
| No face found | Rejected |
| Face turned left or right (more than 8 degrees) | Rejected |
| Head tilted up or down (more than 20 degrees) | Rejected, a smaller tilt of 10 to 20 degrees only warns |
| Head leaning sideways (more than 10 degrees) | Rejected, smaller tilts are leveled automatically |
| Eyes closed | Rejected |
| Top of the head or chin outside the photo | Rejected |
| Shoulders missing at the bottom | Rejected |
| Another person inside the frame | Rejected |
| Head smaller than 300 pixels in the original photo | Rejected, close to the limit only warns |
| Hat or head covering | Warning (allowed when worn daily for religious or medical reasons) |
| Glasses | Warning (allowed only when they cannot be removed for medical reasons) |
| Strong shadow on one side of the face | Warning |
| Shoulders cut off at the sides of the photo | Warning |

### Not checked yet

These are on the to do list. Please check them yourself before you print:

- the photo is in color, not black and white
- the photo is sharp, not blurry or enlarged from a small image
- the face is evenly lit, neither too dark nor overexposed
- the background is plain and light when "Make the background white" is turned off
- a neutral expression with the mouth closed

## How to print

1. Download the 4x6 print sheet.
2. Upload it to a photo printing service (for example CVS Photo online, in the app or at an in-store kiosk) and choose a 4x6 print.
3. Do not crop or resize it. The file already has the exact 4x6 shape.
4. After printing, measure the ruler on the sheet. It must be exactly 1 inch (25.4 mm). If it is not, the print was scaled and the photos are not valid.
5. Cut along the grey lines to get four 2x2 inch photos.

## Known limitations

- **This is not an official tool.** The passport agency always decides whether a photo is accepted.
- **WebAssembly is required.** On an iPhone or iPad with Lockdown Mode turned on, Safari disables WebAssembly and the page cannot run. You can try turning Lockdown Mode off for this site in Safari's Website Settings, or use a computer.
- **TIFF files** open only in Safari. Save them as JPEG or PNG for other browsers.

## Development

Requires Node.js 22.12 or newer.

```bash
npm --prefix web install        # install dependencies
npm --prefix web run dev        # local dev server
npm --prefix web test           # run the tests once
npm --prefix web run build      # production build into web/dist/
npm --prefix web run preview    # serve the production build
```

Before `dev` and `build`, a script copies the MediaPipe WebAssembly files from `node_modules` into `web/public/mediapipe/`. That folder is generated and not committed.

### How it is built

- [Vite](https://vite.dev/) with plain JavaScript and CSS, no framework, in `web/`
- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) for face landmarks and for separating the person from the background
- [heic-to](https://github.com/hoppergee/heic-to) for HEIC photos, loaded only when a HEIC file is opened
- [Vitest](https://vitest.dev/) for the tests

### Project layout

| Path | Contents |
|---|---|
| `web/src/spec.js` | Photo rules, print sizes and thresholds. All the numbers live here. |
| `web/src/geometry.js`, `quality.js`, `mask.js`, `tone.js`, `sheet.js`, `jpeg.js`, `heif.js` | Pure functions, each with a `*.test.js` next to it |
| `web/src/vision.js` | The only module that talks to MediaPipe |
| `web/src/render.js`, `sheet.js` | Canvas drawing for the photo and the print sheet |
| `web/src/main.js` | Page wiring and state |
| `web/src/i18n.js` | English and Turkish text |
| `.github/workflows/deploy.yml` | Builds, tests and publishes the site to GitHub Pages on every push to `main` |

## Sources for the rules

- Head height of 1 to 1 3/8 inches, measured from the chin to the top of the head: U.S. Department of State.
- Hats, head coverings, glasses and beards: [U.S. Department of State photo requirements](https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html).
- Digital photo for online renewal (JPEG, 54 KB to 10 MB): U.S. Department of State online renewal page.

## License

Copyright (c) 2026 Unal Tatar. All rights reserved.

The source code is shared for viewing only. No license is granted to copy, modify, distribute or reuse it, in whole or in part. The website itself is free to use.

## Third-party licenses

The libraries this site uses keep their own licenses. See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md). MediaPipe is Apache-2.0. heic-to and the libheif library it includes are LGPL-3.0.

This project is not affiliated with or endorsed by the U.S. Department of State.
