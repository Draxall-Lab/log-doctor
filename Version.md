# Log Doctor v0.3.7

Release Type:
Feature Enhancement / UX Expansion

---

## 🚀 Highlights

- Introduced **time-based filtering** (Last 15m, 1h, 6h, 24h)
- Implemented **unified filtering model** across UI, counts, and analysis
- Ensures all views operate from a **single, consistent dataset**
- Enables focused analysis of recent log activity
- Reduces noise in large log datasets

---

## 🧠 Architecture

- Time filter is applied **before all aggregation and rendering**
- Logs → Parser → Report → Time Filter → Filters → Render → Payload → Context → Chat
- Time filter operates on raw lines with **anchor-based inheritance**
- Untimestamped lines inherit visibility from preceding timestamped entries

---

## 🎛️ UI & Behaviour

- New **Time filter control** integrated into filter panel
- Status reflects active time scope (e.g. `Refreshed • ⏱ Last 15 minutes`)
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
- What you see is what gets analysed

---

## 🛠️ Implementation Notes

- Frontend-first implementation using existing timestamp extraction
- Normalised log timestamp parsing for compatibility (e.g. Kokoro logs)
- Designed for future backend-assisted filtering

---

## 🧪 Testing

- Verified consistency between counts, sections, and analysis under time filtering
- Confirmed correct handling of:
  - Timestamped entries
  - Untimestamped lines (anchor inheritance)
- UI validation for scope consistency and responsiveness

---

## ⚠️ Notes

- All counts, sections, and analysis now reflect the active time-filtered dataset
- Custom time ranges deferred to a future version

---

## 📦 Status

Ready for wider community testing with enhanced diagnostic precision