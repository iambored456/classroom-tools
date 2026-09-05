import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

import { chromium } from 'playwright'

import { startStaticServer } from './lib/static-server.ts'

const rootDir = resolve(import.meta.dirname, '..')
const docsDir = resolve(rootDir, 'docs')

const normalizeBase = (value: string | undefined) => {
  if (!value || value === '/') return '/'
  return `/${value.replace(/^\/+|\/+$/g, '')}/`
}

const rootBase = normalizeBase(process.env.PAGES_ROOT_BASE)
const server = await startStaticServer({
  rootDir: docsDir,
  basePath: rootBase,
  host: '127.0.0.1',
})
const browser = await chromium.launch({ headless: true })

try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } })
  const page = await context.newPage()
  const hubUrl = `${server.url}${rootBase}`
  await page.goto(hubUrl, { waitUntil: 'networkidle' })

  const links = await page.locator('a.preview-link').evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      label: anchor.getAttribute('aria-label') ?? anchor.textContent?.trim() ?? 'Unnamed app',
      href: (anchor as HTMLAnchorElement).href,
    })),
  )

  assert.ok(links.length > 0, 'The assembled hub did not render any app links.')

  for (const link of links) {
    const pathname = new URL(link.href).pathname
    assert.ok(pathname.startsWith(rootBase), `${link.label} points outside the Pages base: ${pathname}`)

    const appPath = pathname.slice(rootBase.length).replace(/^\/+|\/+$/g, '')
    assert.ok(appPath, `${link.label} points back to the hub instead of an app.`)

    const indexPath = resolve(docsDir, appPath, 'index.html')
    const relativePath = relative(docsDir, indexPath)
    assert.ok(!relativePath.startsWith('..'), `${link.label} resolves outside docs/.`)
    await access(indexPath)

    await page.goto(hubUrl, { waitUntil: 'networkidle' })
    const responsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname === pathname,
    )
    await page.getByRole('link', { name: link.label, exact: true }).click()
    const response = await responsePromise
    assert.ok(response.ok(), `${link.label} returned HTTP ${response.status()}.`)
    assert.notEqual(await page.title(), 'Classroom Tools', `${link.label} reopened the hub instead of its app.`)
  }

  console.log(`Verified ${links.length} assembled hub destinations.`)
  await context.close()
} finally {
  await browser.close()
  await server.stop()
}
