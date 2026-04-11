# Log Doctor v0.3.8

Release Type:
Stability Enhancement / Data Integrity / Feature Expansion

---

## 🚀 Highlights

- Fixed time-filter leak in payload construction
- Implemented strict scoped summary alignment
- Introduced custom datetime range filtering
- Achieved full consistency between:
   - UI view
   - Payload contents
   - Analysis results

---

## 🧠 Architecture

- Enforced hard time filtering at payload construction stage
- Payload now built from the same filtered dataset used for rendering
- Logs → Parser → Report → Time Filter → Filters → Render → Payload → Context → Chat
- Eliminated divergence between:
   - visible log lines
   - grouped issues
   - payload contents

---

## 🎛️ UI & Behaviour

- New **Time filter control** integrated into filter panel
- Status reflects active time scope (e.g. `Refreshed • ⏱ Last 15 minutes`)
- Time filter behaves as an **AND constraint** across all other filters
- Fully compatible with existing source/type/text filters

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

---

## 🎛️ UI & Behaviour
- Custom time controls integrated into filter panel
- Improved visual consistency across toolbar and filter inputs
- Divider headings updated for full theme compatibility
- Max lines input behaviour refined:
   - Debounced refresh on valid input
   - Normalisation on Enter / blur
   - Enforced bounds (min / max / default)

---

## 🛠️ Implementation Notes
- Added applyTimeFilterToLines(...) to payload construction path
- Refactored time filter model:
   - supports preset strings
   - supports structured filter objects:
      - { mode: "relative", preset }
      - { mode: "absolute", from, to }
- Introduced central activeTimeFilter state
- Dynamic loading of Flatpickr assets from plugin bundle
- Corrected UI initialisation order for datetime pickers

---

## 🧪 Testing

- Verified payload integrity across:
   - full view
   - section view
   - single issue scope
- Confirmed elimination of:
   - time-filter leakage into payloads
   - summary mismatch with visible data
- Validated custom datetime behaviour across mode transitions
- Cross-platform testing:
   - Windows
   - Linux (Halo)
- Stress-tested under repeated analysis triggers

---

## ⚠️ Notes

- Prompt text for chat analysis remains unchanged in this version
  (part of the current analysis trigger contract)
- Custom time ranges now implemented
  (previously deferred in v0.3.7)

---

## 📦 Status

Stable and verified.
Ready for wider community testing with improved diagnostic accuracy and consistency.