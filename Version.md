# Log Doctor v0.4.2

Release Type:
UX Enhancement / System Awareness / UI Polish

---

## 🚀 Highlights

- Last Analyse payload now persists across page navigation and refresh, allowing users to return and copy it without re-running analysis.
- Introduced plugin version awareness within the UI
- Added one-shot update check on load
- Implemented subtle update indicator in status bar
- Completed time filter UX with persistence and live behaviour

---

## 🧠 Architecture

- Version awareness separated from core render pipeline
- Plugin metadata sourced from backend (plugin.json as single source of truth)
- Update check executed once on initial load (no polling)
- Version state handled independently from:
   - filters
   - payload construction
   - analysis flow

Maintains clean separation between:

- system metadata (version, updates)
- diagnostic state (logs, filters, payloads)

---

## 🎛️ UI & Behaviour

v0.4.2
- Fixed section-view analyse payload including items outside active text filter
- Standardised payload filtering pipeline (time + text + grouped) across all scopes
- Removed legacy section divider pseudo-element causing stray horizontal line in dashboard


- Fixed mismatch between "Counts by Source" and section panels under text filtering (counts were derived from raw sections instead of filtered section data)
- Added **Plugin Version** display in Diagnostics panel
- Status bar now conditionally appends:
   - `vX.X.X Update Available`
- Update indicator:
   - appears only when relevant
   - uses tertiary accent colour
   - does not interrupt workflow

- New **Time filter control** integrated into filter panel
- Status reflects active time scope (e.g. `Refreshed • ⏱ Last 15 minutes`)
- Time filter behaves as an **AND constraint** across all other filters
- Fully compatible with existing source/type/text filters

---

## 🔄 Version Awareness

- Current version read directly from plugin metadata
- Remote version checked via Sapphire update endpoint
- Comparison performed client-side
- Update state reflected in UI without blocking render

Behaviour:

- Version is displayed after initial load
- Update check runs once per session
- No background polling or repeated checks
- Failures are silent (no user-facing errors)

---

## 🔍 Analysis Integrity

- Payloads now strictly respect:
   - time filter
   - source/type filters
   - text filters
- Fixed issue where out-of-scope log lines could appear in analysis
- Summary rebuilt from fully visible filtered dataset
- Alignment guaranteed across:
   - summary
   - issue counts
   - grouped issues
   - dashboard display

What you see is what gets analysed - without exceptions.

---

## ⏱️ Time Filter UX Completion

Finalised behaviour for time filtering system:

- Removed Apply button (live filtering now standard)
- Custom range behaviour refined:
   - From seeds to start of day if empty
   - To seeds to current time if empty
- Invalid ranges auto-corrected with user feedback
- Time filter state fully persists across:
   - refresh
   - navigation
   - reset flows (with defined reset semantics)

- 12h / 24h display toggle added:
   - display-only (internal format remains 24h)
   - user preference persists
   - does not affect payload or analysis

---

## ⏱️ Time Filtering Enhancements
**Preset Filtering (refined)**
- Maintains existing relative time presets:
   - Last 15 minutes
   - 1 hour
   - 6 hours
   - 24 hours

- Custom Datetime Range (new)
   - Added From / To datetime selection
   - Built using locally bundled Flatpickr
   - Supports precise investigation of specific time windows

Behaviour:

- Presets and custom ranges are mutually exclusive
- Selecting a preset exits custom mode
 -Returning to custom:
   - From persists
   - To refreshes to current time

## 🎨 UI Polish

- Improved spacing and grouping of filter controls
- Refined layout of time filter inputs and controls
- Consistent alignment of action buttons
- Enhanced visual clarity across themes

---

---

## 🛠️ Implementation Notes
- Added version helper module (`version.js`)
- Added backend route for plugin metadata
- Integrated Sapphire update check endpoint
- Status rendering updated to support conditional HTML fragments
- Separated render responsibilities:
   - report rendering
   - status rendering
   - system metadata display

---

## 🧪 Testing

- Verified version display across reloads and sessions
- Confirmed update detection against remote version changes
- Tested both states:
   - update available
   - up-to-date (no indicator)

- Regression testing:
   - time filtering
   - payload construction
   - analysis scopes
   - UI rendering

- Cross-platform testing:
   - Windows
   - Linux

---

## ⚠️ Notes

- Prompt text for chat analysis remains unchanged in this version
  (part of the current analysis trigger contract)
- Custom time ranges now implemented
  (previously deferred in v0.3.7)

---

## 📦 Status

Stable and verified.
Ready for release with improved UX, system awareness, and UI consistency.