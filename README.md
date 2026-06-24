# Beauty Diagram — Browser Extension

Beautify Mermaid & PlantUML diagrams in-place on GitHub, GitLab, Jira and Confluence.
The extension swaps the native render for a Beauty Diagram themed SVG, with a
preview ⇄ source toggle and an "Open in editor" link. It never modifies the page source.

- **Default sites:** github.com, gitlab.com (auto). Other sites: click the toolbar icon to grant access.
- **Render path (v1):** anonymous `/v1/beautify.svg` (watermarked). Local-engine render is on the roadmap.
- **Privacy:** diagram source is sent to api.beauty-diagram.com only on sites you enable. See options.

## Develop

    npm install
    npm run dev        # esbuild watch → dist/
    # chrome://extensions → Load unpacked → this folder

## Test

    npm test

See the design spec in the main app repo: `docs/superpowers/specs/2026-06-24-browser-extension-reader-enhancement-design.md`.
