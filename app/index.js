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
  currentSortMode,
  currentTextFilter,
  currentTimeFilter,
  timeFilterLabel,
  parseFilterTerms
} from "./filters.js";

async function reloadAndRender() {
  const data = await loadReport();
  
  setLastData(data);
  renderReport(data);

  updateScopeStatus("Refreshed");
  return data;
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
  statusEl.textContent = `${prefix} • ⏱ ${label}`;
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
     gap: 8px;
   }

   .ld-help-btn {
     display: inline-flex;
     align-items: center;
     justify-content: center;
     width: 26px;
     height: 26px;
     border-radius: 6px;
     font-size: 0.9em;
     font-weight: bold;
     text-decoration: none;
     color: var(--ld-text, #ddd);
     background: var(--ld-surface-2, #333);
     border: 1px solid var(--ld-border, #444);
     cursor: pointer;
     transition: all 0.15s ease;
   }

.ld-help-btn:hover {
  background: var(--ld-accent, #4da3ff);
  color: #fff;
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
            </select>

            <a
             href="https://github.com/Draxall-Lab/log-doctor#readme"
             target="_blank"
             rel="noopener noreferrer"
             class="ld-help-btn"
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
    function updateScopeStatus(prefix = "Refreshed") {
    const statusEl = container.querySelector("#ld-status");
    if (!statusEl) return;

    const label = timeFilterLabel(currentTimeFilter());
    statusEl.textContent = `${prefix} • ⏱ ${label}`;
  }

  container.querySelector("#ld-refresh")?.addEventListener("click", reloadAndRender);
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
    "#ld-sort-mode",
    "#ld-time-filter"
  ].forEach(sel => {
    container.querySelector(sel)?.addEventListener("change", () => {
      rerenderCurrentView();
      updateScopeStatus("Refreshed");
    });
  });

  const textFilter = container.querySelector("#ld-text-filter");
  const clearTextFilter = container.querySelector("#ld-text-filter-clear");

  textFilter?.addEventListener("input", rerenderCurrentView);

  textFilter?.addEventListener("keydown", async (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      await reloadAndRender();
    }
  });

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
}

export function cleanup() {
  setContainer(null);
  setLastData(null);
  setLastAnalysePayload(null);
}