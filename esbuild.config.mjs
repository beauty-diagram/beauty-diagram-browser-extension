import { build, context } from 'esbuild'

const prod = process.argv.includes('production')
const shared = {
  bundle: true,
  format: 'iife',
  target: 'chrome110',
  sourcemap: !prod,
  minify: prod,
  logLevel: 'info',
}
const entries = [
  { in: 'src/content.ts', out: 'dist/content.js' },
  { in: 'src/background.ts', out: 'dist/background.js' },
  { in: 'src/options.ts', out: 'dist/options.js' },
]

if (prod) {
  await Promise.all(entries.map((e) => build({ ...shared, entryPoints: [e.in], outfile: e.out })))
} else {
  const ctxs = await Promise.all(
    entries.map((e) => context({ ...shared, entryPoints: [e.in], outfile: e.out })),
  )
  await Promise.all(ctxs.map((c) => c.watch()))
  console.log('esbuild watching…')
}
