import { showToastSafe } from "./debug.js";
import { loadReport, postAnalysePayload, sendMessageToChat } from "./api.js";
import { renderReport } from "./render.js";
import { wireDynamicActions } from "./events.js";
import {
  getLastAnalysePayload,
  setLastAnalysePayload,
  isAnalyseCoolingDown,
  isAnalyseInFlight,
  setAnalyseUiBusy,
  startAnalyseCooldown,
  rerenderFromCache,
  setContainer,
  setLastData
} from "./state.js";

import {
  buildAnalysePayload,
  getAnalysePayloadById
} from "./payload.js";

import {
  currentTimeFilter,
  timeFilterLabel,
  setTimeFilter,
  syncTimeFilterControl,
} from "./filters.js";

import { loadUiPrefs, saveUiPrefs, getDefaultUiPrefs } from "./prefs.js";

import { loadPluginMeta, checkPluginUpdate } from "./api.js";
import { setInstalledVersion,
         isUpdateAvailable,
         getLatestVersion,
         setLatestVersion } from "./version.js";

async function initVersionAwareness() {
  try {

    const meta = await loadPluginMeta();

    setInstalledVersion(meta?.version || null);

  } catch (err) {

  }

  try {

    const update = await checkPluginUpdate();

    setLatestVersion(update?.remote_version || null);

  } catch (err) {

  }

  rerenderCurrentView();
  updateScopeStatus("Refreshed");
}

function updateAndRender(container) {
  const state = readUiStateFromDom(container);
  saveUiPrefs(state);
  rerenderCurrentView();
  updateScopeStatus("Refreshed");
}

function applyUiStateToDom(container, prefs) {
  // TEXT FILTER
  const textFilter = container.querySelector("#ld-text-filter");
  if (textFilter) textFilter.value = prefs.textFilter || "";

  // MAX LINES
  const maxLines = container.querySelector("#ld-max-lines");
  if (maxLines) maxLines.value = prefs.maxLines ?? 5000;

  // SORT
  const sort = container.querySelector("#ld-sort-mode");
  if (sort) sort.value = prefs.sortMode || "frequency";

  // SOURCES
  Object.entries(prefs.sources || {}).forEach(([key, val]) => {
    const el = container.querySelector(`#ld-source-${key}`);
    if (el) el.checked = !!val;
  });

  // TYPES
  Object.entries(prefs.types || {}).forEach(([key, val]) => {
    const el = container.querySelector(`#ld-type-${key}`);
    if (el) el.checked = !!val;
  });

  // DIAGNOSTICS
  const diag = container.querySelector("#ld-toggle-diagnostics");
  if (diag) diag.checked = !!prefs.toggles?.diagnostics;

  // TIME FILTER
const timeSelect = container.querySelector("#ld-time-filter");
const customPanel = container.querySelector("#ld-time-custom");
const fromEl = container.querySelector("#ld-time-from");
const toEl = container.querySelector("#ld-time-to");

if (prefs.timeFilter) {
  // Always restore stored custom values, even if current mode is relative

  if (fromEl) {
    if (prefs.timeFilter.from) {
      if (fromEl._flatpickr) {
        fromEl._flatpickr.setDate(prefs.timeFilter.from, false);
      } else {
        fromEl.value = prefs.timeFilter.from;
      }
    } else {
      if (fromEl._flatpickr) {
        fromEl._flatpickr.clear();
      } else {
        fromEl.value = "";
      }
    }
  }

  if (toEl) {
    if (prefs.timeFilter.to) {
      if (toEl._flatpickr) {
        toEl._flatpickr.setDate(prefs.timeFilter.to, false);
      } else {
        toEl.value = prefs.timeFilter.to;
      }
    } else {
      if (toEl._flatpickr) {
        toEl._flatpickr.clear();
      } else {
        toEl.value = "";
      }
    }
  }

  // Apply active mode
  if (prefs.timeFilter.mode === "absolute") {
    setTimeFilter({
      mode: "absolute",
      from: prefs.timeFilter.from || "",
      to: prefs.timeFilter.to || ""
    });

    if (timeSelect) timeSelect.value = "custom";
    if (customPanel) customPanel.style.display = "block";
  } else {
    setTimeFilter({
      mode: "relative",
      preset: prefs.timeFilter.preset || "all",
      from: prefs.timeFilter.from || "",
      to: prefs.timeFilter.to || ""
    });

    if (timeSelect) timeSelect.value = prefs.timeFilter.preset || "all";
    if (customPanel) customPanel.style.display = "none";
  }
}

  syncTimeFilterControl(container);
}

