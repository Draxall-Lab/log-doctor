# Log Doctor 🧠

Log Doctor is a diagnostic dashboard and AI-assisted analysis tool for Sapphire.

It turns raw application logs into structured, grouped issues and allows you to analyse them directly in chat using a payload-driven system.

It continues to function even when no AI provider is available, making it useful as both a diagnostic tool and an AI-assisted interpreter.

---

## 📦 Requirements

- Sapphire v2.5.x or later
- LLM provider (optional, required for in-app analysis)

Log parsing and payload generation work independently of the LLM.

---

## 🔗 Related Projects

- Sapphire Core (by ddxfish) – the platform this plugin is built for:
  https://github.com/ddxfish/sapphire

---

## 💡 Why Log Doctor?

Most log tools either:
- show raw logs, or
- depend entirely on AI to interpret them

Log Doctor separates:
- **Signal extraction** (logs → structured issues)
- **Interpretation** (AI or external analysis)

This means:
- you always get usable diagnostics
- AI becomes an enhancement, not a dependency

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
- Stable under rapid repeated input (stress tested)
- Continues to function without an LLM provider

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

Results will appear in chat, based on the current UI selection.

If the LLM is unavailable:
- Use Debug panel → copy payload
- Paste into another AI for analysis

---

## ⚠️ Known Behaviour

- Hidden context may occasionally surface under extreme rapid input
- Busy indicator may briefly flicker during very fast operations
- Cooldown UI is intentionally minimal

These are edge-case behaviours and do not affect normal operation.

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
