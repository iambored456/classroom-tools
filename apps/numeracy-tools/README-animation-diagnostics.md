# Numeracy Tools animation diagnostics

This is a standalone console script for the existing published page. No build,
deployment, extension, package installation, or change to the animation is needed.
It focuses on Substitution Visualization and Transformations Visualization.

## Capture the work-laptop failure

1. Open the affected visualization. Open DevTools > Console. Enable **Preserve log**
   if available, and keep warnings/errors visible. Do not reload after installing
   the script: a reload removes it.
2. Open `animation-diagnostics.js` beside this file, copy its entire contents,
   paste into the Console, and run it. Only run code you have reviewed and trust;
   if workplace policy blocks console pasting, follow that policy.
3. The console should say **[Numeracy diagnostics] Recording for 60 seconds**.
   Use the page normally to reproduce the failure. For substitution, play the
   affected step, try the progress slider, and try the next step. For
   transformations, move the affected parameter.
4. When the graphics are visibly broken, run:
   ```js
   numeracyDiagnostics.snapshot("broken here")
   ```
   You can take another snapshot while paused and after resizing. A screenshot
   at the same point helps distinguish incorrect geometry from incorrect painting.
   The script itself does not take screenshots.
5. Finish and copy the report:
   ```js
   numeracyDiagnostics.stop()
   copy(numeracyDiagnostics.text())
   ```
   `copy` is a Chrome/Edge DevTools utility. If it is unavailable, use:
   ```js
   numeracyDiagnostics.download()
   ```
   This saves a JSON file locally. Alternatively,
   `numeracyDiagnostics.text()` returns the JSON in the console.
6. Send the report with the step/action that looked broken and whether pausing
   or resizing changed it. Include any earlier red Console errors, since a pasted
   script cannot recover errors that occurred before it was installed.

Recording automatically stops after 60 seconds. Snapshots and export still work
after it stops (up to 20 snapshots total). Paste the script again to start a fresh
capture; export the previous report first because reinstalling replaces it.

For comparison, repeat the same steps on the working laptop at roughly the same
browser window size and animation speed. Label the two reports.

## Optional GPU evidence

After reproducing the issue, run:

```js
numeracyDiagnostics.gpu()
copy(numeracyDiagnostics.text())
```

This briefly creates and releases a separate WebGL context. The renderer may be
hidden by browser policy. It does **not** prove whether SVG uses GPU acceleration.
For Chrome/Edge, the **Graphics Feature Status** and **Problems Detected** sections
of `chrome://gpu` or `edge://gpu` are better supporting evidence about compositor
status. Copy those sections separately if available. Do not change acceleration,
browser flags, or workplace settings for this first capture.

## What is captured

- Browser/version, screen and viewport dimensions, pixel ratio, zoom-related
  viewport data, reduced motion, forced colors, and CSS/API support.
- One-second summaries of animation-frame intervals, stalls, page visibility,
  current step/progress, button state, graph parameters, and SVG transforms.
- Numeric control interactions, route/resize events, runtime errors, unhandled
  rejections, resource errors, CSP violations, and supported long-task/layout-shift
  observations.
- Initial, manual, and final SVG snapshots: bounding boxes, screen matrices,
  computed styles, clipping ancestors, filter/clip definitions, duplicate IDs,
  unresolved SVG references, math path counts, and malformed numeric path data.
- Stylesheet/font state, script asset names, service-worker controller, and
  resource timings. Resource timings do not conclusively establish loading success;
  zero transfer sizes can mean caching or unavailable timing information.

## Limits and interpretation

Nothing is uploaded automatically. The script does not modify animation state,
styles, browser settings, cookies, or storage. It exposes
`window.numeracyDiagnostics`, adds temporary observers/listeners, and stores the
report in memory. Stopping removes observers/listeners/timers. Reloading removes
the diagnostic object as well.

Reports contain equations, browser information, asset paths and error details.
URL query strings are excluded from resource lists; error messages/stacks and
captured SVG markup may still contain URLs. Review the report before sharing it.

Full SVG geometry reads occur only during snapshots; routine sampling is once
per second. Snapshots can force layout and temporarily affect frame timing; their
timestamps and costs are recorded. DevTools itself can also affect performance.
Events are capped at 400, snapshots at 20, SVG node details at 160 per snapshot,
and SVG markup at 200,000 characters per snapshot; truncation is reported.

Frame stalls suggest scheduling/load issues. Correct timing but wrong SVG bounds,
matrices, references, or clipping suggests a layout/rendering issue. Correct
geometry with visibly fragmented graphics makes browser painting/compositing a
candidate, but console data alone cannot confirm it. Reduced motion can explain
intentional skipping/pausing. Compare reports and screenshots before choosing a fix.

The script records evidence rather than automatically diagnosing or changing
anything. It cannot inspect managed browser policies, prior console errors,
actual painted pixels, or errors from other pages/tabs.