function readUiStateFromDom(container) {
  const timeSelect = container.querySelector("#ld-time-filter");
  const fromEl = container.querySelector("#ld-time-from");
  const toEl = container.querySelector("#ld-time-to");

  const preset = timeSelect?.value || "all";
  const isCustom = preset === "custom";

  return {
    textFilter: container.querySelector("#ld-text-filter")?.value || "",
    maxLines: Number(container.querySelector("#ld-max-lines")?.value) || 5000,
    sortMode: container.querySelector("#ld-sort-mode")?.value || "frequency",

    sources: {
      sapphire: container.querySelector("#ld-source-sapphire")?.checked ?? true,
      kokoro: container.querySelector("#ld-source-kokoro")?.checked ?? true,
      startup: container.querySelector("#ld-source-startup")?.checked ?? true,
      story: container.querySelector("#ld-source-story")?.checked ?? true
    },

    types: {
      errors: container.querySelector("#ld-type-errors")?.checked ?? true,
      warnings: container.querySelector("#ld-type-warnings")?.checked ?? true,
      plugin: container.querySelector("#ld-type-plugin")?.checked ?? true,
      debug: container.querySelector("#ld-type-debug")?.checked ?? true
    },

    toggles: {
      diagnostics: container.querySelector("#ld-toggle-diagnostics")?.checked ?? false
    },

    timeFilter: {
      mode: isCustom ? "absolute" : "relative",
      preset: isCustom ? "custom" : preset,
      from: fromEl?.value || "",
      to: toEl?.value || ""
    },

    timeDisplay: {
      format12h: container.querySelector("#ld-time-display-format")?.value === "12"
}
  };
}

async function reloadAndRender() {
  const data = await loadReport();
  
  setLastData(data);
  renderReport(data);

  updateScopeStatus("Refreshed");
  return data;
}

function normaliseMaxLinesInput(container) {
  const input = container.querySelector("#ld-max-lines");
  if (!input) return 5000;

  const raw = String(input.value || "").trim();

  if (!raw) {
    input.value = "5000";
    return 5000;
  }

  let value = Number(raw);

  if (!Number.isFinite(value)) {
    value = 5000;
  }

  value = Math.max(100, Math.min(20000, Math.round(value)));
  input.value = String(value);
  return value;
}

function injectFlatpickrCss() {
  if (document.getElementById("log-doctor-flatpickr-css")) return;

  const link = document.createElement("link");
  link.id = "log-doctor-flatpickr-css";
  link.rel = "stylesheet";
  link.href = "/plugin-web/log-doctor/app/vendor/flatpickr/flatpickr.min.css";
  document.head.appendChild(link);
}

