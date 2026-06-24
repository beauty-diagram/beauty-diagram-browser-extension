import { build, context } from 'esbuild'

const prod = process.argv.includes('production')
const shared = {
  bundle: true,
  target: 'chrome110',
  sourcemap: !prod,
  minify: prod,
  logLevel: 'info',
}
// Content scripts + options page load as classic scripts → IIFE.
// The MV3 background is declared "type": "module" in manifest.json → ESM.
const entries = [
  { in: 'src/content.ts', out: 'dist/content.js', format: 'iife' },
  { in: 'src/background.ts', out: 'dist/background.js', format: 'esm' },
  { in: 'src/options.ts', out: 'dist/options.js', format: 'iife' },
]

if (prod) {
  await Promise.all(entries.map((e) => build({ ...shared, format: e.format, entryPoints: [e.in], outfile: e.out })))
} else {
  const ctxs = await Promise.all(
    entries.map((e) => context({ ...shared, format: e.format, entryPoints: [e.in], outfile: e.out })),
  )
  await Promise.all(ctxs.map((c) => c.watch()))
  process.on('SIGINT', async () => { await Promise.all(ctxs.map((c) => c.dispose())); process.exit(0) })
  console.log('esbuild watching…')
}
