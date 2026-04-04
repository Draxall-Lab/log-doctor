# 🩺 Log Doctor

Log Doctor is a Sapphire plugin that helps diagnose issues with other plugins by analysing logs and documentation, then suggesting clear next steps.

---

## ✨ What it does

Log Doctor provides two main capabilities:

### 🔍 Diagnose Plugin Issue
- Analyse Sapphire logs for errors or warnings
- Attempt to identify the relevant plugin
- Suggest likely causes and next steps
- Reference available documentation where possible

### 🩺 Plugin Health Check
- Scan recent logs for obvious issues
- Report any errors or warnings found
- Confirm when logs appear clean

---

## 🚧 Current Status

**Version:** v0.1  
**Status:** Early development

This version focuses on:
- Basic tool wiring
- Log-based diagnostics (initial implementation)
- Structured output

---

## ⚠️ Limitations (v0.1)

- Uses Sapphire logs only (no OS-level diagnostics)
- Plugin detection is best-effort
- Limited pattern recognition
- Does not modify system state or auto-fix issues

---

## 📦 Installation

Install via Sapphire Plugin Manager using the repository URL.

Alternatively:
1. Clone or download this repository
2. Place it in your Sapphire plugins directory
3. Enable the plugin in Sapphire

---

## 🧰 Available Tools

### `diagnose_plugin_issue`
Use when a plugin is not working as expected.

**Inputs:**
- `user_issue` (required): Description of the problem
- `plugin_name` (optional): Name of the plugin

---

### `run_plugin_health_check`
Use for a general check of plugin health.

**Inputs:**
- `scope` (optional): Specific plugin or area to check

---

## 🧠 Design Philosophy

Log Doctor is designed to act as a **diagnostic assistant**, not an automated fixer.

It will:
- Analyse
- Correlate
- Suggest next steps
- Escalate when needed

It will not:
- Change system settings
- Automatically repair issues

---

## 🔮 Future Ideas

- Improved pattern recognition
- Better plugin identification
- Deeper documentation analysis
- Confidence scoring

---

## 🤝 Contributing / Feedback

This is an early-stage project. Feedback and real-world test cases are welcome.

If you encounter issues:
- Check logs
- Try Log Doctor
- Share findings on Discord or GitHub

---

## 📄 License

TBC