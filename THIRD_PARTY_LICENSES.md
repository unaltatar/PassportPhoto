# Third-party licenses

The site ships these libraries to the browser.

| Library | Used for | License | Source |
|---|---|---|---|
| @mediapipe/tasks-vision | Face landmarks and segmentation | Apache-2.0 | https://github.com/google-ai-edge/mediapipe |
| heic-to (bundles libheif) | Opening HEIC/HEIF photos in browsers that cannot | LGPL-3.0 | https://github.com/hoppergee/heic-to, https://github.com/strukturag/libheif |

heic-to is loaded as its own file (`assets/heic-to-*.js`) only when a HEIC photo is opened, so it can be replaced with another build of the same library without changing the rest of the site. Its full license text is in `web/node_modules/heic-to/LICENSE` after `npm install`, and at the source link above.
