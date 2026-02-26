import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const outputArgIndex = process.argv.findIndex((arg) => arg === '--out' || arg === '--output')
const outputDirName =
  (outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : null) ??
  process.env.PAGES_OUTPUT_DIR ??
  'docs'

if (!outputDirName || ['.', '..', '/', '\\'].includes(outputDirName)) {
  throw new Error(`Invalid output directory: "${outputDirName}"`)
}

const outputDir = join(rootDir, outputDirName)

const appDistTargets = [
  { name: 'hub', distPath: join(rootDir, 'apps/hub/dist'), targetSubdir: '' },
  {
    name: 'class-clock',
    distPath: join(rootDir, 'apps/class-clock/dist'),
    targetSubdir: 'class-clock',
  },
  {
    name: 'read-along-highlighter',
    distPath: join(rootDir, 'apps/read-along-highlighter/dist'),
    targetSubdir: 'read-along-highlighter',
  },
  {
    name: 'launchpad-whack-a-mole',
    distPath: join(rootDir, 'apps/launchpad-whack-a-mole/dist'),
    targetSubdir: 'launchpad-whack-a-mole',
  },
  {
    name: 'fish-visualizer',
    distPath: join(rootDir, 'apps/fish-visualizer/dist'),
    targetSubdir: 'fish-visualizer',
  },
  {
    name: 'launchpad-controller',
    distPath: join(rootDir, 'apps/launchpad-controller/dist'),
    targetSubdir: 'launchpad-controller',
  },
]

console.log(`Assembling Pages output into ${outputDirName}/`)

if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true })
}
mkdirSync(outputDir, { recursive: true })

for (const app of appDistTargets) {
  if (!existsSync(app.distPath)) {
    throw new Error(`Missing build output for ${app.name}: ${app.distPath}`)
  }

  const targetPath = app.targetSubdir ? join(outputDir, app.targetSubdir) : outputDir
  cpSync(app.distPath, targetPath, { recursive: true })
  console.log(`  Copied ${app.name} -> ${app.targetSubdir || '.'}`)
}

writeFileSync(join(outputDir, '.nojekyll'), '', 'utf8')
console.log(`Added ${outputDirName}/.nojekyll`)
