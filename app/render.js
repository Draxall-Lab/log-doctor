import { sectionVisible } from "./filters.js";
import {
  getVisibleBlocks,
  applyTextFilterToGrouped,
  applyTextFilterToLines,
  applyTimeFilterToLines,
  currentTimeFilter,
  groupLines,
} from "./filters.js";
import {
  clearAnalysePayloadRegistry,
  buildScopedPayload,
  buildIssuePayload,
  registerAnalysePayload,
} from "./payload.js";
import {
  isAnalyseInFlight,
  isAnalyseCoolingDown,
  getLastAnalysePayload,
  setAnalyseUiBusy,
} from "./state.js";

function computeCountsFromSections(sections) {
  const sectionMap = [
    ["sapphire_errors", "sapphire", "error"],
    ["sapphire_warnings", "sapphire", "warning"],
    ["sapphire_debug", "sapphire", "debug"],
    ["sapphire_plugins", "sapphire", "plugin"],

    ["kokoro_errors", "kokoro", "error"],
    ["kokoro_warnings", "kokoro", "warning"],
    ["kokoro_debug", "kokoro", "debug"],
    ["kokoro_plugins", "kokoro", "plugin"],

    ["startup_errors", "startup", "error"],
    ["startup_warnings", "startup", "warning"],
    ["startup_debug", "startup", "debug"],
    ["startup_plugins", "startup", "plugin"],

    ["story_errors", "story", "error"],
    ["story_warnings", "story", "warning"],
    ["story_debug", "story", "debug"],
    ["story_plugins", "story", "plugin"],
  ];

  const counts = {
    sapphire: { error: 0, warning: 0, debug: 0, plugin: 0 },
    kokoro: { error: 0, warning: 0, debug: 0, plugin: 0 },
    startup: { error: 0, warning: 0, debug: 0, plugin: 0 },
    story: { error: 0, warning: 0, debug: 0, plugin: 0 },
  };

  const preset = currentTimeFilter();

  for (const [sectionKey, source, category] of sectionMap) {
    if (!sectionVisible(source, category)) continue;

    const rawLines = Array.isArray(sections[sectionKey]) ? sections[sectionKey] : [];
    const timeFilteredLines = applyTimeFilterToLines(rawLines, preset);
    const filteredLines = applyTextFilterToLines(timeFilteredLines);

    counts[source][category] = filteredLines.length;
  }

  return counts;
}

function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escAttr(text) {
  return esc(text).replaceAll('"', "&quot;");
}

function renderCountBlock(title, values) {
  return `
    <section class="ld-subcard">
      <h3>${esc(title)}</h3>
      ${kvHtml(values || {})}
    </section>
  `;
}

function categoryClass(category) {
  const c = String(category || "").toLowerCase();
  if (c === "error") return "ld-tag-error";
  if (c === "warning") return "ld-tag-warning";
  if (c === "debug") return "ld-tag-debug";
  return "ld-tag-plugin";
}

function kvHtml(obj) {
  if (!obj) return "<div class='ld-empty'>None</div>";
  return Object.entries(obj)
    .map(([k, v]) => {
      return `<div class="ld-kv"><span class="ld-key">${esc(k)}</span><span class="ld-val">${esc(v)}</span></div>`;
    })
    .join("");
}

function analyseButtonHtml(payload, title = "Analyse this in chat", extraClass = "") {
  const payloadId = registerAnalysePayload(payload);

  return `
    <button
      class="${`ld-icon-btn ${extraClass}`.trim()}"
      data-ld-analyse-id="${escAttr(payloadId || "")}"
      title="${escAttr(title)}"
      aria-label="${escAttr(title)}"
      type="button"
      ${(isAnalyseInFlight() || isAnalyseCoolingDown()) ? "disabled" : ""}
    >${(isAnalyseInFlight() || isAnalyseCoolingDown()) ? "⏳" : "🧠"}</button>
  `;
}

function groupedLinesHtml(lines, context = {}) {
  const timeFiltered = applyTimeFilterToLines(lines, currentTimeFilter());
  const grouped = applyTextFilterToGrouped(groupLines(timeFiltered));
  if (!grouped.length) return "<div class='ld-empty'>None</div>";

  return grouped
    .map((item) => {
      const cls = categoryClass(item.category);
      const tag = esc(String(item.category || "plugin").toUpperCase());
      const hotClass = item.count >= 5 ? " ld-hot" : "";
      const issuePayload = buildIssuePayload(item, context.title || "Issue");

      return `
      <div class="ld-line${hotClass}">
        <div class="ld-line-head">
          <span class="ld-tag ${cls}">[${tag}]</span>
          <span class="ld-source-pill">${esc(item.source)}</span>
          <span class="ld-count">×${esc(item.count)}</span>
          ${item.firstSeen ? `<span class="ld-time">first: ${esc(item.firstSeen)}</span>` : ""}
          ${item.lastSeen ? `<span class="ld-time">last: ${esc(item.lastSeen)}</span>` : ""}
          ${item.count >= 5 ? `<span class="ld-hot-badge">HOT</span>` : ""}
          ${analyseButtonHtml(issuePayload, "Analyse this issue in chat", "ld-line-analyse")}
        </div>
        <div class="ld-line-body">${esc(item.message)}</div>
      </div>
    `;
    })
    .join("");
}

function renderSection(title, lines, source, type) {

  if (!sectionVisible(source, type)) return "";

  const timeFilteredLines = applyTimeFilterToLines(lines, currentTimeFilter());
  const filteredLines = applyTextFilterToLines(timeFilteredLines);
  const panelPayload = buildScopedPayload("section-view", filteredLines, title);

  return `
    <section class="ld-card ld-wide">
      <div class="ld-section-head">
        <h2>${esc(title)}</h2>
        ${analyseButtonHtml(panelPayload, "Analyse this section in chat")}
      </div>
      ${groupedLinesHtml(filteredLines, { title })}
    </section>
  `;
}

