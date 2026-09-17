import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MAX_PACKAGE_BYTES, parseSet } from '../apps/face-to-name/src/model.ts'

const args = process.argv.slice(2).filter(arg => arg !== '--')
if (args.length !== 1) throw new Error('Usage: pnpm publish:face-set -- "path/to/exported-set.json"')
const source = resolve(args[0])
if (statSync(source).size > MAX_PACKAGE_BYTES) throw new Error('The set file must be smaller than 50 MB.')
const set = parseSet(JSON.parse(readFileSync(source, 'utf8')))
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destination = resolve(root, 'apps/face-to-name/public/sets', `${set.id}.json`)
mkdirSync(dirname(destination), { recursive: true })
writeFileSync(destination, JSON.stringify(set), 'utf8')
console.log(`Prepared “${set.title}” (${set.people.length} people) for publishing.`)
console.log(`Practice path: face-to-name/?set=${encodeURIComponent(set.id)}`)
console.log('Run pnpm build:pages, then publish the updated site through your usual GitHub Pages process.')
console.log('Publishing this same set ID again updates its existing link.')
