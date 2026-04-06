# Log Doctor v0.3.5

Release Type:
Stability Milestone / Architecture Shift

---

## 🚀 Highlights

- Fully implemented **payload-driven analysis system**
- Removed tool-based analysis to eliminate recursion risks
- UI-scoped analysis across full view, sections, and individual issues
- Debug panel with **last analyse payload + clipboard export**
- Theme-safe UI using tokenised design system (`--ld-*`)
- Verified compatibility with external theme plugins (e.g. Wolf’s Themes)

---

## 🧠 Architecture

- Structured payload → hidden context → chat interpretation
- Payload is the single source of truth
- In-memory payload registry replaces DOM embedding
- No exposed analysis tools

This version marks the transition to a fully decoupled analysis model.

---

## 🛡️ Stability & Behaviour

- Stable under rapid repeated input (anti-hammering + cooldown handling)
- No LLM crashes under sustained load
- Consistent behaviour across all analysis scopes
- Continues to function when no LLM provider is available

---

## 🧪 Testing

- Functional testing across all analysis scopes
- Stress testing (rapid input, cooldown triggering)
- UI validation across light, dark, and custom themes

---

## ⚠️ Notes

- Hidden context may occasionally surface under extreme rapid input
- UI feedback prioritises clarity over animation

These are edge-case behaviours and do not affect normal use.

---

## 📦 Status

Production-ready for controlled release and wider community testing