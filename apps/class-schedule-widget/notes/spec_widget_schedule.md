<copy of design spec from conversation>

1) user goals & modes

Primary goal: show today’s subjects with an icon and a live progress bar for each time block.

Secondary goals: quick editing, theme control, minimal chrome, and reliable local persistence (no account required).

Display modes (switchable at runtime):

Timed schedule (default): start/end per activity, live progress bars.

Checklist: same items; checkboxes replace progress.

Simple list: static list, no timers/checkboxes.

2) window model (detachable pop-up)

Launcher: the main page opens the widget with:

window.open(widget.html, 'scheduleWidget', 'popup=yes,width=380,height=700,left=100,top=100,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes').

Expectations/limitations: still an OS-framed browser window (close/minimize are OS-controlled). Minimal chrome is achieved by disabling menubar/toolbar/location; some settings vary by browser.

Opener communication (optional): postMessage for two things:

Opener can request the pop-up to focus or restore.

Pop-up can notify status (e.g., “class started”, “period switch”).

Deep-linkable: the pop-up (widget.html) is fully stand-alone so it can be opened directly/bookmarked.

3) high-level UI
3.1 main surfaces

Schedule surface (right): the live widget students see.

Settings panel (left) drawer: slides in from the left (or opens as an overlay on small screens). Contains all editing and appearance controls.

3.2 schedule surface anatomy

Header bar: title (editable), now/time indicator, overflow menu (⋯) for quick actions.

Activity list: ordered cards, each with:

Icon/avatar (emoji or uploaded image).

Title (subject name).

Time row: start — end (e.g., 12:00–12:30 PM).

Progress bar: fills from 0–100% across the scheduled duration; shows remaining time tooltip on hover; an alarm glyph if a reminder is attached.

State chips: upcoming / in-progress / done / skipped / paused.

Footer (optional): next activity preview + “Open settings”.

3.3 settings panel sections

Display options

Mode: List / Checklist / Timed schedule.

Show title (toggle) + editable title text.

Start time for first activity (HH:MM + AM/PM; 24-hr option in preferences).

Auto-chain durations: when on, each activity’s end becomes next start.

Activities editor (virtualized list if long)

Rows with: drag handle (for reorder), icon picker, title input, duration input (mins), quick +5/–5 buttons, delete, advanced (bell icon opens reminders).

Add activity (+) at bottom; multi-add dialog (paste a list).

Theme & appearance

Color theme grid (pre-sets: light, dark, high-contrast; tinted variants like in the screenshots).

Density: comfy / compact.

Corner radius: subtle / rounded / pill.

Typography scale: small / default / large.

Icon style: emoji / flat glyph / upload (PNG/SVG).

Clock & timing

Clock offset control: adjust app clock relative to device (–15:00 … +15:00, in 5-sec steps, with text input for precise ±mm:ss).

Show seconds (toggle).

Bell reminders: start/end chime toggles; lead-time options (e.g., 1, 3, 5 min).

Period overrun behavior: autoadvance / extend current / prompt.

Data & reset

Export / import (JSON).

Reset today’s progress.

Clear all data.

4) interaction patterns

Reorder activities: pointer-drag on handle; keyboard with ⌘/Ctrl + ↑/↓.

Inline editing: clicking title or duration focuses the field; Enter commits; Esc cancels.

Quick durations: –5 / +5 buttons adjacent to duration input.

Icon picker: emoji palette, recent emojis, upload image (see storage limits below).

Mode switch: immediate visual switch; underlying data unchanged.

Timer states:

Upcoming (progress 0, muted bar).

In-progress (animated bar; current time within [start,end)).

Grace period (optional, e.g., 60s after end—subtle striped bar).

Done (bar filled; faint).

Paused (manual pause; bar stops advancing, “resume” button appears).

5) timing model (with offset & drift handling)

App clock: appNow = deviceNow + userOffset + driftCompensation.

userOffset: set by teacher (±mm:ss). Stored and applied to every calculation.

driftCompensation: small correction if the tab suspends or timers lag (derived by sampling real elapsed wall-clock in the RAF loop).

Progress computation for activity i:

start = dayAnchor + schedule[i].startDelta

end = start + schedule[i].duration

progress = clamp( (appNow - start) / (end - start), 0, 1 )

Scheduler loop:

Primary tick: requestAnimationFrame for smooth bars; compute once per frame but throttle calculations to ~10–15 fps to save CPU.

Visibility handling: on visibilitychange resume, compute elapsed via wall-clock delta and update once (no “catch up” loop).

Rollover: when local date changes (midnight), point “today” to new anchor; optionally carry over unchecked items (prompt).

6) data model (local persistence)

“Saved like a cookie” → use localStorage for small state and IndexedDB for larger payloads (e.g., uploaded images). If you truly want cookie semantics, store only a short pointer in a cookie (not recommended). Static site: no server required.

Key namespaces

ttw:v1:profile — identity-free profile (userId UUID, createdAt).

ttw:v1:settings — theme, density, typography, mode, clockOffset, timeFormat, chime settings.

