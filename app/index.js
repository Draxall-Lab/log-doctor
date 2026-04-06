let _container = null;
let _lastData = null;
let _analysePayloads = new Map();
let _analyseSeq = 0;
let _analyseInFlight = false;
let _analyseCooldownUntil = 0;
let _lastAnalysePayload = null;

function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escAttr(text) {
  return esc(text).replaceAll('"', "&quot;");
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

function currentTextFilter() {
  const el = document.querySelector("#ld-text-filter");
  return el ? String(el.value || "").trim() : "";
}

function parseFilterTerms(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map(part => part.trim().toLowerCase())
    .filter(Boolean);
}

function categoryClass(category) {
  const c = String(category || "").toLowerCase();
  if (c === "error") return "ld-tag-error";
  if (c === "warning") return "ld-tag-warning";
  return "ld-tag-plugin";
}

function registerAnalysePayload(payload) {
  const id = `ldp-${++_analyseSeq}`;
  _analysePayloads.set(id, payload);
  return id;
}

function isAnalyseCoolingDown() {
  return Date.now() < _analyseCooldownUntil;
}

function setAnalyseUiBusy(isBusy) {
  const busy = isBusy || isAnalyseCoolingDown();
  _analyseInFlight = isBusy;

  const mainBtn = document.querySelector("#ld-analyse-chat");
  if (mainBtn) {
    mainBtn.disabled = busy;
    mainBtn.textContent = busy ? "Analysing..." : "Analyse in Chat";
  }

  document.querySelectorAll("[data-ld-analyse-id]").forEach(btn => {
    btn.disabled = busy;
    btn.textContent = busy ? "⏳" : "🧠";
    btn.classList.toggle("ld-busy", busy);
  });
}

function startAnalyseCooldown(ms = 8000) {
  _analyseCooldownUntil = Date.now() + ms;
  setAnalyseUiBusy(true);

  clearTimeout(startAnalyseCooldown._timer);
  startAnalyseCooldown._timer = setTimeout(() => {
    _analyseCooldownUntil = 0;
    setAnalyseUiBusy(false);
    showToastSafe("Analysis ready again.", "success");
  }, ms);
}

function groupLines(lines) {
  if (!lines || !lines.length) return [];

  const map = new Map();

  for (const line of lines) {
    const rawText = String(line.text || "");
    const normalised = normaliseMessage(rawText);
    const ts = extractTimestamp(rawText);
    const category = String(line.category || "plugin").toLowerCase();
    const source = String(line.source || "unknown").toLowerCase();

    const key = `${source}::${category}::${normalised}`;

    if (!map.has(key)) {
      map.set(key, {
        source,
        category,
        message: normalised,
        count: 1,
        firstSeen: ts,
        lastSeen: ts,
        example: rawText
      });
    } else {
      const entry = map.get(key);
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

function matchesTerms(item, terms) {
  if (!terms.length) return true;

  const haystack = [
    item.source,
    item.category,
    item.message,
    item.example
  ].join(" ").toLowerCase();

  return terms.some(term => haystack.includes(term));
}

function applyTextFilterToGrouped(grouped) {
  const terms = parseFilterTerms(currentTextFilter());
  if (!terms.length) return grouped;
  return grouped.filter(item => matchesTerms(item, terms));
}

function applyTextFilterToLines(lines) {
  const terms = parseFilterTerms(currentTextFilter());
  if (!terms.length) return lines || [];

  return (lines || []).filter(line => {
    const haystack = [
      String(line.source || ""),
      String(line.category || ""),
      normaliseMessage(String(line.text || "")),
      String(line.text || "")
    ].join(" ").toLowerCase();

    return terms.some(term => haystack.includes(term));
  });
}

function kvHtml(obj) {
  if (!obj) return "<div class='ld-empty'>None</div>";
  return Object.entries(obj).map(([k, v]) => {
    return `<div class="ld-kv"><span class="ld-key">${esc(k)}</span><span class="ld-val">${esc(v)}</span></div>`;
  }).join("");
}

function analyseButtonHtml(payload, title = "Analyse this in chat", extraClass = "") {
  const payloadId = registerAnalysePayload(payload);
  return `
    <button
      class="ld-icon-btn ${extraClass}".trim()
      data-ld-analyse-id="${escAttr(payloadId)}"
      title="${escAttr(title)}"
      aria-label="${escAttr(title)}"
      type="button"
      ${(_analyseInFlight || isAnalyseCoolingDown()) ? "disabled" : ""}
    >${(_analyseInFlight || isAnalyseCoolingDown()) ? "⏳" : "🧠"}</button>
  `;
}

function activeFilterState() {
  return {
    sources: {
      sapphire: !!document.querySelector("#ld-source-sapphire")?.checked,
      kokoro: !!document.querySelector("#ld-source-kokoro")?.checked,
      startup: !!document.querySelector("#ld-source-startup")?.checked,
      story: !!document.querySelector("#ld-source-story")?.checked
    },
    types: {
      errors: !!document.querySelector("#ld-type-errors")?.checked,
      warnings: !!document.querySelector("#ld-type-warnings")?.checked,
      plugin: !!document.querySelector("#ld-type-plugin")?.checked,
      debug: !!document.querySelector("#ld-type-debug")?.checked
    },
    sort: currentSortMode(),
    text_filter: currentTextFilter(),
    text_terms: parseFilterTerms(currentTextFilter())
  };
}

function buildIssuePayload(item, label = "Issue") {
  return {
    source: "log-doctor",
    scope: "single-issue",
    label,
    generated_at: new Date().toISOString(),
    filters: activeFilterState(),
    summary: _lastData?.summary || {},
    issue_count: 1,
    total_grouped_issues: 1,
    truncated: false,
    issues: [{
      source: item.source,
      category: item.category,
      message: item.message,
      count: item.count,
      first_seen: item.firstSeen,
      last_seen: item.lastSeen,
      sample: item.example
    }]
  };
}

function sectionVisible(source, type) {
  const sourceBox = document.querySelector(`#ld-source-${source}`);
  const typeBox = document.querySelector(`#ld-type-${type}`);
  const sourceOn = sourceBox ? sourceBox.checked : true;
  const typeOn = typeBox ? typeBox.checked : true;
  return sourceOn && typeOn;
}

function getVisibleBlocks(sections) {
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

  return visibleBlocks;
}

function buildScopedPayload(scope = "current-view", lines = null, label = "") {
  if (!_lastData) return null;

  const sections = _lastData.sections || {};
  const baseLines = lines || getVisibleBlocks(sections);
  const grouped = applyTextFilterToGrouped(groupLines(baseLines));

  let selected;

  if (scope === "top-issues") {
    selected = grouped.slice(0, 5);
  } else if (scope === "section-view") {
    selected = grouped.slice(0, 6);
  } else {
    selected = grouped.slice(0, 8);
  }

  return {
    source: "log-doctor",
    scope,
    label,
    generated_at: new Date().toISOString(),
    filters: activeFilterState(),
    summary: _lastData.summary || {},
    issue_count: selected.length,
    total_grouped_issues: grouped.length,
    truncated: grouped.length > selected.length,
    issues: selected.map(item => ({
      source: item.source,
      category: item.category,
      message: item.message,
      count: item.count,
      first_seen: item.firstSeen,
      last_seen: item.lastSeen,
      sample: item.example
    }))
  };
}

function groupedLinesHtml(lines, context = {}) {
  const grouped = applyTextFilterToGrouped(groupLines(lines));
  if (!grouped.length) return "<div class='ld-empty'>None</div>";

  return grouped.map(item => {
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
  }).join("");
}

function renderSection(title, lines, source, type) {
  if (!sectionVisible(source, type)) return "";

  const filteredLines = applyTextFilterToLines(lines);
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
  const grouped = applyTextFilterToGrouped(groupLines(visible)).slice(0, 8);
  const panelPayload = buildScopedPayload("top-issues", visible, "Top Issues");

  return `
    <section class="ld-card ld-wide">
      <div class="ld-section-head">
        <h2>Top Issues</h2>
        ${analyseButtonHtml(panelPayload, "Analyse top issues in chat")}
      </div>
      ${grouped.length ? grouped.map(item => {
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
      }).join("") : "<div class='ld-empty'>None</div>"}
    </section>
  `;
}

function buildAnalysePayload() {
  return buildScopedPayload("current-view", null, "Main Analyse");
}

function showToastSafe(message, type = "info") {
  console.log(`[Log Doctor][${type}] ${message}`);

  const status = document.querySelector("#ld-status");
  if (status) {
    status.textContent = message;
    status.dataset.state = type;

    clearTimeout(showToastSafe._statusTimer);
    showToastSafe._statusTimer = setTimeout(() => {
      status.textContent = "Ready";
      delete status.dataset.state;
    }, 3500);
  }

  let container = document.querySelector("#ld-toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "ld-toast-container";
    document.body.appendChild(container);
  }

  clearTimeout(showToastSafe._toastTimer);
  clearTimeout(showToastSafe._toastRemoveTimer);
  container.innerHTML = "";

  const toast = document.createElement("div");
  toast.className = `ld-toast ld-toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  showToastSafe._toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    showToastSafe._toastRemoveTimer = setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 250);
  }, 3000);
}

async function sendMessageToChat(text) {
  const doc = window.top?.document || window.parent?.document || document;

  const input =
    doc.querySelector("textarea") ||
    doc.querySelector("input[type='text']");

  if (!input) {
    throw new Error("Chat input not found");
  }

  input.focus();
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));

  const btn =
    doc.querySelector("button[type='submit']") ||
    Array.from(doc.querySelectorAll("button")).find(
      b =>
        /send/i.test((b.textContent || "").trim()) ||
        b.getAttribute("aria-label")?.match(/send/i)
    );

  if (btn) {
    btn.click();
    return;
  }

  throw new Error("Could not trigger chat send");
}

async function postAnalysePayload(payload) {
  const res = await fetch("/api/plugin/log-doctor/analyse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content || ""
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

async function analyseInChat() {
  const payload = buildAnalysePayload();
  _lastAnalysePayload = payload;
  rerenderFromCache();

  if (!payload) {
    showToastSafe("Nothing to analyse yet. Refresh the report first.", "warning");
    return;
  }

  if (_analyseInFlight || isAnalyseCoolingDown()) {
    showToastSafe("Analysis temporarily throttled. Try again in a few seconds.", "warning");
    return;
  }

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
  _lastAnalysePayload = payload;
  rerenderFromCache();

  if (!payload) {
    showToastSafe("Nothing to analyse for that scope.", "warning");
    return;
  }

  if (_analyseInFlight || isAnalyseCoolingDown()) {
    showToastSafe("Analysis temporarily throttled. Try again in a few seconds.", "warning");
    return;
  }

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
  _analysePayloads.clear();

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

          <h3>Last Analyse Payload</h3>
          ${
            _lastAnalysePayload
              ? `
                <div class="ld-debug-payload">
                  <pre>${esc(JSON.stringify(_lastAnalysePayload, null, 2))}</pre>
                  <button id="ld-copy-payload" class="ld-clear-btn" type="button">Copy Payload</button>
                </div>
              `
              : `<div class="ld-empty">No payload sent yet.</div>`
      }
    </section>
  ` : ""}
    </div>
  `;

  setAnalyseUiBusy(_analyseInFlight);
}

function rerenderFromCache() {
  if (_lastData) renderReport(_lastData);
}

function wireDynamicActions(container) {
  container.addEventListener("click", (ev) => {
    const copyBtn = ev.target.closest("#ld-copy-payload");
    if (copyBtn) {
      if (_lastAnalysePayload) {
        navigator.clipboard.writeText(JSON.stringify(_lastAnalysePayload, null, 2));
        showToastSafe("Payload copied to clipboard.", "success");
     }
  return;
}
    
    const clearBtn = ev.target.closest("#ld-text-filter-clear");
    if (clearBtn) {
      const input = container.querySelector("#ld-text-filter");
      if (input) {
        input.value = "";
        input.focus();
        loadReport();
      }
      return;
    }

    const analyseBtn = ev.target.closest("[data-ld-analyse-id]");
    if (analyseBtn) {
      if (_analyseInFlight || isAnalyseCoolingDown()) {
        showToastSafe("Analysis temporarily throttled. Try again in a few seconds.", "warning");
        return;
      }

      const payloadId = analyseBtn.getAttribute("data-ld-analyse-id");
      const payload = payloadId ? _analysePayloads.get(payloadId) : null;

      if (!payload) {
        showToastSafe("Could not read analysis payload.", "error");
        return;
      }

      analyseCustomPayload(payload);
    }
  });
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

      --ld-hot-surface: color-mix(in srgb, var(--ld-status-warning) 6%, var(--ld-surface));
      --ld-hot-border: color-mix(in srgb, var(--ld-status-warning) 45%, var(--ld-border-subtle));
      --ld-shadow-elevated: 0 6px 18px rgba(0, 0, 0, 0.16);
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

export function render(container) {
  _container = container;
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
              title="Comma-separated keywords"
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
    "#ld-sort-mode"
  ].forEach(sel => {
    container.querySelector(sel)?.addEventListener("change", rerenderFromCache);
  });

  const textFilter = container.querySelector("#ld-text-filter");
  textFilter?.addEventListener("input", rerenderFromCache);
  textFilter?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      loadReport();
    }
  });

  wireDynamicActions(container);
  loadReport();
}

export function cleanup() {
  _container = null;
  _lastData = null;
  _analysePayloads.clear();
  _analyseInFlight = false;
  _analyseCooldownUntil = 0;
}