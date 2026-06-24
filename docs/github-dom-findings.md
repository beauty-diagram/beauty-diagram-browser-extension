# GitHub rendered-mermaid DOM — spike findings (2026-06-24)

Captured from a live GitHub page showing a rendered ` ```mermaid ` block.
Fixture: [`tests/fixtures/github-readme.html`](../tests/fixtures/github-readme.html).

## Structure

GitHub wraps each rendered mermaid block in a `<section>`:

```
<section class="js-render-needs-enrichment render-needs-enrichment ..."
         data-type="mermaid"
         aria-label="mermaid rendered output container">
  <div class="js-render-enrichment-target"
       data-plain="flowchart LR …"          ← raw source (plain text)
       data-json='{"data":"flowchart LR …"}'>
    <div class="js-render-block-actions">
      <details>… fullscreen …</details>
      <clipboard-copy value="flowchart LR …"> … </clipboard-copy>   ← raw source
    </div>
    <div class="render-container js-render-target" data-type="mermaid">
      <iframe class="render-viewer"
              src="https://viewscreen.githubusercontent.com/markdown/mermaid#…">
      </iframe>                                ← the actual rendered diagram (CROSS-ORIGIN iframe)
    </div>
  </div>
  <span class="js-render-enrichment-loader" hidden>…</span>
  <div class="js-render-enrichment-fallback">
    <div class="render-plaintext-hidden">
      <pre lang="mermaid">flowchart LR …</pre>  ← raw source (fallback)
    </div>
  </div>
</section>
```

## Key implications

1. **The rendered diagram lives in a cross-origin sandboxed iframe** (`viewscreen.githubusercontent.com`). The content script cannot read into it, and **the generic Detector B (`svg[id^="mermaid-"]`, `svg[aria-roledescription]`, `.mermaid > svg`) finds NOTHING** in the host document — there is no mermaid SVG in the main page. ⇒ GitHub needs quirk-supplied node detection, not generic Detector B.
2. **Source recovery is easy** — three vectors, each carrying the full source (entity-decoded on `getAttribute`/`textContent`):
   - `.js-render-enrichment-target[data-plain]` ← **preferred**
   - `clipboard-copy[value]`
   - `pre[lang="mermaid"]` `textContent` (fallback)
3. `data-plain`, `clipboard-copy`, and the fallback `<pre>` are **server-rendered and present at `document_idle`**, before the iframe enriches — so we can detect + replace before the iframe even loads.
4. There are **two elements with `data-type="mermaid"`** (the outer `<section>` and the inner `.render-container`). Disambiguate by the `js-render-needs-enrichment` class, which is only on the `<section>`.

## Design decisions for `src/quirks/github.ts`

- **Add `detectRendered?: (root: ParentNode) => Element[]` to `SiteQuirks`.** `content.ts` B-path uses `quirks.detectRendered ?? detectRenderedDiagrams`.
- `githubQuirks.detectRendered(root)` = `[...root.querySelectorAll('.js-render-needs-enrichment[data-type="mermaid"]')]` (the `<section>`).
- `recoverSource(section)` = `data-plain` → `clipboard-copy[value]` → `pre[lang="mermaid"].textContent`, first non-empty wins.
- `renderMode: 'inline-svg'` — GitHub CSP blocks external `<img src>`; the background fetch + inline `<svg>` injection bypasses both CORS and `img-src`.
- **No `hideNativeRender`** — `processHit` replaces the whole `<section>` with the `.bd-mount`, which removes the iframe entirely.
- **No `spaNav`** — the generic observer already hooks `turbo:load`; a second hook would double-fire (per Bundle 5 review). Rely on the observer.

## Source-text note

The captured source contains mermaid label HTML (`<br/>`) and edges (`-->`), stored in the
attributes/text as HTML entities (`&lt;br/&gt;`, `--&gt;`). `getAttribute('data-plain')` and
`pre.textContent` both return the **entity-decoded** string, i.e. literal `<br/>` and `-->`,
which is the correct mermaid source to send to `/v1/beautify.svg`.
