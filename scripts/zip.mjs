// scripts/zip.mjs — bundle the distributable extension zip
import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const ZIP = 'beauty-diagram-browser-extension.zip'
const files = ['manifest.json', 'options.html', 'content.css', 'dist', 'icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png']

// Remove any stale zip first — `zip -r` updates in place and would otherwise
// keep entries that are no longer in the file list.
rmSync(ZIP, { force: true })
execSync(`zip -r ${ZIP} ${files.join(' ')}`, { stdio: 'inherit' })
