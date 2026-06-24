# Privacy policy — Beauty Diagram browser extension

**Effective date:** 2026-06-25
**Hosted at:** https://www.beauty-diagram.com/privacy/extension

---

## 1. Overview

Beauty Diagram is a browser extension that beautifies Mermaid and PlantUML diagrams on web pages you visit. This policy explains exactly what data the extension touches, what it does not collect, and how your information is handled.

---

## 2. Data processed

### 2.1 Diagram source text

When you render a diagram — either automatically on a built-in supported site or by clicking the **◇ Render** button — the extension sends the **diagram source text** (e.g., the Mermaid or PlantUML markup) to the Beauty Diagram API at `https://api.beauty-diagram.com`. The API returns an SVG image, which the extension displays in the page.

- Only the source text of diagrams that are actually rendered is transmitted.
- No surrounding page content is read or sent.
- No browsing history is accessed or transmitted.
- Requests are made over HTTPS.

### 2.2 Extension settings

The following settings are stored in **`chrome.storage.sync`** and synced across your Chrome profiles:

- Theme preference
- Max-width value
- Whether to replace the original rendered element
- Whether to handle PlantUML diagrams
- Whether watermark-free output is enabled
- API base URL

These values are stored locally by Chrome and synced via your Google account's Chrome sync if you have it enabled. Beauty Diagram does not have access to your Chrome sync data; sync is managed entirely by Google.

### 2.3 Per-site enable flags

Whether you have enabled the extension for a specific non-built-in site is stored in **`chrome.storage.local`** on your device only. This data is never synced and never transmitted to any server.

### 2.4 Optional Pro API key

If you enter a Pro API key in the extension options:

- It is stored exclusively in **`chrome.storage.local`** on your device.
- It is **never** synced to any remote storage.
- It is **never** logged, cached, or transmitted anywhere other than as a `Bearer` token in requests to the configured API base URL (`api.beauty-diagram.com` by default).
- You can clear it at any time from the extension options page.

---

## 3. Data we do not collect

Beauty Diagram does **not** collect, store, or transmit any of the following:

- Browsing history or URLs of pages you visit
- Page content other than the specific diagram source text described above
- Personal identification information (name, email address, location, etc.)
- Analytics or telemetry about your usage of the extension
- Advertising identifiers or tracking data

We do not sell, rent, or share any data with third parties for advertising or any commercial purpose.

---

## 4. Third-party services

The only external service contacted by the extension is **api.beauty-diagram.com**, which is operated by the same developer who publishes this extension. No data is sent to any other third-party server.

If you use a custom `apiBase` setting in the extension options, diagram source text will be sent to that URL instead. You are responsible for reviewing the privacy practices of any custom endpoint you configure.

---

## 5. Data retention

Diagram source text sent to the API is used solely to generate the SVG response and is not retained by the API beyond the duration of the request.

Settings stored in `chrome.storage.sync` persist until you clear them from the extension options or uninstall the extension. Data in `chrome.storage.local` (per-site flags and API key) is removed when you uninstall the extension or clear it manually.

---

## 6. Children's privacy

This extension is not directed at children under the age of 13, and we do not knowingly collect any information from children.

---

## 7. Changes to this policy

If we make material changes to this policy, we will update the effective date at the top of this page. We encourage you to review this page periodically.

---

## 8. Contact

If you have questions about this privacy policy, please contact:

**Email:** service@beauty-diagram.com
**Website:** https://www.beauty-diagram.com
