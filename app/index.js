let _container = null;
let _lastData = null;

function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normaliseMessage(text) {
  const s = String(text || "");
  return s.replace(
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+-\s+.*?\s+-\s+(INFO|WARNING|ERROR|DEBUG)\s+-\s+/,
    ""
  );
}

function extractTimestamp(text) {
  const s = String(text || "");
  const match = s.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)/);
  return match ? match[1] : "";
}

function currentSortMode() {
  const el = document.querySelector("#ld-sort-mode");
  return el ? el.value : "frequency";
}

function categoryClass(category) {
  const c = String(category || "").toLowerCase();
  if (c === "error") return "ld-tag-error";
  if (c === "warning") return "ld-tag-warning";
  return "ld-tag-plugin";
}

function groupLines(lines) {
  if (!lines || !lines.length) return [];

  const map = new Map();

  for (const line of lines) {
    const rawText = String(line.text || "");
    const normalised = normaliseMessage(rawText);
    const ts = extractTimestamp(rawText);
    const category = String(line.category || "plugin").toLowerCase();

    if (!map.has(normalised)) {
      map.set(normalised, {
        category,
        message: normalised,
        count: 1,
        firstSeen: ts,
        lastSeen: ts,
        example: rawText
      });
    } else {
      const entry = map.get(normalised);
      entry.count += 1;

      if (ts && (!entry.firstSeen || ts < entry.firstSeen)) entry.firstSeen = ts;
      if (ts && (!entry.lastSeen || ts > entry.lastSeen)) entry.lastSeen = ts;
    }
  }

  const grouped = Array.from(map.values());

  if (currentSortMode() === "recency") {
    grouped.sort((a, b) => String(b.lastSeen || "").localeCompare(String(a.lastSeen || "")));
  } else {
    grouped.sort((a, b) => {
      if ((b.count || 0) !== (a.count || 0)) return (b.count || 0) - (a.count || 0);
      return String(b.lastSeen || "").localeCompare(String(a.lastSeen || ""));
    });
  }

  return grouped;
}

function kvHtml(obj) {
  if (!obj) return "<div class='ld-empty'>None</div>";
  return Object.entries(obj).map(([k, v]) => {
    return `<div class="ld-kv"><span class="ld-key">${esc(k)}</span><span class="ld-val">${esc(v)}</span></div>`;
  }).join("");
}

function groupedLinesHtml(lines) {
  const grouped = groupLines(lines);
  if (!grouped.length) return "<div class='ld-empty'>None</div>";

  return grouped.map(item => {
    const cls = categoryClass(item.category);
    const tag = esc(String(item.category || "plugin").toUpperCase());
    const hotClass = item.count >= 5 ? " ld-hot" : "";

    return `
      <div class="ld-line${hotClass}">
        <div class="ld-line-head">
          <span class="ld-tag ${cls}">[${tag}]</span>
          <span class="ld-count">×${esc(item.count)}</span>
          ${item.firstSeen ? `<span class="ld-time">first: ${esc(item.firstSeen)}</span>` : ""}
          ${item.lastSeen ? `<span class="ld-time">last: ${esc(item.lastSeen)}</span>` : ""}
          ${item.count >= 5 ? `<span class="ld-hot-badge">HOT</span>` : ""}
        </div>
        <div class="ld-line-body">${esc(item.message)}</div>
      </div>
    `;
  }).join("");
}

function sectionVisible(source, type) {
  const sourceBox = document.querySelector(`#ld-source-${source}`);
  const typeBox = document.querySelector(`#ld-type-${type}`);
  const sourceOn = sourceBox ? sourceBox.checked : true;
  const typeOn = typeBox ? typeBox.checked : true;
  return sourceOn && typeOn;
}

function renderSection(title, lines, source, type) {
  if (!sectionVisible(source, type)) return "";
  return `
    <section class="ld-card ld-wide">
      <h2>${esc(title)}</h2>
      ${groupedLinesHtml(lines)}
    </section>
  `;
}

