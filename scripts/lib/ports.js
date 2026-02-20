import { createServer } from 'node:net'

export async function findFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()

    server.on('error', reject)
    server.listen(0, host, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Could not resolve a free TCP port.'))
        return
      }

      const port = address.port
      server.close((closeError) => {
        if (closeError) {
          reject(closeError)
          return
        }
        resolve(port)
      })
    })
  })
}