function renderTopIssues(sections) {
  const visible = getVisibleBlocks(sections);
  const timeFiltered = applyTimeFilterToLines(visible, currentTimeFilter());
  const grouped = applyTextFilterToGrouped(groupLines(timeFiltered)).slice(0, 8);
  const panelPayload = buildScopedPayload("top-issues", timeFiltered, "Top Issues");

  return `
    <section class="ld-card ld-wide">
      <div class="ld-section-head">
        <h2>Top Issues</h2>
        ${analyseButtonHtml(panelPayload, "Analyse top issues in chat")}
      </div>
      ${
        grouped.length
          ? grouped
              .map((item) => {
                const cls = categoryClass(item.category);
                const tag = esc(String(item.category || "plugin").toUpperCase());
                const hotClass = item.count >= 5 ? " ld-hot" : "";
                const issuePayload = buildIssuePayload(item, "Top Issues");

                return `
          <div class="ld-line${hotClass}">
            <div class="ld-line-head">
              <span class="ld-tag ${cls}">[${tag}]</span>
              <span class="ld-source-pill">${esc(item.source)}</span>
              <span class="ld-count">×${esc(item.count)}</span>
              ${item.lastSeen ? `<span class="ld-time">last: ${esc(item.lastSeen)}</span>` : ""}
              ${item.count >= 5 ? `<span class="ld-hot-badge">HOT</span>` : ""}
              ${analyseButtonHtml(issuePayload, "Analyse this issue in chat", "ld-line-analyse")}
            </div>
            <div class="ld-line-body">${esc(item.message)}</div>
          </div>
        `;
              })
              .join("")
          : "<div class='ld-empty'>None</div>"
      }
    </section>
  `;
}

export function renderReport(data) {
  clearAnalysePayloadRegistry();

  const output = document.querySelector("#ld-output");

  const summary = { ...(data.summary || {}) };
  const sections = data.sections || {};
  const debug = data.debug || {};

  const counts = computeCountsFromSections(data.raw_sections || data.sections || {});

  summary.raw_matched_log_lines_by_category = summary.overall_summary;
  delete summary.overall_summary;

  output.innerHTML = `
    <div class="ld-grid">
      <section class="ld-section-divider">
         <h2>Overview</h2>
      </section>
      <section class="ld-card ld-wide">
        <h2>Summary (All logs)</h2>
        ${kvHtml(summary)}
      </section>

      <section class="ld-card ld-wide">
         <h2>Counts by Source (filters applied)</h2>
         <div class="ld-counts-grid">
            ${renderCountBlock("Sapphire", counts.sapphire)}
            ${renderCountBlock("Kokoro", counts.kokoro)}
            ${renderCountBlock("Startup", counts.startup)}
            ${renderCountBlock("Story", counts.story)}
         </div>
      </section>

      <section class="ld-section-divider">
        <h2>Grouped Issues & Patterns</h2>
      </section>

      ${renderTopIssues(sections)}

      ${renderSection("Sapphire Errors", sections.sapphire_errors || [], "sapphire", "errors")}
      ${renderSection("Sapphire Warnings", sections.sapphire_warnings || [], "sapphire", "warnings")}
      ${renderSection("Sapphire Debug", sections.sapphire_debug || [], "sapphire", "debug")}
      ${renderSection("Sapphire Plugin / Info", sections.sapphire_plugins || [], "sapphire", "plugin")}

      ${renderSection("Kokoro Errors", sections.kokoro_errors || [], "kokoro", "errors")}
      ${renderSection("Kokoro Warnings", sections.kokoro_warnings || [], "kokoro", "warnings")}
      ${renderSection("Kokoro Debug", sections.kokoro_debug || [], "kokoro", "debug")}
      ${renderSection("Kokoro Plugin / Info", sections.kokoro_plugins || [], "kokoro", "plugin")}

      ${renderSection("Startup Errors", sections.startup_errors || [], "startup", "errors")}
      ${renderSection("Startup Warnings", sections.startup_warnings || [], "startup", "warnings")}
      ${renderSection("Startup Debug", sections.startup_debug || [], "startup", "debug")}
      ${renderSection("Startup Plugin / Info", sections.startup_plugins || [], "startup", "plugin")}

      ${renderSection("Story Engine Errors", sections.story_errors || [], "story", "errors")}
      ${renderSection("Story Engine Warnings", sections.story_warnings || [], "story", "warnings")}
      ${renderSection("Story Engine Debug", sections.story_debug || [], "story", "debug")}
      ${renderSection("Story Engine Plugin / Info", sections.story_plugins || [], "story", "plugin")}

      ${
        document.querySelector("#ld-toggle-diagnostics")?.checked
          ? `
        <section class="ld-card ld-wide">
          <h2>Diagnostics</h2>
          ${kvHtml(debug)}

          <h3>Last Analyse Payload</h3>
          ${
            getLastAnalysePayload()
              ? `
              <div class="ld-debug-payload">
                <pre>${esc(JSON.stringify(getLastAnalysePayload(), null, 2))}</pre>
                <button id="ld-copy-payload" class="ld-clear-btn" type="button">Copy Payload</button>
              </div>
            `
              : `<div class="ld-empty">No payload sent yet.</div>`
          }
        </section>
      `
          : ""
      }
    </div>
  `;

  setAnalyseUiBusy(isAnalyseInFlight());
}