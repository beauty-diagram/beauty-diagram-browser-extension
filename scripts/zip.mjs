// scripts/zip.mjs — bundle the distributable extension zip
import { execSync } from 'node:child_process'
const files = ['manifest.json', 'options.html', 'content.css', 'dist', 'icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png']
execSync(`zip -r beauty-diagram-browser-extension.zip ${files.join(' ')}`, { stdio: 'inherit' })
