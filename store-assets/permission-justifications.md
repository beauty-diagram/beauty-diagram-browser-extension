# Permission justifications — Beauty Diagram

> **Usage:** Paste each section into the corresponding field of the Chrome Web Store Developer Dashboard during submission. These texts are reviewed by Google and are not shown to end users.

---

## Single purpose

Beauty Diagram has a single purpose: to beautify Mermaid and PlantUML diagrams in-place on web pages. It detects diagram markup on supported pages, sends only that diagram source text to the Beauty Diagram rendering API, and replaces or annotates the diagram with the returned SVG image. All permissions exist exclusively to support this function.

---

## Permission: `storage`

The extension stores user preferences (theme, max-width, replace mode, PlantUML handling, watermark-free flag, API base URL) in `chrome.storage.sync` so settings persist across sessions and devices. Per-site opt-in flags and the optional Pro API key are stored in `chrome.storage.local` to keep them device-only and never synced. No page content or personal data is written to storage.

---

## Permission: `scripting`

The extension uses `chrome.scripting.executeScript` to inject the content script into pages that are not covered by the static `content_scripts` manifest declaration — specifically, pages on sites that the user has manually enabled via the popup. On built-in supported sites the content script is declared statically in the manifest; `scripting` is required to extend this to user-selected sites at runtime without requiring broad upfront host permissions.

---

## Permission: `activeTab`

`activeTab` is used to identify the URL of the current tab so the popup can show whether the extension is active on that site and allow the user to toggle per-site opt-in. It grants temporary access to the current tab only at the moment the popup is opened or a toolbar button is clicked — not persistently and not to any other tab.

---

## Host permission: `https://api.beauty-diagram.com/*`

This is the only host the extension contacts. All diagram rendering requests are sent here via `fetch`. The response is an SVG image displayed in the page. This is the developer's own service; no other external domain is accessed by the extension.

---

## Optional host permissions: `https://*/*` and `http://*/*`

These broad permissions are declared as **optional** and are **not** granted at install time. They are requested **at runtime, only when the user explicitly opts a specific non-built-in site into diagram beautification via the popup**. The extension then calls `chrome.permissions.request` for that specific origin to allow script injection. The default operating scope is limited to the curated built-in list declared in `content_scripts` in the manifest (GitHub, GitLab, *.atlassian.net, dev.to, Stack Overflow, *.stackexchange.com, Linear, *.hashnode.dev, ChatGPT, Claude, Gemini, Perplexity, www.beauty-diagram.com). The broad optional permissions make it possible for users to extend this list voluntarily, one site at a time, without the extension having blanket access to every site they visit.

---

## Web-accessible resources: `content.css` and `dist/*`

`content.css` must be accessible so the browser can inject the stylesheet into pages where the content script runs. `dist/*` is declared accessible because the content script module (`dist/content.js`) dynamically imports sibling build artifacts from the same directory. These resources are the extension's own bundled assets; no external content is served through this mechanism.

---

## Remote code

**No.** All JavaScript is bundled at build time and included in the extension package. The API endpoint (`api.beauty-diagram.com`) returns only SVG image data, which the extension inserts as an `<img>` element or inline SVG. No JavaScript is fetched from any remote server or evaluated at runtime.

---

## Data-usage disclosure

The following Chrome Web Store data-use declarations apply to this extension:

| Chrome data category | Used | Justification |
|---|---|---|
| Website content | Yes | The diagram source text extracted from the page is sent to the rendering API. |
| User activity | No | — |
| Personally identifiable information | No | — |
| Health information | No | — |
| Financial and payment information | No | — |
| Authentication information | No (see note) | The optional Pro API key is user-provided authentication to the developer's own service; it is stored locally and never transmitted to any third-party server. |
| Personal communications | No | — |
| Location | No | — |

**Certifications to check in the dashboard:**

- [x] I do not sell or transfer this data to third parties, outside of the approved use cases.
- [x] I do not use or transfer this data for purposes that are unrelated to my extension's single purpose.
- [x] I do not use or transfer this data to determine creditworthiness or for lending purposes.
