const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function requestPageTitle(url: string, timeoutMs = 5_000): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: { accept: 'text/html' },
      signal: controller.signal,
    })
    if (!response.ok) {
      await response.body?.cancel()
      return `HTTP ${response.status}`
    }
    const html = await response.text()
    return html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? '(page without a title)'
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function waitForPageTitle(url: string, wantedTitle: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  let actualTitle: string | null = null

  while (Date.now() < deadline) {
    actualTitle = await requestPageTitle(url, Math.min(5_000, deadline - Date.now()))
    if (actualTitle === wantedTitle) return { ready: true, actualTitle }
    const remaining = deadline - Date.now()
    if (remaining > 0) await delay(Math.min(200, remaining))
  }

  return { ready: false, actualTitle }
}
