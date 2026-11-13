import qrcode from 'qrcode-generator'
import './qr-share.css'

type ShareTarget = { title: string; app: string; hash?: string }

const publishedBase = 'https://iambored456.github.io/classroom-tools/'
const qrIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx=".5"/><rect x="15" y="3" width="6" height="6" rx=".5"/><rect x="3" y="15" width="6" height="6" rx=".5"/><path d="M15 15h3v3h3v3h-6v-3h-3v-3M12 3v3m0 3v3h6m3 0v3M3 12h3m3 0h3m0 9v-3"/></svg>'

function shareUrl(href: string, { app, hash }: ShareTarget) {
  const current = new URL(href)
  const { hostname, protocol } = current
  const local = hostname === 'localhost' || hostname.endsWith('.localhost') ||
    /^127\./.test(hostname) || ['[::1]', '0.0.0.0'].includes(hostname)
  const url = local || !['http:', 'https:'].includes(protocol)
    ? new URL(`${app}/`, publishedBase)
    : current
  url.search = ''
  url.hash = hash ?? ''
  return url.href
}

let nextDialogId = 0

export function qrShare(button: HTMLButtonElement, target: ShareTarget) {
  const id = `tool-qr-${++nextDialogId}`
  button.classList.add('tool-qr-button')
  button.innerHTML = qrIcon
  button.title = 'Show QR code'
  button.setAttribute('aria-haspopup', 'dialog')
  button.setAttribute('aria-controls', id)

  const dialog = document.createElement('dialog')
  dialog.id = id
  dialog.className = 'tool-qr-dialog'
  dialog.setAttribute('aria-labelledby', `${id}-title`)
  dialog.setAttribute('aria-describedby', `${id}-instructions`)
  dialog.innerHTML = `<form method="dialog" class="tool-qr-heading"><h2 id="${id}-title"></h2><button type="submit" aria-label="Close QR code" autofocus>×</button></form><p id="${id}-instructions">Scan with your camera to open this page.</p><div class="tool-qr-code" role="img"></div><a class="tool-qr-url"></a>`
  const heading = dialog.querySelector('h2')!
  const image = dialog.querySelector('.tool-qr-code')!
  const link = dialog.querySelector('a')!

  function update(next: ShareTarget) {
    target = next
    button.setAttribute('aria-label', `Show QR code for ${target.title}`)
    heading.textContent = target.title
    image.setAttribute('aria-label', `QR code linking to ${target.title}`)
    if (dialog.open) dialog.close()
  }

  function open() {
    const url = shareUrl(window.location.href, target)
    const code = qrcode(0, 'M')
    code.addData(url)
    code.make()
    image.innerHTML = code.createSvgTag({ cellSize: 8, margin: 32, scalable: true })
    image.querySelector('svg')?.setAttribute('aria-hidden', 'true')
    link.href = url
    link.textContent = url
    dialog.showModal()
  }

  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
  })

  button.after(dialog)
  button.addEventListener('click', open)
  update(target)
  return {
    update,
    destroy() {
      button.removeEventListener('click', open)
      dialog.remove()
    },
  }
}
