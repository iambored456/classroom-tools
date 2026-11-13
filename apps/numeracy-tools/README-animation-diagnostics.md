# Numeracy Tools animation diagnostics

Diagnostics now start automatically when Substitution Visualization or
Transformations Visualization opens, including navigation from the Numeracy Tools
landing page. The landing page itself does not start recording.

**Availability:** this update must be built and published through the normal
workflow before it works on the live site. No Pages build or publishing is
performed by the diagnostic itself.

## Capture without typing commands

1. Open the browser Console and make sure Info messages are visible.
2. Load/reload the affected visualization normally. No special URL is needed.
3. Look for **[Numeracy diagnostics] Recording automatically for 60 seconds**.
4. Play the animation or move the parameters to reproduce the failure.
5. After about a minute, the Console prints **BEGIN REPORT**, plain-text diagnostic
   sections, and **END REPORT**. Copy that text and paste it into the chat. Copying
   the whole Console log is also fine; include any red errors.

The report uses serialized text rather than expandable JavaScript objects, so
copied logs retain their values. Live SAMPLE messages appear roughly every five
seconds; detailed geometry snapshots are collected roughly every ten seconds.
The final report contains timing, state, errors, and compact SVG geometry.
Large SVG path markup remains in the full downloadable JSON if needed.

Recording stops after 60 seconds or when leaving the visualization. Entering
another visualization starts a fresh capture. Reloading also starts a fresh
capture and clears the prior in-memory report. Use Preserve log if you want to
retain Console messages across reloads.

A screenshot of the broken graphics and the affected step/action is helpful too.
Nothing is uploaded automatically.

## Optional commands

No commands are required for the normal capture. These remain available:

- `nd.stop()` finishes early and prints the report immediately.
- `nd.mark()` captures the exact moment the graphics look broken.
- `nd.mark("after resizing")` adds a named snapshot.
- `nd.save()` stops and downloads the full JSON report.
- `nd()` starts a new 60-second recording.
- `copy(numeracyDiagnostics.text())` copies the full JSON in Chrome/Edge DevTools.

For a comparison without automatic instrumentation, add
`?debugAnimations=0` before the visualization hash and reload, for example:

```text
.../numeracy-tools/?debugAnimations=0#substitution-visualization
```

Use `&debugAnimations=0` if the URL already has other query parameters. Manual
`nd()` still works with automatic recording disabled. The old
`debugAnimations=1` flag remains supported, including recording on the landing page.

## Older published pages

The standalone `animation-diagnostics.js` beside this file still works by pasting
its entire contents into the Console. It records for 60 seconds and prints the
same plain-text report. This fallback is only needed before the app update is
published.

## Capturing useful evidence

For substitution, play the affected step, try the progress slider, and try the
next step. For transformations, move the affected parameter.

The script does not take screenshots. Include any earlier red Console errors:
the recorder cannot recover errors from before it starts, including startup
errors before the diagnostic asset loads.

Snapshots and export still work after recording stops (up to 20 snapshots total).
Post-stop snapshots are retained in the downloadable JSON; the already printed
report does not change. For comparison, repeat the same steps on the working
laptop at roughly the same window size and animation speed. Label the two reports.

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
- Initial, automatic, manual, and final SVG snapshots: bounding boxes, screen matrices,
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
the previous report; a visualization then starts a fresh recording.

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
