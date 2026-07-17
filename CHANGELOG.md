# Changelog

## 0.1.2
- Verify key now pre-checks watermark-free readiness (owner plan tier + the "Create share links" scope), so a mis-scoped or free-plan key is flagged before renders come back watermarked.
- Share mint failures log the reason (no-api-key / http-401 / http-403 / network) to the page console instead of silently falling back to a watermarked render.
- Options: warn on Save when Watermark-free is enabled without an API key; corrected the API-key placeholder (`bd_live_…`) and hint copy.

## 0.1.1
- Inline toolbar with click / ⤢ zoom lightbox; hardened toolbar visibility on host pages.
- Packaging fix: include the toolbar popup in the extension zip.

## 0.1.0
- Initial release: in-place mermaid/plantuml beautification on GitHub + GitLab, generic source-block detection for other sites (opt-in), preview/source toggle, open-in-editor.