ttw:v1:schedule:YYYY-MM-DD — today’s schedule instance (progress/checklist state).

ttw:v1:templates:default — reusable base sequence of activities.

ttw:v1:assets (IndexedDB) — binary/icon blobs keyed by assetId.

Schedule schema (per template)

ScheduleTemplate {
  id, title, timezone, autoChain: boolean, activities: ActivityDef[]
}

ActivityDef {
  id, title, icon: IconRef, durationMin: number,
  startDeltaMin?: number  // optional if auto-chain
  reminders?: { atStart?: boolean, atEnd?: boolean, leadMin?: number[] }
}


Daily instance (derived from template)

ScheduleDay {
  id, templateId, dateISO, startTime: 'HH:MM',
  activities: ActivityDay[]
}

ActivityDay {
  id, defId, title, icon: IconRef,
  startISO, endISO, durationMs,
  state: 'upcoming'|'inprogress'|'done'|'skipped'|'paused',
  checklistChecked?: boolean,
  notes?: string
}


IconRef

IconRef { type: 'emoji'|'upload'|'glyph', value: string } 
// upload -> assetId (IndexedDB), emoji->unicode, glyph->token name


Storage strategy

On every material change, write settings and current ScheduleDay to localStorage (single JSON string each) with a debounced 300ms write.

Uploaded icons > ~50–100 KB saved to IndexedDB; IconRef.value is the key.

Export combines settings + selected templates + inlined blobs (as Data URLs) into one JSON file.

7) theming & accessibility

Themes: tokenized CSS variables (HSL) so each preset is a minimal set of tokens:

--bg, --surface, --text, --muted, --accent, --accent-contrast, --success, --warning.

Dark mode: separate palette or auto follow OS (prefers-color-scheme).

Contrast: guarantee ≥4.5:1 for text; ≥3:1 for UI glyphs; a “high-contrast” theme available.

Typography: system fonts; dynamic type scaling; clamp sizes to avoid overflow in compact density.

Motion: reduce animation if prefers-reduced-motion is set.

Keyboard: full operability (tab order, space/enter activation, arrow keys for reordering).

Screen readers: ARIA roles and live regions:

aria-live="polite" updates at period transitions (“Math begins now”).

Progress bars expose aria-valuenow and aria-valuetext (“12 minutes remaining”).

8) editing logic & validation

Time grid: durations validated to positive integers; optional max period length (e.g., 240 minutes) to prevent runaway state.

Autofill: when adding an activity, default duration = last used (or 45 min if unknown).

Auto-chain: toggling on recalculates all following start times; toggling off keeps current absolute times.

Conflict handling: if manual edits create overlaps, highlight conflicts and offer quick fixes:

“Shift later items by overlap”

“Trim this item to end at next start”

“Allow overlap (two tracks)” (advanced mode; by default we keep a single track).

9) reminders & sounds (all local)

Audio assets: short chime files packaged with the app; play via Web Audio API at start/end or lead times.

Focus policy: on first user interaction, prime audio context to avoid autoplay blocks.

Quiet mode: mute toggle; volume slider stored in settings.

10) reliability & performance

Render loop: schedule bar widths computed in CSS using a custom property updated per frame for the current activity only; others update on activity boundary to save CPU.

Virtualization: settings list uses virtualization if >30 activities to keep DOM light.

Wake recovery: on resume from sleep or tab suspension, compute delta from last wall-clock timestamp and snap state.

Optional offline cache: ship a service worker for static assets so widget opens instantly offline (no server needed).

11) security & privacy

No network by default. All data stays on device.

Origin isolation not required, but set COOP/COEP headers only if self-hosting and you later add advanced APIs (not necessary now).

Permissions: none; audio only after gesture.

12) internationalization

Time formats: 12/24-hour toggle; locale-aware date/time via Intl.DateTimeFormat.

RTL support: mirrored layout; progress direction respects writing mode.

13) QA scenarios & edge cases (condensed)

Pop-up blocked → show inline CTA “Open widget” with help text.

Change clock offset during an active period → recompute progress instantly.

Day with no activities → friendly empty state with “Open settings”.

Upload huge image → warn and downscale client-side before storing.

System clock changes (NTP or manual) → detect jump >60s; reconcile with app offset (offer “keep my schedule aligned” vs “stay with wall clock”).

14) minimal pop-up chrome guidance

Use the window.open specs above.

In Chrome/Edge/Firefox you’ll typically get only the OS title bar with close/minimize. Safari may keep some chrome despite requests.

Provide a “pop-in” action within the widget (opens the same content in a tab and closes the pop-up) for environments where pop-ups are disallowed.

15) future-friendly enhancements (no server required)

Multiple templates (e.g., A/B day schedules).

Teacher “nudge” control: temporarily extend or shorten the current period (± increments) without altering the base template.

Quick actions in header: Pause all timers • Skip to next • Add 5 minutes • Ring bell now.

Multi-track view: electives running in parallel; shows stacked bars.

Kiosk mode: hides settings behind a PIN.

