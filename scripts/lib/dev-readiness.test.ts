import assert from 'node:assert/strict'
import { createServer, type RequestListener } from 'node:http'
import test from 'node:test'

import { requestPageTitle, waitForPageTitle } from './dev-readiness.ts'

async function withServer(handler: RequestListener, run: (url: string) => Promise<void>) {
  const server = createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')

  try {
    await run(`http://127.0.0.1:${address.port}/app/`)
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

test('allows cold-start HTML responses slower than one second', async () => {
  await withServer((_request, response) => {
    setTimeout(() => response.end('<title>Expected App</title>'), 1_100)
  }, async (url) => {
    assert.deepEqual(await waitForPageTitle(url, 'Expected App', 3_000), {
      ready: true, actualTitle: 'Expected App',
    })
  })
})

test('retries a proxy that is not ready yet', async () => {
  let requests = 0
  await withServer((_request, response) => {
    if (++requests === 1) {
      response.writeHead(503)
      response.end('Starting')
      return
    }
    response.end('<title>Expected App</title>')
  }, async (url) => {
    assert.equal((await waitForPageTitle(url, 'Expected App', 2_000)).ready, true)
    assert.equal(requests, 2)
  })
})

test('reports a persistently incorrect route after the readiness deadline', async () => {
  await withServer((_request, response) => response.end('<title>Hub</title>'), async (url) => {
    assert.deepEqual(await waitForPageTitle(url, 'Expected App', 450), {
      ready: false, actualTitle: 'Hub',
    })
  })
})

test('bounds requests that never finish sending their HTML', async () => {
  await withServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.write('<html>')
  }, async (url) => {
    assert.equal(await requestPageTitle(url, 100), null)
    const started = Date.now()
    assert.deepEqual(await waitForPageTitle(url, 'Expected App', 150), {
      ready: false, actualTitle: null,
    })
    assert.ok(Date.now() - started < 2_000, 'The readiness deadline should abort a hanging response')
  })
})
