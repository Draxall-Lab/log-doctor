# Version History

## v0.1.0 – Initial Wiring (Baseline)
- Plugin structure created
- `plugin.json` configured
- Tool wiring validated in Sapphire
- Stub tool responses implemented
- Git repository initialised
- Basic README added

Notes:
- Confirms end-to-end plugin loading and tool execution
- No real diagnostic logic implemented yet

---

## v0.1.1 – Naming & Invocation Refinement
- Renamed project to **Log Doctor**
- Updated tool naming to reduce ambiguity with built-in tools
- Adjusted README usage instructions:
  - Standardised phrasing: “Use Log Doctor to…”
- Improved alignment between human prompts and tool invocation

Notes:
- Focus on reducing collisions with built-in Sapphire commands
- Establishes “log analysis” as primary entry point

---

## Upcoming (Planned)

### v0.2.0 – Basic Log Analysis
- Implement log parsing (keyword + pattern matching)
- Extract and summarise relevant log events
- Basic structured output

### v0.3.0 – Context & Correlation
- Plugin identification from logs
- Basic README / manifest inspection
- Improved recommendation logic

### v1.0.0 – Stable Release
- Tested against real-world cases
- Reliable output and behaviour
- Ready for wider sharing