function injectFlatpickrJs() {
  return new Promise((resolve, reject) => {
    if (window.flatpickr) {
      resolve(window.flatpickr);
      return;
    }

    const existing = document.getElementById("log-doctor-flatpickr-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.flatpickr), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "log-doctor-flatpickr-js";
    script.src = "/plugin-web/log-doctor/app/vendor/flatpickr/flatpickr.min.js";
    script.onload = () => resolve(window.flatpickr);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function rerenderCurrentView() {
  const result = rerenderFromCache?.();

  // If state.js already handles the render internally, do nothing else.
  // If it returns cached data instead, render it here.
  if (result) {
    renderReport(result);
  }
}

function updateScopeStatus(prefix = "Refreshed") {
  const statusEl = document.querySelector("#ld-status");
  if (!statusEl) return;

  const label = timeFilterLabel(currentTimeFilter());
  let html = `${prefix} • ⏱ ${label}`;

  if (isUpdateAvailable()) {
    html += ` • <span class="ld-update">v${getLatestVersion()} Update Available</span>`;
  }

  statusEl.innerHTML = html;
}

async function analyseInChat() {
  const payload = buildAnalysePayload();

  if (!payload) {
    showToastSafe("Nothing to analyse yet. Refresh the report first.", "warning");
    return;
  }

  if (isAnalyseInFlight() || isAnalyseCoolingDown()) {
    showToastSafe("Analysis temporarily throttled. Try again in a few seconds.", "warning");
    return;
  }

  setLastAnalysePayload(payload);
  rerenderCurrentView();

  setAnalyseUiBusy(true);
  showToastSafe("Sending Log Doctor view to chat…", "info");

  try {
    const data = await postAnalysePayload(payload);
    const prompt = String(data.prompt || "Run Log Doctor analysis");

    await sendMessageToChat(prompt);

    showToastSafe("Analysis sent. Check Chat for the response.", "success");
  } catch (err) {
    if (String(err.message || "").includes("429")) {
      startAnalyseCooldown(8000);
      showToastSafe("Rate limit hit. Cooling down for a few seconds.", "warning");
    } else {
      showToastSafe(`Failed to send analysis: ${err.message}`, "error");
    }
  } finally {
    if (!isAnalyseCoolingDown()) {
      setAnalyseUiBusy(false);
    }
  }
}

async function analyseCustomPayload(payload) {
  if (!payload) {
    showToastSafe("Nothing to analyse for that scope.", "warning");
    return;
  }

  if (isAnalyseInFlight() || isAnalyseCoolingDown()) {
    showToastSafe("Analysis temporarily throttled. Try again in a few seconds.", "warning");
    return;
  }

  setLastAnalysePayload(payload);
  rerenderCurrentView();

  setAnalyseUiBusy(true);
  showToastSafe("Sending selected scope to chat…", "info");

  try {
    const data = await postAnalysePayload(payload);
    const prompt = String(data.prompt || "Run Log Doctor analysis");

    await sendMessageToChat(prompt);

    showToastSafe("Analysis sent. Check Chat for the response.", "success");
  } catch (err) {
    if (String(err.message || "").includes("429")) {
      startAnalyseCooldown(8000);
      showToastSafe("Rate limit hit. Cooling down for a few seconds.", "warning");
    } else {
      showToastSafe(`Failed to send analysis: ${err.message}`, "error");
    }
  } finally {
    if (!isAnalyseCoolingDown()) {
      setAnalyseUiBusy(false);
    }
  }
}

function injectStyles() {
  if (document.getElementById("log-doctor-app-styles")) return;

  const style = document.createElement("style");
  style.id = "log-doctor-app-styles";
  style.textContent = `
    :root {
      --ld-surface: var(--bg-secondary);
      --ld-surface-elevated: var(--bg-tertiary, var(--bg-secondary));
      --ld-surface-hover: var(--bg-hover, var(--ld-surface-elevated));
      --ld-border-subtle: var(--border);
      --ld-border-strong: var(--border-light, var(--border));
      --ld-text-primary: var(--text);
      --ld-text-secondary: var(--text-muted);

      --ld-accent-primary: #22c55e;
      --ld-accent-primary-hover: #16a34a;
      --ld-accent-secondary: #3b82f6;
      --ld-accent-secondary-hover: #2563eb;
      --ld-accent-tertiary: #f59e0b;          /* orange */
      --ld-accent-tertiary-hover: #d97706;

      --ld-status-error: #ff6b6b;
      --ld-status-warning: #f0b84b;
      --ld-status-info: #3b82f6;
      --ld-status-success: #22c55e;
      --ld-status-plugin: #58c472;
      --ld-status-debug: #8ab4ff;

      --ld-hot-surface: color-mix(in srgb, var(--ld-status-warning) 6%, var(--ld-surface));
      --ld-hot-border: color-mix(in srgb, var(--ld-status-warning) 45%, var(--ld-border-subtle));
      --ld-shadow-elevated: 0 6px 18px rgba(0, 0, 0, 0.16);
    }

   .ld-update {
     color: var(--ld-accent-tertiary);;
}

    .ld-tag-debug {
     color: var(--ld-status-debug);
   }
   .ld-debug-payload {
     margin-top: 10px;
     display: flex;
     flex-direction: column;
     gap: 8px;
   }

   .ld-debug-payload pre {
     max-height: 260px;
     overflow: auto;
     padding: 10px;
     border-radius: 6px;
     background: var(--ld-surface-elevated);
     border: 1px solid var(--ld-border-subtle);
     font-size: 11px;
   }

  .ld-time-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

  #ld-time-custom {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  #ld-time-custom label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.9rem;
    color: var(--ld-text, #ddd);
  }

  #ld-time-filter,
  #ld-time-from,
  #ld-time-to {
    background: var(--ld-surface);
    color: var(--ld-text-primary);
    border: 1px solid var(--ld-border-subtle);
    border-radius: 6px;
    box-sizing: border-box;
    min-height: 34px;
    padding: 8px 10px;
}

  #ld-time-filter {
    width: 150px;  
    min-width: 150px;
}

  #ld-time-from,
  #ld-time-to {
    width: 150px;  
    min-width: 150px;
}
  #ld-time-custom input[type="hidden"] + input {
    width: 150px;
    min-width: 150px;
    background: var(--ld-surface);
    color: var(--ld-text-primary);
    border: 1px solid var(--ld-border-subtle);
    border-radius: 6px;
    box-sizing: border-box;
    min-height: 34px;
    padding: 8px 10px;
  }

  #ld-time-display-format {
    width: 80px;
    min-width: 80px;
}

  #ld-time-filter:focus,
  #ld-time-from:focus,
  #ld-time-to:focus,
  #ld-time-apply:focus {
    outline: none;
    border-color: var(--ld-border-strong);
}

  .ld-filter-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12px; /* or 12px if you want it airier */
}

  .ld-filter-actions .ld-btn { 
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    padding: 8px 10px;
    text-decoration: none;
    white-space: nowrap; 
    cursor: pointer;
}

.ld-filter-actions .ld-btn-reset {
  border: 1px solid var(--ld-accent-secondary);
  background: var(--ld-accent-secondary);
  color: #fff;
}

.ld-filter-actions .ld-btn-reset:hover {
  background: var(--ld-accent-secondary-hover);
  border-color: var(--ld-accent-secondary-hover);
}

.ld-filter-actions .ld-btn-help {
  border: 1px solid var(--ld-accent-tertiary);
  background: var(--ld-accent-tertiary);
  color: #fff;
  font-weight: 700;
  min-width: 34px;
}

.ld-filter-actions .ld-btn-help:hover {
  background: var(--ld-accent-tertiary-hover);
  border-color: var(--ld-accent-tertiary-hover);
}

}

  .ld-section-divider {
    grid-column: 1 / -1;
    margin: 2rem 0 1rem;
    text-align: center;
    position: relative;
  }

   .ld-grid > .ld-section-divider:first-child {
     margin-top: 8px;
  }

   .ld-counts-grid {
     display: grid;
     grid-template-columns: repeat(2, minmax(0, 1fr));
     gap: 0; /* important: we’ll control spacing via padding */
     margin-top: 12px;
     position: relative;
  }

  /* Vertical divider (middle) */
   .ld-counts-grid::before {
     content: "";
     position: absolute;
     top: 0;
     bottom: 0;
     left: 50%;
     width: 1px;
     background: var(--ld-border);
     opacity: 0.6;
   }

  /* Horizontal divider (middle) */
   .ld-counts-grid::after {
     content: "";
     position: absolute;
     left: 0;
     right: 0;
     top: 50%;
     height: 1px;
     background: var(--ld-border);
     opacity: 0.6;
   }

   .ld-subcard {
     border: none; /* remove inner borders so grid lines are clean */
     padding: 16px;
     background: transparent;
   }

   .ld-subcard h3 {
     margin-top: 0;
  }

   @media (max-width: 900px) {
     .ld-counts-grid {
       grid-template-columns: 1fr;
     }
  }

   .ld-counts-grid > * {
     padding: 16px;
  }

   /* Left column spacing */
   .ld-counts-grid > *:nth-child(odd) {
     padding-right: 20px;
  }

   /* Right column spacing */
   .ld-counts-grid > *:nth-child(even) {
     padding-left: 20px;
  }

   /* Top row spacing */
   .ld-counts-grid > *:nth-child(-n+2) {
     padding-bottom: 20px;
  }

   /* Bottom row spacing */
   .ld-counts-grid > *:nth-child(n+3) {
     padding-top: 20px;
  }

  @media (max-width: 900px) {
    .ld-counts-grid {
      grid-template-columns: 1fr;
  }

   .ld-counts-grid::before,
   .ld-counts-grid::after {
     display: none;
  }

   .ld-counts-grid > * {
     padding: 12px 0;
  }
 }

   .ld-section-divider::before {
     content: "";
     position: absolute;
     top: 50%;
     left: 0;
     right: 0;
     height: 1px;
     background: var(--ld-border-subtle);
     opacity: 0.9;
     z-index: 0;
}

   .ld-section-divider h2 {
     position: relative;
     z-index: 1;
     display: inline-block;
     margin: 0;
     padding: 0 12px;
     background: var(--ld-surface);
     color: var(--ld-text-secondary);
     font-size: 0.78rem;
     font-weight: 700;
     letter-spacing: 0.1em;
     text-transform: uppercase;
     line-height: 1.2;
}

    .ld-shell {
      padding: 16px;
      color: var(--ld-text-primary);
      overflow-y: auto;
      max-height: 100%;
      box-sizing: border-box;
    }

    #app-log-doctor,
    [data-app="log-doctor"] {
      min-height: 0;
    }

    .ld-toolbar {
      display: flex;
      gap: 14px;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .ld-toolbar label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .ld-toolbar input,
    .ld-toolbar button,
    .ld-toolbar select {
      background: var(--ld-surface);
      color: var(--ld-text-primary);
      border: 1px solid var(--ld-border-subtle);
      border-radius: 6px;
      padding: 8px 10px;
    }

    .ld-toolbar button {
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
    }

    .ld-toolbar button:disabled,
    .ld-icon-btn:disabled,
    .ld-clear-btn:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }

    #ld-refresh {
      background: var(--ld-accent-secondary);
      border-color: var(--ld-accent-secondary);
      color: #fff;
    }

    #ld-refresh:hover {
      background: var(--ld-accent-secondary-hover);
      border-color: var(--ld-accent-secondary-hover);
    }

    #ld-analyse-chat {
      background: var(--ld-accent-primary);
      border-color: var(--ld-accent-primary);
      color: #fff;
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--ld-accent-primary) 35%, transparent);
    }

    #ld-analyse-chat:hover {
      background: var(--ld-accent-primary-hover);
      border-color: var(--ld-accent-primary-hover);
    }

    #ld-analyse-chat:disabled:hover {
      background: var(--ld-accent-primary);
      border-color: var(--ld-accent-primary);
    }

    .ld-status {
      color: var(--ld-text-secondary);
      font-weight: 500;
    }

    .ld-status[data-state="success"] {
      color: var(--ld-status-success);
    }

    .ld-status[data-state="warning"] {
      color: var(--ld-status-warning);
    }

    .ld-status[data-state="error"] {
      color: var(--ld-status-error);
    }

    .ld-filters {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      padding: 10px 12px;
      background: var(--ld-surface);
      border: 1px solid var(--ld-border-subtle);
      border-radius: 8px;
    }

    .ld-filter-group {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .ld-filter-group + .ld-filter-group {
      padding-left: 14px;
      border-left: 1px solid var(--ld-border-strong);
    }

    .ld-filter-group strong {
      color: var(--ld-text-secondary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .ld-filter-group label {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      font-size: 13px;
    }

    .ld-filter-group.ld-filter-time {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }

    .ld-filter-group.ld-filter-time strong {
      display: inline-block;
      margin: 0;
      white-space: nowrap;
    }

    .ld-filter-group.ld-filter-time select {
      width: auto;
      min-width: 160px;
    }

    .ld-search-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-right: 6px;
    }

    .ld-search-wrap input {
      min-width: 220px;
    }

    .ld-clear-btn,
    .ld-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 34px;
      height: 34px;
      padding: 0 8px;
      border-radius: 6px;
      border: 1px solid var(--ld-border-subtle);
      background: transparent;
      color: var(--ld-text-primary);
      cursor: pointer;
      transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
    }

    .ld-clear-btn:hover,
    .ld-icon-btn:hover {
      background: var(--ld-surface-hover);
      border-color: var(--ld-border-strong);
    }

    .ld-icon-btn:active,
    .ld-clear-btn:active {
      transform: translateY(1px);
    }

    .ld-icon-btn.ld-busy {
      font-size: 14px;
    }

    .ld-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .ld-card {
      background: var(--ld-surface);
      border: 1px solid var(--ld-border-subtle);
      border-radius: 8px;
      padding: 14px;
    }

    .ld-wide {
      grid-column: 1 / -1;
    }

    .ld-card h2,
    .ld-card h3 {
      margin-top: 0;
      color: var(--ld-text-primary);
    }

    .ld-card h3 {
      margin-bottom: 10px;
    }

    .ld-section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .ld-kv {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 8px;
      padding: 4px 0;
      border-bottom: 1px solid var(--ld-border-subtle);
    }

    .ld-key {
      color: var(--ld-text-secondary);
    }

    .ld-val {
      color: var(--ld-text-primary);
      font-weight: 600;
    }

    .ld-line {
      padding: 10px 12px;
      margin: 0 -4px;
      border-bottom: 1px solid var(--ld-border-subtle);
      border-radius: 8px;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      transition: background 0.18s ease, border-color 0.18s ease;
    }

    .ld-line:hover {
      background: var(--ld-surface-hover);
    }

    .ld-hot {
      background: var(--ld-hot-surface);
      border-left: 3px solid var(--ld-hot-border);
      padding-left: 9px;
    }

    .ld-line-head {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }

    .ld-line-body {
      white-space: pre-wrap;
    }

    .ld-tag {
      font-weight: 700;
    }

    .ld-tag-error {
      color: var(--ld-status-error);
    }

    .ld-tag-warning {
      color: var(--ld-status-warning);
    }

    .ld-tag-plugin {
      color: var(--ld-status-plugin);
    }

    .ld-source-pill {
      color: var(--ld-text-secondary);
      border: 1px solid var(--ld-border-strong);
      background: color-mix(in srgb, var(--ld-surface-elevated) 85%, var(--ld-text-primary) 3%);
      border-radius: 999px;
      padding: 1px 6px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .ld-count {
      color: var(--ld-text-primary);
      opacity: 0.85;
      font-weight: 700;
    }

    .ld-time {
      color: var(--ld-text-secondary);
      font-size: 11px;
    }

    .ld-hot-badge {
      color: var(--ld-status-warning);
      border: 1px solid var(--ld-status-warning);
      background: color-mix(in srgb, var(--ld-status-warning) 10%, transparent);
      border-radius: 999px;
      padding: 1px 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .ld-empty {
      color: var(--ld-text-secondary);
    }

    .ld-error {
      color: var(--ld-status-error);
    }

    #ld-toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 9999;
      pointer-events: none;
    }

    .ld-toast {
      min-width: 240px;
      max-width: 320px;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--ld-border-strong);
      background: var(--ld-surface-elevated);
      color: var(--ld-text-primary);
      font-size: 13px;
      box-shadow: var(--ld-shadow-elevated);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.2s ease;
      pointer-events: auto;
    }

    .ld-toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .ld-toast-success {
      border-color: var(--ld-status-success);
    }

    .ld-toast-warning {
      border-color: var(--ld-status-warning);
    }

    .ld-toast-error {
      border-color: var(--ld-status-error);
    }

    .ld-toast-info {
      border-color: var(--ld-status-info);
    }

    @media (max-width: 900px) {
      .ld-grid {
        grid-template-columns: 1fr;
      }

      .ld-kv {
        grid-template-columns: 1fr;
      }

      .ld-search-wrap input {
        min-width: 160px;
      }
    }
  `;
  document.head.appendChild(style);
}

export async function render(container) {
  setContainer(container);

  injectStyles();

  injectFlatpickrCss();
  await injectFlatpickrJs();

  container.innerHTML = `
    <div class="ld-shell">
      <div class="ld-toolbar">
        <label>Max lines <input id="ld-max-lines" type="number" value="5000" min="100" max="20000" step="100"></label>
        <button id="ld-refresh">Refresh</button>
        <button id="ld-analyse-chat">Analyse in Chat</button>

        <label>Search
          <span class="ld-search-wrap">
            <input
              id="ld-text-filter"
              type="text"
              placeholder="Search logs"
              title="Text filter tips:

, = OR
discord,timeout

+ = AND
discord+timeout

- or ! = NOT
discord-plugin
discord!plugin

No spaces inside operators:
use discord+timeout
not discord + timeout

Examples:
discord,timeout
discord+timeout
discord-plugin
discord+timeout-plugin"
            >
            <button
              id="ld-text-filter-clear"
              class="ld-clear-btn"
              type="button"
              title="Clear filter"
              aria-label="Clear filter"
            >✕</button>
          </span>
        </label>

        <label>Sort
          <select id="ld-sort-mode">
            <option value="frequency">Frequency</option>
            <option value="recency">Recency</option>
          </select>
        </label>

        <span id="ld-status" class="ld-status">Ready</span>
      </div>

      <div class="ld-filters">
        <div class="ld-filter-group">
          <strong>Type</strong>
          <label><input id="ld-type-errors" type="checkbox" checked> Errors</label>
          <label><input id="ld-type-warnings" type="checkbox" checked> Warnings</label>
          <label><input id="ld-type-debug" type="checkbox" checked> Debug</label>
          <label><input id="ld-type-plugin" type="checkbox" checked> Plugin / Info</label>
        </div>

        <div class="ld-filter-group">
          <strong>View</strong>
          <label><input type="checkbox" id="ld-source-sapphire" checked> Sapphire</label>
          <label><input type="checkbox" id="ld-source-kokoro" checked> Kokoro</label>
          <label><input type="checkbox" id="ld-source-startup" checked> Startup</label>
          <label><input type="checkbox" id="ld-source-story" checked> Story</label>
          <label><input id="ld-toggle-diagnostics" type="checkbox" checked> Diagnostics</label>
        </div>

        <div class="ld-filter-group ld-filter-time">
          <strong>Time</strong>

          <div class="ld-time-controls">
            <select id="ld-time-filter">
              <option value="all">All time</option>
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last 1 hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="custom">Custom range</option>
            </select>

            <div id="ld-time-custom" style="display: none;">
              <label>From <input id="ld-time-from" placeholder="From date & time"></label>
              <label>To <input id="ld-time-to" placeholder="To date & time"></label>
              
              <label class="ld-time-format">
              <select id="ld-time-display-format">
                <option value="24">24h</option>
                <option value="12">12h</option>
              </select>
              </label>
              
            </div>
          </div>

          <div class="ld-filter-actions">
            <button id="ld-reset-filters" class="ld-btn ld-btn-reset">Reset Filters</button>

            <a
              href="https://github.com/Draxall-Lab/log-doctor#readme"
              target="_blank"
              rel="noopener noreferrer"
              class="ld-btn ld-btn-help"
              title="Open help"
              aria-label="Help"
            >
              ?
            </a>
          </div>
        </div>
      </div>

      <div id="ld-output"></div>
    </div>
  `;

  getLastAnalysePayload(); // hydrate persisted last payload into memory
  
  const uiPrefs = loadUiPrefs();
  applyUiStateToDom(container, uiPrefs);

  const timeFormatSelect = container.querySelector("#ld-time-display-format");

  // initialise UI from prefs
  timeFormatSelect.value = uiPrefs?.timeDisplay?.format12h ? "12" : "24";

  // handle toggle
  timeFormatSelect?.addEventListener("change", () => {
    const use12h = timeFormatSelect.value === "12";

    const state = readUiStateFromDom(container);
    state.timeDisplay = { format12h: use12h };

    saveUiPrefs(state);

    rebuildTimePickers(container, use12h);
});

  function updateScopeStatus(prefix = "Refreshed") {
    const statusEl = container.querySelector("#ld-status");
    if (!statusEl) return;

    const label = timeFilterLabel(currentTimeFilter());
    statusEl.textContent = `${prefix} • ⏱ ${label}`;
  }

  function formatDateTimeLocal(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
   return d;
 }

  const resetFiltersBtn = container.querySelector("#ld-reset-filters");

  resetFiltersBtn?.addEventListener("click", () => {
    const defaults = getDefaultUiPrefs();

    applyUiStateToDom(container, defaults);
    saveUiPrefs(defaults);

    rerenderCurrentView();
    updateScopeStatus("Refreshed");
    showToastSafe("Filters reset to defaults", "info");
  });

  syncTimeFilterControl(container);

  const timeSelect = container.querySelector("#ld-time-filter");
const customPanel = container.querySelector("#ld-time-custom");
const use12h = !!uiPrefs?.timeDisplay?.format12h;

const timeDisplaySelect = container.querySelector("#ld-time-display-format");
if (timeDisplaySelect) {
  timeDisplaySelect.value = use12h ? "12" : "24";
}

if (customPanel) {
  customPanel.style.display = currentTimeFilter()?.mode === "absolute" ? "block" : "none";
}

function buildFlatpickrConfig({ use12h, defaultDate, onChange }) {
  return {
    enableTime: true,
    time_24hr: !use12h,
    dateFormat: "Y-m-d H:i",
    altInput: true,
    altFormat: use12h ? "Y-m-d h:i K" : "Y-m-d H:i",
    defaultDate,
    onChange
  };
}

function rebuildTimePickers(container, use12h) {
  const fromEl = container.querySelector("#ld-time-from");
  const toEl = container.querySelector("#ld-time-to");

  const fromValue = fromEl?.value || "";
  const toValue = toEl?.value || "";

  fromEl?._flatpickr?.destroy();
  toEl?._flatpickr?.destroy();

  requestAnimationFrame(() => {
    if (fromEl) {
      flatpickr(fromEl, buildFlatpickrConfig({
        use12h,
        onChange: () => {
          const fromPicker = fromEl._flatpickr;
          const toPicker = toEl?._flatpickr;

          const from = fromPicker?.selectedDates?.[0] || null;
          const to = toPicker?.selectedDates?.[0] || null;

          if (from && to && from > to) {
            const adjustedFrom = startOfDay(to);

            if (fromPicker) {
              fromPicker.setDate(adjustedFrom, false);
            } else {
              fromEl.value = formatDateTimeLocal(adjustedFrom);
            }

            showToastSafe("From cannot be later than To. Range adjusted.", "info");
          }

          setTimeFilter({
            mode: "absolute",
            from: fromEl.value || "",
            to: toEl?.value || ""
          });

          saveUiPrefs(readUiStateFromDom(container));
          rerenderCurrentView();
          updateScopeStatus("Refreshed");
        }
      }));

      if (fromValue) {
        fromEl._flatpickr?.setDate(fromValue, false);
      }
    }

    if (toEl) {
      flatpickr(toEl, buildFlatpickrConfig({
        use12h,
        defaultDate: new Date(),
        onChange: () => {
          const fromPicker = fromEl?._flatpickr;
          const toPicker = toEl._flatpickr;

          const from = fromPicker?.selectedDates?.[0] || null;
          const to = toPicker?.selectedDates?.[0] || null;

          if (from && to && to < from) {
            const now = new Date();
            const adjustedTo = from > now ? from : now;

            if (toPicker) {
              toPicker.setDate(adjustedTo, false);
            } else {
              toEl.value = formatDateTimeLocal(adjustedTo);
            }

            showToastSafe("To cannot be earlier than From. Range adjusted.", "info");
          }

          setTimeFilter({
            mode: "absolute",
            from: fromEl?.value || "",
            to: toEl.value || ""
          });

          saveUiPrefs(readUiStateFromDom(container));
          rerenderCurrentView();
          updateScopeStatus("Refreshed");
        }
      }));

      if (toValue) {
        toEl._flatpickr?.setDate(toValue, false);
      }
    }
  });
}

rebuildTimePickers(container, use12h);

timeDisplaySelect?.addEventListener("change", () => {
  const format12h = timeDisplaySelect.value === "12";

  const state = readUiStateFromDom(container);
  state.timeDisplay = { format12h };

  saveUiPrefs(state);
  rebuildTimePickers(container, format12h);
});

  timeSelect?.addEventListener("change", () => {
    const val = timeSelect.value;

    const fromEl = container.querySelector("#ld-time-from");
    const toEl = container.querySelector("#ld-time-to");
    const fromPicker = fromEl?._flatpickr;
    const toPicker = toEl?._flatpickr;

    if (val === "custom") {
      if (fromEl && !fromEl.value) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        if (fromPicker) {
          fromPicker.setDate(startOfToday, false);
        } else {
          fromEl.value = formatDateTimeLocal(startOfToday);
        }
      }

      if (toPicker && !toEl?.value) {
        toPicker.setDate(new Date(), false);
      }

      setTimeFilter({
        mode: "absolute",
        from: fromEl?.value || "",
        to: toEl?.value || ""
      });

      syncTimeFilterControl(container);
      saveUiPrefs(readUiStateFromDom(container));
      rerenderCurrentView();
      updateScopeStatus("Refreshed");
      return;
    }

    setTimeFilter({
      mode: "relative",
      preset: val || "all"
    });

    saveUiPrefs(readUiStateFromDom(container));
    syncTimeFilterControl(container);
    rerenderCurrentView();
    updateScopeStatus("Refreshed");
  });

  container.querySelector("#ld-refresh")?.addEventListener("click", async () => {
    normaliseMaxLinesInput(container);
    await reloadAndRender();
  });

  container.querySelector("#ld-analyse-chat")?.addEventListener("click", analyseInChat);

  [
    "#ld-source-sapphire",
    "#ld-source-kokoro",
    "#ld-source-startup",
    "#ld-source-story",
    "#ld-type-errors",
    "#ld-type-warnings",
    "#ld-type-plugin",
    "#ld-type-debug",
    "#ld-toggle-diagnostics",
    "#ld-sort-mode"
  ].forEach(sel => {
    container.querySelector(sel)?.addEventListener("change", () => {
      const state = readUiStateFromDom(container);
      saveUiPrefs(state);
      rerenderCurrentView();
      updateScopeStatus("Refreshed");
    });
  });

  const maxLinesInput = container.querySelector("#ld-max-lines");
  let maxLinesTimer;

  async function applyMaxLinesChange(container) {
    normaliseMaxLinesInput(container);

    const maxLinesInput = container.querySelector("#ld-max-lines");
    const raw = String(maxLinesInput?.value || "").trim();
    const value = Number(raw);

    if (!raw) return;
    if (!Number.isFinite(value)) return;
    if (value < 100 || value > 20000) return;

    const state = readUiStateFromDom(container);
    saveUiPrefs(state);

    await reloadAndRender();
  }

  function saveMaxLinesIfValid(container) {
    const maxLinesInput = container.querySelector("#ld-max-lines");
    const raw = String(maxLinesInput?.value || "").trim();
    const value = Number(raw);

    if (!raw) return;
    if (!Number.isFinite(value)) return;
    if (value < 100 || value > 20000) return;

    const state = readUiStateFromDom(container);
    saveUiPrefs(state);
  }

  maxLinesInput?.addEventListener("input", () => {
    clearTimeout(maxLinesTimer);

    maxLinesTimer = setTimeout(async () => {
      const raw = String(maxLinesInput.value || "").trim();
      const value = Number(raw);

      if (!raw) return;
      if (!Number.isFinite(value)) return;
      if (value < 100 || value > 20000) return;

      const state = readUiStateFromDom(container);
      saveUiPrefs(state);

      await reloadAndRender();
    }, 350);
  });

  maxLinesInput?.addEventListener("keydown", async (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      clearTimeout(maxLinesTimer);
      await applyMaxLinesChange(container);
    }
  });

  maxLinesInput?.addEventListener("blur", () => {
    clearTimeout(maxLinesTimer);
    normaliseMaxLinesInput(container);
    saveMaxLinesIfValid(container);
  });

  const textFilter = container.querySelector("#ld-text-filter");
  const clearTextFilter = container.querySelector("#ld-text-filter-clear");

  textFilter?.addEventListener("input", () => updateAndRender(container));

  clearTextFilter?.addEventListener("click", () => {
    if (textFilter) {
      textFilter.value = "";
      textFilter.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  wireDynamicActions(container, {
    loadReport: reloadAndRender,
    analyseCustomPayload,
    showToastSafe,
    getLastAnalysePayload,
    isAnalyseCoolingDown,
    isAnalyseInFlight,
    getAnalysePayloadById,
    rerenderFromCache: rerenderCurrentView
  });

  await reloadAndRender();
  updateScopeStatus("Refreshed");
  initVersionAwareness();
}

export function cleanup() {
  setContainer(null);
  setLastData(null);
}