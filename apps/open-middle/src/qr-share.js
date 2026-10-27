import qrcode from 'qrcode-generator'

const publishedLandingUrl = 'https://iambored456.github.io/classroom-tools/open-middle/'

export function landingShareUrl(href) {
  const url = new URL(href)
  const localHost = url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
    /^127\./.test(url.hostname) || ['[::1]', '0.0.0.0'].includes(url.hostname)
  if (localHost || !['http:', 'https:'].includes(url.protocol)) return publishedLandingUrl
  url.hash = ''
  url.search = ''
  return url.href
}

export function questionShareUrl(href, questionId) {
  const url = new URL(landingShareUrl(href))
  url.hash = String(questionId)
  return url.href
}

export function mountQrShare(container, {question} = {}) {
  const title = question ? `#${question.displayId ?? question.id} · ${question.title}` : 'Open Middle Math'
  const button = document.createElement('button')
  button.type = 'button'
  button.id = 'qr-share'
  button.className = `icon ${question ? 'question-qr' : 'landing-qr'}`
  button.title = 'Show QR code'
  button.setAttribute('aria-label', `Show QR code for ${title}`)
  button.setAttribute('aria-haspopup', 'dialog')
  button.setAttribute('aria-controls', 'qr-share-dialog')
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx=".5"/><rect x="15" y="3" width="6" height="6" rx=".5"/><rect x="3" y="15" width="6" height="6" rx=".5"/><path d="M15 15h3v3h3v3h-6v-3h-3v-3M12 3v3m0 3v3h6m3 0v3M3 12h3m3 0h3m0 9v-3"/></svg>'

  const dialog = document.createElement('dialog')
  dialog.id = 'qr-share-dialog'
  dialog.className = 'qr-share-dialog'
  dialog.setAttribute('aria-labelledby', 'qr-share-title')
  dialog.setAttribute('aria-describedby', 'qr-share-instructions')
  dialog.innerHTML = `<form method="dialog" class="dialog-heading"><h2 id="qr-share-title"></h2><button class="close" aria-label="Close QR code" autofocus>×</button></form><p id="qr-share-instructions"></p><div class="qr-code" role="img"></div><a class="qr-share-url"></a>`
  dialog.querySelector('h2').textContent = title
  dialog.querySelector('#qr-share-instructions').textContent = question
    ? 'Scan with your iPad’s camera to open this question.'
    : 'Scan with your iPad’s camera to open the activities.'
  dialog.querySelector('.qr-code').setAttribute('aria-label', question
    ? `QR code linking to ${title}` : 'QR code linking to the Open Middle Math landing page')

  button.addEventListener('click', () => {
    const url = question ? questionShareUrl(window.location.href, question.id) : landingShareUrl(window.location.href)
    const code = qrcode(0, 'M')
    code.addData(url)
    code.make()
    dialog.querySelector('.qr-code').innerHTML = code.createSvgTag({cellSize: 8, margin: 32, scalable: true})
    dialog.querySelector('.qr-code svg').setAttribute('aria-hidden', 'true')
    const link = dialog.querySelector('.qr-share-url')
    link.href = url
    link.textContent = url
    dialog.showModal()
  })
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
  })
  container.insertBefore(button, container.querySelector('#fullscreen'))
  container.append(dialog)
}
