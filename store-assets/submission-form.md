# Chrome Web Store — 提交表單填寫指南（Beauty Diagram）

> 填表時開著這份照抄。長文字（description / 權限說明）用程式碼框包起來方便整段複製。

---

## ⚠️ 按下 Submit 之前（blockers，先處理）

1. **部署 `/privacy/extension`** — 頁面已 commit 但**尚未上線**。push `beauty-diagram-app` → Vercel，確認 `https://www.beauty-diagram.com/privacy/extension` 回 200。**隱私政策 URL 在審查時必須可公開存取**，這是最關鍵的前置。
2. **Support URL** — `/support` **不存在**；改用既有的 `https://www.beauty-diagram.com/faq`（確認可公開存取），或我幫你建一個 `/support` 頁。
3. **帳號層**：宣告 **Trader**，填公開聯絡資訊（`service@beauty-diagram.com` + 專用門號 + 商務/虛擬地址），並**驗證聯絡 email**。
4. **套件**：上傳 `beauty-diagram-browser-extension.zip`（重產：`npm run build && node scripts/zip.mjs`，內容含最新 zoom/toolbar）。

---

## 0. 帳號層（一次性）

- **Trader status**：Trader（freemium 商業產品）
- **Public contact**：email `service@beauty-diagram.com`；phone `<專用門號>`；address `<商務/虛擬地址>`
- **Contact email verification**：驗證 `service@beauty-diagram.com`

---

## 1. Store listing 分頁

- **Product name**：`Beauty Diagram`
- **Summary（≤132 字元）**：

```
Beautify Mermaid & PlantUML diagrams in-place on GitHub, GitLab and other developer sites.
```

- **Description（詳細說明）**：

```
Beauty Diagram re-renders Mermaid and PlantUML diagrams directly on the pages you already read. No copy-pasting and no separate tab — the improved diagram replaces the original right where it appears, and the original source stays one click away.

It runs automatically on its built-in supported sites, such as GitHub and GitLab, and you can switch it on for any other site — an internal wiki, a custom docs portal — from the popup with a single click. Raw code blocks (fenced ```mermaid``` or ```plantuml``` that have not yet been rendered) are never auto-processed: they show a small ◇ Render button so you decide which diagrams get beautified.

The rendering is done by the Beauty Diagram API (api.beauty-diagram.com), the same service behind the VS Code and Obsidian Beauty Diagram plugins. Only the diagram source text is sent — no page content, no browsing history, no personal data. An optional Pro API key removes the render watermark; it is stored only in your browser's local storage, never synced or logged.

Features
- In-place beautification — diagrams update on the page, no new tab needed
- ◇ Render opt-in button for raw code blocks (never auto-rendered)
- Automatic on 13 built-in sites; per-site toggle for any other site via the popup
- Supports both Mermaid and PlantUML
- Theme selector and max-width control
- Original diagram source is always kept and accessible
- Optional Pro API key for watermark-free output
- No account required, no analytics, no ads
```

- **Category**：Developer Tools
- **Language**：English
- **Store icon（128×128）**：`icon-128.png`
- **Screenshots（1280×800，全用同尺寸）**：
  - `store-assets/01-hero.png`
  - `store-assets/02-one-click.png`
  - `store-assets/03-works-everywhere.png`
  - `store-assets/04-keep-source.png`
  - `store-assets/05-themes.png`
- **Small promotional tile（440×280，選填但建議）**：`store-assets/06-promo-tile-440x280.png`
- **Official / Homepage URL**：`https://www.beauty-diagram.com`
- **Support URL**：`https://www.beauty-diagram.com/faq`（**`/support` 不存在**，改用既有的 `/faq`；先確認可公開存取）。備援：GitHub issues（需 repo 公開）或留空、改填 support email `service@beauty-diagram.com`。

---

## 2. Privacy practices 分頁

- **Single purpose**：

```
Beauty Diagram has a single purpose: to beautify Mermaid and PlantUML diagrams in-place on web pages. It detects diagram markup on supported pages, sends only that diagram source text to the Beauty Diagram rendering API, and replaces or annotates the diagram with the returned SVG image. All permissions exist exclusively to support this function.
```

- **Permission justifications（逐欄貼）**

`storage`：
```
The extension stores user preferences (theme, max-width, replace mode, PlantUML handling, watermark-free flag, API base URL) in chrome.storage.sync so settings persist across sessions and devices. Per-site opt-in flags and the optional Pro API key are stored in chrome.storage.local to keep them device-only and never synced. No page content or personal data is written to storage.
```

`scripting`：
```
The extension uses chrome.scripting to inject the content script into pages that are not covered by the static content_scripts manifest declaration — specifically, pages on sites that the user has manually enabled via the popup. On built-in supported sites the content script is declared statically in the manifest; scripting is required to extend this to user-selected sites at runtime without requiring broad upfront host permissions.
```

`activeTab`：
```
activeTab is used to identify the URL of the current tab so the popup can show whether the extension is active on that site and allow the user to toggle per-site opt-in. It grants temporary access to the current tab only at the moment the popup is opened — not persistently and not to any other tab.
```

Host permission `https://api.beauty-diagram.com/*`：
```
This is the only host the extension contacts. All diagram rendering requests are sent here via fetch. The response is an SVG image displayed in the page. This is the developer's own service; no other external domain is accessed by the extension.
```

Optional host permissions `https://*/*` and `http://*/*`：
```
These broad permissions are declared as optional and are NOT granted at install time. They are requested at runtime, only when the user explicitly opts a specific non-built-in site into diagram beautification via the popup. The extension then calls chrome.permissions.request for that specific origin to allow script injection. The default operating scope is limited to the curated built-in list declared in content_scripts (GitHub, GitLab, *.atlassian.net, dev.to, Stack Overflow, *.stackexchange.com, Linear, *.hashnode.dev, ChatGPT, Claude, Gemini, Perplexity, www.beauty-diagram.com). The broad optional permissions let users extend this list voluntarily, one site at a time, without the extension having blanket access to every site they visit.
```

- **Are you using remote code?** → **No**
```
No. All JavaScript is bundled at build time and included in the extension package. The API endpoint (api.beauty-diagram.com) returns only SVG image data, which the extension inserts as an <img> element or inline SVG. No JavaScript is fetched from any remote server or evaluated at runtime.
```

- **Data usage（資料用途）**
  - **Website content** → ✅ Yes：「The diagram source text extracted from the page is sent to the rendering API.」
  - User activity / PII / Health / Financial / Authentication info / Personal communications / Location → **全部 No**
    - （備註：選填的 Pro API key 是使用者自填、連到開發者自家服務的憑證，僅存本機、不傳第三方——若被問起照此說明。）
  - **三個 certification 全部勾選**：
    - ✅ I do not sell or transfer this data to third parties, outside of the approved use cases.
    - ✅ I do not use or transfer this data for purposes unrelated to my extension's single purpose.
    - ✅ I do not use or transfer this data to determine creditworthiness or for lending purposes.

- **Privacy policy URL**：
```
https://www.beauty-diagram.com/privacy/extension
```

---

## 3. Distribution 分頁

- **Visibility**：Public（想先軟啟動可選 Unlisted）
- **Pricing**：Free
- **Regions**：All（含 EEA → 需上面 §0 的 trader 聯絡資訊）

---

## 提交後

- 等 **擴充本身的審查**（數小時～數天）；被問權限/資料時，回指本檔對應段落即可。
- 通過後可在 Distribution 用 staged rollout 控制放量。