function renderTopIssues(sections) {
  const visibleBlocks = [];

  if (sectionVisible("sapphire", "warnings")) visibleBlocks.push(...(sections.sapphire_warnings || []));
  if (sectionVisible("sapphire", "errors")) visibleBlocks.push(...(sections.sapphire_errors || []));
  if (sectionVisible("sapphire", "plugin")) visibleBlocks.push(...(sections.sapphire_plugins || []));

  if (sectionVisible("kokoro", "warnings")) visibleBlocks.push(...(sections.kokoro_warnings || []));
  if (sectionVisible("kokoro", "errors")) visibleBlocks.push(...(sections.kokoro_errors || []));
  if (sectionVisible("kokoro", "plugin")) visibleBlocks.push(...(sections.kokoro_plugins || []));

  if (sectionVisible("startup", "warnings")) visibleBlocks.push(...(sections.startup_warnings || []));
  if (sectionVisible("startup", "errors")) visibleBlocks.push(...(sections.startup_errors || []));
  if (sectionVisible("startup", "plugin")) visibleBlocks.push(...(sections.startup_plugins || []));

  if (sectionVisible("story", "warnings")) visibleBlocks.push(...(sections.story_warnings || []));
  if (sectionVisible("story", "errors")) visibleBlocks.push(...(sections.story_errors || []));
  if (sectionVisible("story", "plugin")) visibleBlocks.push(...(sections.story_plugins || []));

  const grouped = groupLines(visibleBlocks).slice(0, 8);

  return `
    <section class="ld-card ld-wide">
      <h2>Top Issues</h2>
      ${grouped.length ? grouped.map(item => {
        const cls = categoryClass(item.category);
        const tag = esc(String(item.category || "plugin").toUpperCase());
        const hotClass = item.count >= 5 ? " ld-hot" : "";
        return `
          <div class="ld-line${hotClass}">
            <div class="ld-line-head">
              <span class="ld-tag ${cls}">[${tag}]</span>
              <span class="ld-count">×${esc(item.count)}</span>
              ${item.lastSeen ? `<span class="ld-time">last: ${esc(item.lastSeen)}</span>` : ""}
              ${item.count >= 5 ? `<span class="ld-hot-badge">HOT</span>` : ""}
            </div>
            <div class="ld-line-body">${esc(item.message)}</div>
          </div>
        `;
      }).join("") : "<div class='ld-empty'>None</div>"}
    </section>
  `;
}

