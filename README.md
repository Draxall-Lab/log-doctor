#  🧠 Log Doctor

Log Doctor is a diagnostic dashboard and AI-assisted analysis tool for Sapphire.

It turns raw application logs into structured, grouped issues and allows you to analyse them directly in chat using a payload-driven system.

It continues to function even without an AI provider, making it useful as both a diagnostic tool and an AI-assisted interpreter.

It’s designed to bridge the gap between raw logs and meaningful insight, with or without AI.

## 📦 Requirements
- Sapphire v2.5.x or later
- LLM provider (optional, required for in-app analysis)

Log parsing and payload generation work independently of the LLM.

## 🔗 Related Projects
Sapphire Core (by ddxfish) – the platform this plugin is built for:
https://github.com/ddxfish/sapphire

## 💡 Why Log Doctor?

Most log tools either:

- show raw logs, or
- depend entirely on AI to interpret them

Log Doctor separates:

Signal extraction (logs → structured issues)
Interpretation (AI or external analysis)

This means:

You always get usable diagnostics
AI becomes an enhancement, not a dependency

## 🚀 Features

### 📊 Dashboard & Log Analysis

Multi-log support:
Sapphire
Kokoro
Startup Errors
Story Engine
Grouped issues by normalised message
Frequency and recency sorting
Source and type filtering
Text search (supports OR, AND, NOT logic)
Hot issue highlighting

### 🔄 Version Awareness (v0.3.9)

Log Doctor now includes built-in version awareness.

Features:

- Displays current plugin version in the Diagnostics panel
- Performs a one-time update check on load
- Shows a subtle “Update Available” indicator in the status bar when applicable
- No background polling or intrusive notifications

This keeps the interface clean while ensuring users stay informed.

### 🔍 Unified Filtering Model (v0.3.8)

All UI elements operate from a single filtered dataset.

This means:

What you see is what gets analysed.

Counts, sections, and analysis are always aligned with the current view.

### ⏱️ Time-Based Filtering (v0.3.8)
Filter logs by:
Last 15 minutes
Last 1 hour
Last 6 hours
Last 24 hours
Reduces noise in large log sets
Enables focused “what just happened?” workflows

### ⏱️ Custom Time Range (v0.3.8)

In addition to preset time filters, Log Doctor now supports custom date/time ranges.

Features:

- Select a precise From and To range
- Presets and custom ranges are mutually exclusive
- Switching back to a preset restores relative filtering
- Returning to Custom:
  - From persists
  - To refreshes to current time

This enables precise investigation of specific time windows beyond preset ranges.

Behaviour:

Time filter is applied before all aggregation and rendering
Counts, sections, and analysis all reflect the same filtered dataset
Acts as an AND constraint with other filters
Untimestamped lines are included using anchor-based inheritance
(they follow the last valid timestamped entry)

### 🧠 Chat-Based Analysis
Analyse Current View → entire visible dataset
Analyse Top Issues
Analyse individual sections
Analyse single issues

All analysis is:

UI-scoped
payload-driven
injected into chat via hidden context

### ⚙️ Robust Interaction Model
One-shot payload system (no tool recursion)
In-memory payload registry (no DOM JSON corruption)
Pre-chat context injection
Clean separation between UI and LLM

### 🔒 Data Consistency (v0.3.8)

All payloads and summaries are now strictly derived from the visible filtered dataset.

This ensures:

- Time filters are applied consistently across UI and analysis
- Payloads cannot include out-of-scope log lines
- Summary counts reflect exactly what is visible

What you see is what gets analysed — without exceptions.

### 🛡️ Stability & Resilience
Anti-hammering protection
In-flight request locking
Cooldown handling on rate limit (HTTP 429)
Stable under rapid repeated input (stress tested)
Continues to function without an LLM provider

### 🎨 UI & Theme Compatibility
Fully tokenised styling (--ld-*)
Works across:
Dark mode
Light mode
Synthwave and custom themes
Wolfreaper's Themes plugin
Ghost-style action buttons for theme safety
Improved contrast and readability across all modes

### 🧪 Debug & Payload Export
Debug panel shows:
Internal diagnostic data
Last Analyse Payload
Copy payload to clipboard
Enables:
Offline analysis
Cross-AI troubleshooting
External diagnostic workflows

## 🧠 Architecture Overview

UI → Structured Payload → Plugin Endpoint → Chat Trigger → Hidden Context → LLM

Key principles:

No tool-based recursion
No exposed analysis tools
Payload is the single source of truth
Chat acts purely as interpreter

## 📘 Mini User Guide
🔹 Basic Workflow
Click Refresh to load logs
Apply filters:
Source (Sapphire, Kokoro, etc.)
Type (Errors, Warnings, Debug, Plugin)
Text search
Time filter
Review:
Sections
Top Issues
Click an analyse button to interpret results in chat

🔹 Understanding Filters
Source / Type / Text filters → refine what matches
Time filter → narrows when logs are considered
Combined behaviour:
Time filter runs first
All other filters operate within that window

🔹 Text Search Tips
discord,timeout → OR
discord+timeout → AND
discord-plugin or discord!plugin → NOT

🔹 Analysis Scopes
Main Analyse → entire visible dataset
Section Analyse → specific category (e.g. Kokoro Warnings)
Issue Analyse → single grouped issue

All analysis reflects exactly what is visible in the UI.

## 🔹 No AI? No Problem

If no LLM provider is configured:

Open Diagnostics panel
Copy the payload
Paste into another AI tool

## ⚠️ Known Behaviour

Counts by Source always reflects the current filtered dataset (including time filter)
Hidden context may occasionally surface under extreme rapid input
Busy indicator may briefly flicker during very fast operations

These are edge-case behaviours and do not affect normal operation.

## 🧭 Version

### v0.4.1

Improved consistency of filtered results across the dashboard.

Previously, the "Counts by Source" panel could show non-zero values while the corresponding section panels appeared empty when using text filters. This was caused by counts being calculated from a different data source than the rendered sections.

Counts are now derived from the same filtered section data as the visible panels, ensuring everything stays in sync.

Also includes minor internal cleanup to the filtering pipeline.

## 🧪 Status
Functional testing: ✅
Stress testing: ✅
Theme compatibility: ✅
LLM failure handling: ✅

## 🧠 Philosophy

Log Doctor separates:

Signal extraction (logs → structured data)
Interpretation (LLM)

This allows:

reliable diagnostics even when AI is unavailable
portable payloads for external analysis
flexible interpretation across different AI systems

## 📌 Future Ideas
Time-aware summary metrics (Counts by Source alignment)
Enhanced custom time controls (presets + saved ranges)
Trend detection
Root cause clustering
Exportable reports
Multi-model comparison
Enhanced debug tooling
