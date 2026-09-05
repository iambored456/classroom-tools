import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const appsDir = join(rootDir, 'apps')

const outputArgIndex = process.argv.findIndex((arg) => arg === '--out' || arg === '--output')
const outputDirName =
  (outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : null) ??
  process.env.PAGES_OUTPUT_DIR ??
  'docs'

if (!outputDirName || ['.', '..', '/', '\\'].includes(outputDirName)) {
  throw new Error(`Invalid output directory: "${outputDirName}"`)
}

const outputDir = join(rootDir, outputDirName)

const standaloneTargets = readdirSync(appsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'hub')
  .filter((entry) => {
    try {
      const pkg = JSON.parse(readFileSync(join(appsDir, entry.name, 'package.json'), 'utf8'))
      return typeof pkg.scripts?.build === 'string'
    } catch {
      return false
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((entry) => ({
    name: entry.name,
    distPath: join(appsDir, entry.name, 'dist'),
    targetSubdir: entry.name,
  }))

const appDistTargets = [
  { name: 'hub', distPath: join(appsDir, 'hub', 'dist'), targetSubdir: '' },
  ...standaloneTargets,
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
