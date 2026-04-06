# Log Doctor 🧠

Log Doctor is a diagnostic dashboard and AI-assisted analysis tool for Sapphire.

It parses application logs, groups issues into meaningful patterns, and allows scoped analysis directly in chat using a structured payload system.

---

## 🚀 Features

### 📊 Dashboard & Log Analysis
- Multi-log support:
  - Sapphire
  - Kokoro
  - Startup Errors
  - Story Engine
- Grouped issues by normalised message
- Frequency and recency sorting
- Source and type filtering
- Text search (comma-separated OR matching)
- Hot issue highlighting

---

### 🧠 Chat-Based Analysis
- Analyse current filtered view
- Analyse Top Issues
- Analyse individual sections
- Analyse single issues

All analysis is:
- UI-scoped
- payload-driven
- injected into chat via hidden context

---

### ⚙️ Robust Interaction Model
- One-shot payload system (no tool recursion)
- In-memory payload registry (no DOM JSON corruption)
- Pre-chat context injection
- Clean separation between UI and LLM

---

### 🛡️ Stability & Resilience
- Anti-hammering protection
- In-flight request locking
- Cooldown handling on rate limit (HTTP 429)
- No LLM crashes under stress testing
- Graceful degradation when LLM is unavailable

---

### 🎨 UI & Theme Compatibility
- Fully tokenised styling (`--ld-*`)
- Works across:
  - Dark mode
  - Light mode
  - Synthwave and custom themes
  - Wolf’s HTML rendering plugin
- Ghost-style action buttons for theme safety
- Improved contrast and readability across all modes

---

### 🧪 Debug & Payload Export
- Debug panel shows:
  - Internal diagnostic data
  - **Last Analyse Payload**
- Copy payload to clipboard
- Enables:
  - Offline analysis
  - Cross-AI troubleshooting
  - External diagnostic workflows

---

## 🧠 Architecture Overview
UI → Structured Payload → Plugin Endpoint → Chat Trigger → Hidden Context → LLM

Key principles:
- No tool-based recursion
- No exposed analysis tools
- Payload is the single source of truth
- Chat acts purely as interpreter

---

## 🔧 Usage

1. Load the dashboard and refresh logs
2. Apply filters (source, type, text)
3. Choose analysis scope:
   - Main Analyse
   - Panel analyse
   - Issue-level analyse
4. Review results in chat

If the LLM is unavailable:
- Use Debug panel → copy payload
- Paste into another AI for analysis

---

## ⚠️ Known Behaviour

- Hidden context may rarely surface under extreme input abuse
- Busy icon may appear briefly during rapid successful requests
- Cooldown UI is functional but minimal

These do not affect normal operation.

---

## 🧭 Version

Current version: **v0.3.5**

---

## 🧪 Status

- Functional testing: ✅
- Stress testing: ✅
- Theme compatibility: ✅
- LLM failure handling: ✅

---

## 🧠 Philosophy

Log Doctor separates:
- **Signal extraction** (logs → structured data)
- **Interpretation** (LLM)

This allows:
- reliable diagnostics even when AI is unavailable
- portable payloads for external analysis
- flexible interpretation across different AI systems

---

## 📌 Future Ideas

- Trend detection (time-based analysis)
- Root cause clustering
- Exportable reports
- Multi-model comparison
- Enhanced debug tooling

---