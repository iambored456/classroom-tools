# Shared animation preference

The Classroom Tools hub settings store `system`, `full`, or `reduced` under
`classroom-tools.motion-preference`. The default is `full` (Always play animations), including when the device requests reduced motion.
Saved choices still take precedence.

Import `index.ts` in apps that use motion preferences. Use
`shouldReduceMotion()` for one-time decisions and `watchMotionPreference()`
for reactive state. Subscriptions return a cleanup function and call back
immediately with the current state.

Importing initializes `html[data-motion-preference]` and
`html[data-reduced-motion]`. CSS reduced-motion rules use the resolved
`data-reduced-motion="true"` attribute instead of reading the OS media query
directly. The original animation rules remain intact when full motion is chosen.

The module listens for OS changes, shared localStorage changes from other tabs,
and pages restored from the back-forward cache. It does not change browser APIs
or OS settings. The choice applies to this site's origin in this browser;
clearing site data resets it. Apps opened through the local hub proxy share an
origin too; separate development ports have separate storage.

`setMotionPreference()` returns false if saving is blocked. The hub explains
that the current-page choice could not be saved rather than claiming persistence.
Diagnostics retain the raw device preference and separately record the effective
site preference.

The preference controls existing reduced-motion behavior. It does not pause
essential game simulation or add new reduced-motion behavior to unrelated tools.

## Verification

Run `node packages/motion-preference/browser.test.mjs` from the repository root.
It builds the hub, Numeracy Tools, Numberle, and Paper Airplanes in memory and
checks shared preference behavior, persistence, blocked storage, and dialog
accessibility in Chromium. No Pages output is written. Set
`MOTION_SCREENSHOT_DIR` to save desktop/mobile screenshots of the settings dialog.
