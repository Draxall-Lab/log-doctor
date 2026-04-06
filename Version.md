Log Doctor v0.3.5

Release Type:
Minor Feature Release / Stability Milestone

Highlights:
- UI-scoped, payload-driven analysis system
- Removal of tool-based analysis to prevent recursion
- Full anti-hammering protection with cooldown handling
- Debug panel with last analyse payload + clipboard export
- Theme-safe UI using tokenised design system (--ld-*)
- Ghost-style action buttons for cross-theme compatibility
- Improved readability across light, dark, and custom themes
- Verified compatibility with external theme plugins (e.g. Wolf’s Themes)

Architecture:
- Structured payload → hidden context → chat interpretation
- No exposed analysis tools
- In-memory payload registry replaces DOM embedding

Stability:
- Passed functional testing across all analysis scopes
- Passed stress testing (rapid input, cooldown triggering)
- No LLM crashes under sustained load
- Graceful degradation when LLM is unavailable

Notes:
- Hidden context may occasionally surface under extreme abuse conditions
- UI feedback prioritises clarity over animation

Status:
Production-ready for controlled use and wider testing