async function loadReport() {
  const maxLines = Number(document.querySelector("#ld-max-lines")?.value || 5000);
  const status = document.querySelector("#ld-status");
  const output = document.querySelector("#ld-output");

  status.textContent = "Refreshing...";
  output.innerHTML = "";

  try {
    const res = await fetch("/api/plugin/log-doctor/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content || ""
      },
      body: JSON.stringify({
        max_lines: maxLines,
        max_results: 50
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    _lastData = data;
    renderReport(data);
    status.textContent = "Refreshed";
  } catch (err) {
    output.innerHTML = `<div class="ld-error">Failed to load report: ${esc(err.message)}</div>`;
    status.textContent = "Failed";
  }
}

function renderReport(data) {
  const output = document.querySelector("#ld-output");
  const summary = data.summary || {};
  const counts = data.counts_by_source || {};
  const sections = data.sections || {};
  const debug = data.debug || {};

  output.innerHTML = `
    <div class="ld-grid">
      <section class="ld-card">
        <h2>Summary</h2>
        ${kvHtml(summary)}
      </section>

      <section class="ld-card">
        <h2>Counts by Source</h2>
        <h3>Sapphire</h3>
        ${kvHtml(counts.sapphire || {})}
        <h3>Kokoro</h3>
        ${kvHtml(counts.kokoro || {})}
        <h3>Startup</h3>
        ${kvHtml(counts.startup || {})}
        <h3>Story</h3>
        ${kvHtml(counts.story || {})}
      </section>

      ${renderTopIssues(sections)}

      ${renderSection("Sapphire Warnings", sections.sapphire_warnings || [], "sapphire", "warnings")}
      ${renderSection("Sapphire Errors", sections.sapphire_errors || [], "sapphire", "errors")}
      ${renderSection("Sapphire Plugin / Info", sections.sapphire_plugins || [], "sapphire", "plugin")}

      ${renderSection("Kokoro Warnings", sections.kokoro_warnings || [], "kokoro", "warnings")}
      ${renderSection("Kokoro Errors", sections.kokoro_errors || [], "kokoro", "errors")}
      ${renderSection("Kokoro Plugin / Info", sections.kokoro_plugins || [], "kokoro", "plugin")}

      ${renderSection("Startup Warnings", sections.startup_warnings || [], "startup", "warnings")}
      ${renderSection("Startup Errors", sections.startup_errors || [], "startup", "errors")}
      ${renderSection("Startup Plugin / Info", sections.startup_plugins || [], "startup", "plugin")}

      ${renderSection("Story Engine Warnings", sections.story_warnings || [], "story", "warnings")}
      ${renderSection("Story Engine Errors", sections.story_errors || [], "story", "errors")}
      ${renderSection("Story Engine Plugin / Info", sections.story_plugins || [], "story", "plugin")}

      ${document.querySelector("#ld-type-debug")?.checked ? `
        <section class="ld-card ld-wide">
          <h2>Debug</h2>
          ${kvHtml(debug)}
        </section>
      ` : ""}
    </div>
  `;
}

function rerenderFromCache() {
  if (_lastData) renderReport(_lastData);
}

function injectStyles() {
  if (document.getElementById("log-doctor-app-styles")) return;

  const style = document.createElement("style");
  style.id = "log-doctor-app-styles";
  style.textContent = `
    .ld-shell { padding: 16px; color: var(--text); }
    .ld-toolbar {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .ld-toolbar input, .ld-toolbar button, .ld-toolbar select {
      background: var(--bg-secondary);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
    }
    .ld-toolbar button { cursor: pointer; }

    .ld-filters {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      padding: 10px 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    .ld-filter-group {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .ld-filter-group strong {
      color: var(--text-muted);
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

    .ld-status { color: var(--text-muted); }

    .ld-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .ld-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
    }

    .ld-wide { grid-column: 1 / -1; }
    .ld-card h2, .ld-card h3 { margin-top: 0; }

    .ld-kv {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 8px;
      padding: 4px 0;
      border-bottom: 1px solid var(--border);
    }

    .ld-key { color: var(--text-muted); }

    .ld-line {
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }

    .ld-hot {
      background: rgba(240, 184, 75, 0.06);
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
      color: #ff6b6b;
    }

    .ld-tag-warning {
      color: #f0b84b;
    }

    .ld-tag-plugin {
      color: #58c472;
    }

    .ld-count {
      color: var(--trim);
      font-weight: 700;
    }

    .ld-time {
      color: var(--text-muted);
      font-size: 11px;
    }

    .ld-hot-badge {
      color: #f0b84b;
      border: 1px solid #f0b84b;
      border-radius: 999px;
      padding: 1px 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .ld-empty { color: var(--text-muted); }
    .ld-error { color: var(--error); }

    @media (max-width: 900px) {
      .ld-grid { grid-template-columns: 1fr; }
      .ld-kv { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}

export function render(container) {
  _container = container;
  injectStyles();

  container.innerHTML = `
    <div class="ld-shell">
      <div class="ld-toolbar">
        <label>Max lines <input id="ld-max-lines" type="number" value="5000" min="100" max="20000" step="100"></label>
        <button id="ld-refresh">Refresh</button>
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
          <strong>Source</strong>
          <label><input id="ld-source-sapphire" type="checkbox" checked> Sapphire</label>
          <label><input id="ld-source-kokoro" type="checkbox" checked> Kokoro</label>
          <label><input id="ld-source-startup" type="checkbox" checked> Startup</label>
          <label><input id="ld-source-story" type="checkbox" checked> Story</label>
        </div>

        <div class="ld-filter-group">
          <strong>Type</strong>
          <label><input id="ld-type-errors" type="checkbox" checked> Errors</label>
          <label><input id="ld-type-warnings" type="checkbox" checked> Warnings</label>
          <label><input id="ld-type-plugin" type="checkbox" checked> Plugin / Info</label>
          <label><input id="ld-type-debug" type="checkbox" checked> Debug</label>
        </div>
      </div>

      <div id="ld-output"></div>
    </div>
  `;

  container.querySelector("#ld-refresh")?.addEventListener("click", loadReport);

  [
    "#ld-source-sapphire",
    "#ld-source-kokoro",
    "#ld-source-startup",
    "#ld-source-story",
    "#ld-type-errors",
    "#ld-type-warnings",
    "#ld-type-plugin",
    "#ld-type-debug",
    "#ld-sort-mode"
  ].forEach(sel => {
    container.querySelector(sel)?.addEventListener("change", rerenderFromCache);
  });

  loadReport();
}

export function cleanup() {
  _container = null;
  _lastData = null;
}