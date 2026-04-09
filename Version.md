# Log Doctor v0.3.6

Release Type:
Feature Enhancement / UX Expansion

---

## 🚀 Highlights

- Introduced **time-based filtering** (Last 15m, 1h, 6h, 24h)
- Enables focused analysis of recent log activity
- Reduces noise in large log datasets
- Preserves alignment between UI, payload, and analysis context

---

## 🧠 Architecture

- Added **time filter stage** before grouping and payload construction
- Logs → Parser → Report → Time Filter → Filters → Render → Payload → Context → Chat
- Time filter operates on raw lines with **anchor-based inheritance**
- Untimestamped lines inherit visibility from preceding timestamped entries

---

## 🎛️ UI & Behaviour

- New **Time filter control** integrated into filter panel
- Status now reflects active scope:
  - `Refreshed • ⏱ Last 15 minutes`
- Time filter behaves as an **AND constraint** across all other filters
- Fully compatible with existing source/type/text filters

---

## 🔍 Analysis Integrity

- Payload now includes `time_filter` metadata
- Chat analysis reflects only the visible time-filtered dataset
- Maintains strict alignment between:
  - UI view
  - Payload contents
  - LLM interpretation

---

## 🛠️ Implementation Notes

- Frontend-first implementation using existing timestamp extraction
- Normalised log timestamp parsing for compatibility (e.g. Kokoro logs)
- Designed for future backend-assisted filtering

---

## 🧪 Testing

- Verified time filter behaviour across multiple log sources
- Confirmed correct handling of:
  - Timestamped entries
  - Untimestamped lines (anchor inheritance)
- UI validation for scope consistency and responsiveness

---

## ⚠️ Notes

- Counts by Source currently reflect full dataset (not time-filtered)
- Custom time ranges deferred to future version

---

## 📦 Status

Ready for wider community testing with enhanced diagnostic precision