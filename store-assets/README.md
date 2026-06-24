# Chrome Web Store submission kit — Beauty Diagram

This folder contains the text assets needed to submit the Beauty Diagram browser extension to the Chrome Web Store.

---

## Files in this kit

| File | Purpose |
|---|---|
| `listing.md` | Public store listing copy — name, summary, detailed description (English + Traditional Chinese), website and support URLs |
| `privacy-policy.md` | Complete privacy policy to host at `https://www.beauty-diagram.com/privacy/extension` before submitting |
| `permission-justifications.md` | Review-only texts for the Chrome Web Store dashboard — paste into the permission justification fields during submission |
| `README.md` | This file — submission checklist and screenshot export instructions |

---

## Chrome Web Store submission checklist

1. **Create or log into a developer account** — pay the one-time US $5 registration fee at [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) if you have not already done so.
2. **Finalize `manifest.json` and icons** — confirm version number, all four icon sizes (16, 32, 48, 128 px), and that no placeholder text remains.
3. **Host the privacy policy** — publish the content of `privacy-policy.md` at `https://www.beauty-diagram.com/privacy/extension` and verify the URL is publicly accessible before uploading the extension.
4. **Build and create the submission zip** — run the production build, then zip the extension directory (containing `manifest.json` at the root). Do not include source files, `node_modules`, or `store-assets/` in the zip.
5. **Upload the zip** — in the Developer Dashboard, click "New item" and upload the zip file.
6. **Fill in the store listing** — copy the name, summary, and detailed description from `listing.md`. Set Category to "Developer Tools". Add the website URL and support URL. Upload screenshots (see below).
7. **Fill in the privacy practices tab** — enter `https://www.beauty-diagram.com/privacy/extension` as the privacy policy URL. Use the data-usage table and certification checklist in `permission-justifications.md` to complete the data-use disclosure form. Paste the individual permission justification texts into the corresponding permission fields.
8. **Submit for review** — click "Submit for review". First-time submissions typically take one to three business days.
9. **Respond to review feedback** — if Google requests clarification on any permission or data usage, refer to `permission-justifications.md` for the relevant text.

---

## Exporting screenshots

Chrome Web Store screenshots must be exactly **1280 × 800 px** or **640 × 400 px** (PNG or JPEG, no transparency for JPEGs). Three methods:

### Option A — Chrome screenshot (quickest for SVG/HTML mockups)

1. Open the `.svg` file in Chrome (`File > Open File`).
2. Open DevTools (`Cmd+Opt+I` on macOS), click the device-toolbar icon, and set the viewport to **1280 × 800**.
3. In DevTools, open the Command Palette (`Cmd+Shift+P`) and run **"Capture full size screenshot"** — this saves a PNG at the exact viewport size.

### Option B — `rsvg-convert` (command line, requires `librsvg`)

```bash
rsvg-convert -w 1280 -h 800 input.svg > output.png
```

Install on macOS with Homebrew: `brew install librsvg`.

### Option C — Inkscape or Figma

- **Inkscape:** `File > Export PNG Image`, set width 1280 and height 800, export.
- **Figma:** Create a frame at 1280 × 800, place the artwork, then `File > Export` as PNG at 1×.

> Note: the store also accepts 640 × 400 screenshots at the smaller size; all screenshots in a single submission must use the same dimensions.
