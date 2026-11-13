import diagnosticsUrl from '../animation-diagnostics.js?url&no-inline'

interface DiagnosticRecorder {
  version: string
  snapshot(note?: string): unknown
  stop(): unknown
  download(): void
  text(): string
}

type DiagnosticShortcut = (() => Promise<DiagnosticRecorder>) & {
  mark(note?: string): unknown
  stop(): unknown
  save(): void
}

declare global {
  interface Window {
    nd: DiagnosticShortcut
    numeracyDiagnostics?: DiagnosticRecorder
  }
}

// Load the recorder when a visualization opens; keep the landing page idle.
export function installAnimationDiagnostics() {
  let pending: Promise<DiagnosticRecorder> | undefined
  const current = () => {
    if (!window.numeracyDiagnostics) {
      console.info('[Numeracy diagnostics] Run nd() first to start recording.')
    }
    return window.numeracyDiagnostics
  }
  const start = () => {
    if (pending) return pending
    const previous = window.numeracyDiagnostics
    pending = new Promise<DiagnosticRecorder>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = diagnosticsUrl
      script.async = true
      const finish = () => {
        script.onload = null
        script.onerror = null
        script.remove()
      }
      script.onload = () => {
        finish()
        const recorder = window.numeracyDiagnostics
        if (!recorder || recorder === previous) {
          reject(new Error('The diagnostic recorder did not start. Check the preceding Console errors.'))
          return
        }
        console.info('[Numeracy diagnostics] A plain-text report will appear automatically after 60 seconds. Copy through END REPORT.')
        resolve(recorder)
      }
      script.onerror = () => {
        finish()
        reject(new Error('The diagnostic script could not load. Check the Console and Network errors, then retry nd().'))
      }
      document.head.append(script)
    }).finally(() => { pending = undefined })
    return pending
  }
  window.nd = Object.assign(start, {
    mark: (note = 'broken here') => current()?.snapshot(note),
    stop: () => current()?.stop(),
    save: () => current()?.download(),
  })
  // Start on direct links and when entering a visualization from the landing page.
  // The explicit 0 flag remains available for a comparison without instrumentation.
  const flag = new URLSearchParams(window.location.search).get('debugAnimations')
  const visualization = () => ['#substitution-visualization', '#transformations-visualization']
    .includes(window.location.hash)
  const automatic = () => flag !== '0' && (visualization() || flag === '1')
  const onRoute = () => {
    if (flag === '0') return
    if (!automatic()) {
      window.numeracyDiagnostics?.stop()
      return
    }
    void start().then(recorder => {
      // Navigation may have left the visualization while the asset was loading.
      if (!automatic()) recorder.stop()
    }).catch(error => console.error('[Numeracy diagnostics]', error))
  }
  window.addEventListener('hashchange', onRoute)
  onRoute()
}
