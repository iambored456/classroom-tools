(() => {
  'use strict';
  // Loaded automatically by the app; also works when pasted into DevTools.
  const VERSION = 'numeracy-console-2026-11-13-v2';
  const LIMIT_MS = 60000;
  const PREFIX = '[Numeracy diagnostics]';
  if (window.numeracyDiagnostics?.version?.startsWith('numeracy-console-')) {
    window.numeracyDiagnostics.stop();
  } else if (window.numeracyDiagnostics) {
    console.warn(PREFIX, 'An unrelated window.numeracyDiagnostics already exists. Reload before installing.');
    return;
  }

  const started = performance.now();
  const round = value => Number.isFinite(value) ? Math.round(value * 1000) / 1000 : String(value);
  const safely = operation => {
    try { return operation(); } catch (error) { return { unavailable: String(error) }; }
  };
  // Exclude query parameters, which can contain account/session information.
  const cleanUrl = value => safely(() => {
    const url = new URL(value, location.href);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.origin + url.pathname : url.protocol;
  });
  const rect = value => value && Object.fromEntries(
    ['x', 'y', 'width', 'height'].map(key => [key, round(value[key])]));
  const matrix = value => value && Object.fromEntries(
    ['a', 'b', 'c', 'd', 'e', 'f'].map(key => [key, round(value[key])]));
  const label = node => node instanceof Element
    ? node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') +
      (node.getAttribute('class') ? '.' + node.getAttribute('class').trim().replace(/\s+/g, '.') : '')
    : String(node);
  const describeError = error => error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : String(error).slice(0, 2000);
  const root = () => document.querySelector('main.substitution, main.transformations') ||
    document.querySelector('#app') || document.body;
  const scene = () => root().querySelector('svg.scene, .graph > svg');
  const report = {
    version: VERSION, startedAt: new Date().toISOString(),
    page: cleanUrl(location.href), initialRoute: location.hash,
    limits: { durationMs: LIMIT_MS, events: 400, snapshots: 20, svgNodesPerSnapshot: 160 },
    notes: [
      'Read-only observation; no animation settings or browser settings changed. No uploads.',
      'SVG geometry and feature support do not prove correct GPU painting.',
      'Frame intervals measure requestAnimationFrame delivery, not actual painted frames.',
      'DevTools and diagnostic sampling can add overhead. Compare against a working laptop.',
      'Only errors occurring after installation are captured; preserve earlier Console errors separately.',
      'Errors may contain URLs or local details; review the report before sharing.',
      'Zero sizes or opacity can be intentional during animation; snapshots preserve context.'
    ],
    environment: {}, events: [], frames: [], samples: [], snapshots: [],
    dropped: { events: 0, snapshots: 0 }
  };
  let active = true;
  let frameId = 0;
  let previousFrame = 0;
  let intervals = [];
  let frameCount = 0;
  let maxGap = 0;
  let slowFrames = 0;
  let sampleTimer;
  let deadline;
  let lastAutoSnapshot = 0;
  let lastConsoleSample = 0;
  const cleanup = [];
  function event(type, data) {
    const entry = { ms: round(performance.now() - started), type, data };
    if (report.events.length < 400) report.events.push(entry);
    else report.dropped.events++;
    if (/error|rejection|violation/.test(type)) console.warn(PREFIX + ' ' + type + ' ' + JSON.stringify(data));
  }
  function listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    cleanup.push(() => target.removeEventListener(type, callback, options));
  }
  function state() {
    const container = root();
    return {
      route: location.hash, visibility: document.visibilityState,
      title: container.querySelector('svg > title')?.textContent,
      progress: container.querySelector('#substitution-progress')?.value,
      playButton: container.querySelector('button.play')?.textContent?.trim(),
      speed: container.querySelector('select[aria-label="Animation speed"]')?.value,
      parameters: [...container.querySelectorAll('[role="slider"]')].map(node => ({
        name: node.getAttribute('aria-label'), value: node.getAttribute('aria-valuenow')
      })),
      transforms: [...container.querySelectorAll('.substitution-equation, .chest, .equation.accent')].map(node => ({
        node: label(node), transform: node.getAttribute('transform'), opacity: node.getAttribute('opacity')
      })),
      graphPath: (() => {
        const value = container.querySelector('.transformed-curve')?.getAttribute('d');
        // Hash the path to show whether it changes without logging thousands of coordinates.
        let hash = 0;
        for (let i = 0; value && i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
        return value == null ? null : { length: value.length, hash };
      })()
    };
  }
  function nodeDetails(node) {
    const style = getComputedStyle(node);
    const properties = ['display', 'visibility', 'opacity', 'overflow', 'overflow-x', 'overflow-y',
      'width', 'height', 'min-height', 'max-height', 'transform', 'transform-origin',
      'transform-box', 'filter', 'clip-path', 'mask', 'contain', 'content-visibility',
      'will-change', 'zoom', 'fill', 'color', 'font-family', 'font-size'];
    const attributes = ['x', 'y', 'width', 'height', 'viewBox', 'preserveAspectRatio',
      'transform', 'opacity', 'filter', 'clip-path', 'mask', 'href', 'data-tex'];
    return {
      node: label(node), rect: rect(node.getBoundingClientRect()),
      attributes: Object.fromEntries(attributes.filter(key => node.hasAttribute(key))
        .map(key => [key, node.getAttribute(key)])),
      style: Object.fromEntries(properties.map(key => [key, style.getPropertyValue(key)])),
      bbox: typeof node.getBBox === 'function' ? safely(() => rect(node.getBBox())) : null,
      ctm: typeof node.getCTM === 'function' ? safely(() => matrix(node.getCTM())) : null,
      screenCTM: typeof node.getScreenCTM === 'function' ? safely(() => matrix(node.getScreenCTM())) : null,
      paths: node.matches('svg.math-svg') ? node.querySelectorAll('path').length : undefined
    };
  }
  function snapshot(note = 'manual') {
    if (report.snapshots.length >= 20) {
      report.dropped.snapshots++;
      console.warn(PREFIX, 'Snapshot limit reached; stop and export this capture.');
      return null;
    }
    const before = performance.now();
    const container = root();
    const svg = scene();
    const nodes = [...container.querySelectorAll(
      'svg, g[transform], g[filter], .transformed-curve, .reference-curve, .vertex')];
    const ids = new Map();
    for (const node of document.querySelectorAll('[id]')) ids.set(node.id, (ids.get(node.id) || 0) + 1);
    const references = [];
    for (const node of container.querySelectorAll('svg, svg *')) {
      for (const attr of ['filter', 'clip-path', 'mask', 'fill', 'stroke', 'href', 'xlink:href']) {
        const value = node.getAttribute(attr);
        if (!value) continue;
        const id = value.match(/^#(.+)$/)?.[1] || value.match(/url\(["']?#([^"')]+)["']?\)/)?.[1];
        if (id) references.push({ node: label(node), attr, value, matches: ids.get(id) || 0 });
      }
    }
    const ancestors = [];
    for (let node = svg?.parentElement || container; node && ancestors.length < 8; node = node.parentElement) {
      ancestors.push(safely(() => nodeDetails(node)));
    }
    const paths = [...container.querySelectorAll('svg path')];
    const capture = {
      ms: round(before - started), note: String(note).slice(0, 300),
      state: safely(state), viewport: viewport(),
      sceneMarkup: svg ? svg.outerHTML.slice(0, 200000) : null,
      sceneMarkupTruncated: svg ? svg.outerHTML.length > 200000 : false,
      svgNodeCount: nodes.length, svgNodesTruncated: nodes.length > 160,
      nodes: nodes.slice(0, 160).map(node => safely(() => nodeDetails(node))),
      ancestors, references,
      definitions: [...container.querySelectorAll('svg defs')].map(node => node.outerHTML.slice(0, 20000)),
      duplicateIds: [...ids].filter(([, count]) => count > 1),
      paths: {
        total: paths.length,
        empty: paths.filter(node => !node.getAttribute('d')?.trim()).length,
        invalidNumbers: paths.filter(node => /NaN|Infinity/.test(node.getAttribute('d') || '')).length
      },
      fonts: safely(() => ({
        status: document.fonts.status,
        faces: [...document.fonts].map(font => ({
          family: font.family, status: font.status, weight: font.weight, style: font.style
        }))
      })),
      samplingCostMs: round(performance.now() - before)
    };
    report.snapshots.push(capture);
    console.info(PREFIX + ' Snapshot: ' + note + ' at ' + capture.ms + 'ms');
    return capture;
  }
  function viewport() {
    return {
      innerWidth, innerHeight, devicePixelRatio,
      screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth },
      visual: window.visualViewport ? {
        width: visualViewport.width, height: visualViewport.height,
        scale: visualViewport.scale, offsetLeft: visualViewport.offsetLeft, offsetTop: visualViewport.offsetTop
      } : null
    };
  }
  function resources() {
    return performance.getEntriesByType('resource').slice(-150).map(entry => ({
      url: cleanUrl(entry.name), type: entry.initiatorType,
      duration: round(entry.duration), transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize,
      responseStatus: entry.responseStatus
    }));
  }
  function sample() {
    if (!active) return;
    const before = performance.now();
    const sorted = intervals.slice().sort((a, b) => a - b);
    report.frames.push({
      ms: round(before - started), visibility: document.visibilityState, count: frameCount,
      medianMs: sorted.length ? round(sorted[Math.floor(sorted.length * .5)]) : null,
      p95Ms: sorted.length ? round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))]) : null,
      maxMs: round(maxGap), intervalsOver50Ms: slowFrames
    });
    report.samples.push({ ms: round(before - started), state: safely(state), costMs: round(performance.now() - before) });
    intervals = []; frameCount = 0; maxGap = 0; slowFrames = 0;
    if (before - started - lastConsoleSample >= 5000) {
      lastConsoleSample = before - started;
      console.info(PREFIX + ' SAMPLE ' + JSON.stringify({
        timing: report.frames[report.frames.length - 1], state: report.samples[report.samples.length - 1].state
      }));
    }
    // Reserve one slot for the final snapshot. Avoid geometry reads every frame.
    if (before - started - lastAutoSnapshot >= 10000 && report.snapshots.length < 19) {
      lastAutoSnapshot = before - started;
      safely(() => snapshot('automatic'));
    }
  }
  function printReport() {
    // Print actual strings, never expandable objects that paste as Object / {...}.
    // Keep heavy path markup in the downloadable JSON, out of the console report.
    const line = (section, value) => console.info(PREFIX + ' ' + section + ' ' + JSON.stringify(value));
    const batches = (section, values, size = 10) => {
      for (let i = 0; i < values.length; i += size) line(section + ' ' + (i + 1) + '-' + Math.min(i + size, values.length), values.slice(i, i + size));
    };
    console.info(PREFIX + ' BEGIN REPORT ' + VERSION + ' ' + report.startedAt);
    const { resources: initialResources, ...environment } = report.environment;
    line('ENVIRONMENT', { page: report.page, initialRoute: report.initialRoute, ...environment });
    batches('TIMING', report.frames);
    batches('STATE', report.samples.filter((_, index) => index % 5 === 0 || index === report.samples.length - 1), 5);
    batches('EVENTS', report.events.map(({ data, ...entry }) => {
      if (!data || typeof data !== 'object') return { ...entry, data };
      const { state: ignoredState, ...details } = data;
      return { ...entry, data: details };
    }), 20);
    const styles = node => {
      if (!node.style) return node;
      const keys = ['display', 'visibility', 'opacity', 'overflow', 'width', 'height',
        'min-height', 'max-height', 'transform', 'transform-origin', 'transform-box',
        'filter', 'clip-path', 'contain', 'zoom', 'fill', 'color'];
      return { ...node, style: Object.fromEntries(keys.map(key => [key, node.style[key]])) };
    };
    for (const capture of report.snapshots) {
      const { sceneMarkup, definitions, nodes, ancestors, references, ...summary } = capture;
      line('SNAPSHOT', { ...summary,
        consoleNodesTruncated: nodes.length > 24,
        nodes: nodes.slice(0, 24).map(styles),
        ancestors: ancestors.slice(0, 4).map(styles),
        referenceIssues: references.filter(reference => reference.matches !== 1)
      });
    }
    line('RESOURCES', { total: report.resourcesAtEnd?.length,
      failed: Array.isArray(report.resourcesAtEnd)
        ? report.resourcesAtEnd.filter(resource => resource.responseStatus >= 400) : report.resourcesAtEnd });
    line('END REPORT', { durationMs: report.durationMs, dropped: report.dropped,
      note: 'Copy the text from BEGIN REPORT through END REPORT. Full SVG markup remains available with nd.save().' });
  }
  function frame(now) {
    if (!active) return;
    if (previousFrame) {
      const delta = now - previousFrame;
      if (intervals.length < 1000) intervals.push(delta);
      frameCount++;
      maxGap = Math.max(maxGap, delta);
      if (delta > 50) slowFrames++;
    }
    previousFrame = now;
    frameId = requestAnimationFrame(frame);
  }
  function stop() {
    if (!active) return report;
    sample();
    active = false;
    cancelAnimationFrame(frameId);
    clearInterval(sampleTimer);
    clearTimeout(deadline);
    for (const dispose of cleanup) safely(dispose);
    safely(() => snapshot('capture ended'));
    report.resourcesAtEnd = safely(resources);
    report.endedAt = new Date().toISOString();
    report.durationMs = round(performance.now() - started);
    safely(printReport);
    return report;
  }
  function download() {
    stop();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'numeracy-diagnostics-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  window.numeracyDiagnostics = {
    version: VERSION, snapshot, stop, download,
    text: () => JSON.stringify(report, null, 2),
    report: () => JSON.parse(JSON.stringify(report))
  };

  listen(window, 'error', error => event('error', error instanceof ErrorEvent ? {
    message: error.message, file: cleanUrl(error.filename), line: error.lineno,
    column: error.colno, error: describeError(error.error)
  } : { target: label(error.target), resource: cleanUrl(error.target?.src || error.target?.href || '') }), true);
  listen(window, 'unhandledrejection', error => event('unhandledrejection', describeError(error.reason)));
  listen(document, 'securitypolicyviolation', error => event('securitypolicyviolation', {
    directive: error.effectiveDirective, blocked: cleanUrl(error.blockedURI), disposition: error.disposition
  }));
  listen(document, 'visibilitychange', () => event('visibility', document.visibilityState));
  listen(window, 'resize', () => event('resize', viewport()));
  listen(window, 'hashchange', () => event('route', location.hash));
  for (const type of ['click', 'input', 'change', 'pointerdown', 'pointerup', 'pointercancel']) {
    listen(document, type, input => {
      if (!(input.target instanceof Element) || !root().contains(input.target)) return;
      const control = input.target.closest('button, input, select, [role="slider"]');
      if (!control) return;
      // Record only numeric values/ranges/selects, never arbitrary typed text.
      event('interaction:' + type, {
        control: label(control),
        name: control.getAttribute('aria-label') || (control.tagName === 'BUTTON' ? control.textContent?.trim().slice(0, 100) : null),
        value: control.matches('input[type="number"], input[type="range"], select') ? control.value : control.getAttribute('aria-valuenow'),
        state: safely(state)
      });
    }, true);
  }
  listen(document, 'keydown', input => {
    if (input.target instanceof Element && input.target.closest('input, textarea, [contenteditable]')) return;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'KeyR', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(input.code)) {
      event('keyboard', { code: input.code, state: safely(state) });
    }
  }, true);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  listen(motion, 'change', () => event('reduced-motion', motion.matches));
  for (const type of ['longtask', 'layout-shift']) {
    if (typeof PerformanceObserver === 'undefined' || !PerformanceObserver.supportedEntryTypes?.includes(type)) continue;
    safely(() => {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) event(type, {
          startTime: round(entry.startTime - started), duration: round(entry.duration),
          value: entry.value, hadRecentInput: entry.hadRecentInput
        });
      });
      observer.observe({ type, buffered: false });
      cleanup.push(() => observer.disconnect());
    });
  }
  report.environment = {
    userAgent: navigator.userAgent, platform: navigator.platform, language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory,
    viewport: viewport(), visibility: document.visibilityState, reducedMotion: motion.matches,
    forcedColors: matchMedia('(forced-colors: active)').matches,
    colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    support: {
      svg: typeof SVGSVGElement !== 'undefined',
      resizeObserver: typeof ResizeObserver !== 'undefined',
      requestAnimationFrame: typeof requestAnimationFrame === 'function',
      dvh: CSS.supports('height', '1dvh'),
      svgFilterSyntax: CSS.supports('filter', 'url("#chest-shadow")'),
      transformBox: CSS.supports('transform-box', 'fill-box'),
      performanceEntryTypes: typeof PerformanceObserver === 'undefined' ? [] : PerformanceObserver.supportedEntryTypes
    },
    stylesheets: [...document.styleSheets].map(sheet => ({
      href: sheet.href ? cleanUrl(sheet.href) : 'inline', disabled: sheet.disabled,
      rules: safely(() => sheet.cssRules.length)
    })),
    scripts: [...document.scripts].filter(script => script.src).map(script => cleanUrl(script.src)),
    serviceWorker: safely(() => navigator.serviceWorker?.controller?.scriptURL
      ? cleanUrl(navigator.serviceWorker.controller.scriptURL) : null),
    navigation: safely(() => performance.getEntriesByType('navigation').map(entry => ({
      type: entry.type, duration: round(entry.duration), domComplete: round(entry.domComplete),
      transferSize: entry.transferSize, responseStatus: entry.responseStatus
    }))),
    resources: safely(resources)
  };
  // Optional capability probe only; not a test of the compositor used to paint SVG.
  window.numeracyDiagnostics.gpu = () => {
    const canvas = document.createElement('canvas');
    let gl;
    const result = safely(() => {
      gl = canvas.getContext('webgl');
      if (!gl) return { available: false };
      const extension = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        available: true, version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER),
        unmaskedVendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : 'not exposed',
        unmaskedRenderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'not exposed'
      };
    });
    safely(() => gl?.getExtension('WEBGL_lose_context')?.loseContext());
    report.gpuProbe = result;
    console.info(PREFIX, 'Optional WebGL probe (does not establish SVG acceleration):', result);
    return result;
  };
  safely(() => snapshot('initial'));
  frameId = requestAnimationFrame(frame);
  sampleTimer = setInterval(sample, 1000);
  deadline = setTimeout(stop, LIMIT_MS);
  console.info(PREFIX + ' Recording automatically for 60 seconds. Move/play the visualization, then copy the Console text through END REPORT. No commands needed.');
})();
