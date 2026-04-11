let activeTimeFilter = {
  mode: "relative",
  preset: "all"
};

export function setTimeFilter(filter) {
  if (!filter || typeof filter !== "object") {
    activeTimeFilter = { mode: "relative", preset: "all" };
    return;
  }

  if (filter.mode === "absolute") {
    activeTimeFilter = {
      mode: "absolute",
      from: filter.from || null,
      to: filter.to || null
    };
    return;
  }

  activeTimeFilter = {
    mode: "relative",
    preset: filter.preset || "all"
  };
}

export function syncTimeFilterControl(container = document) {
  const el = container.querySelector("#ld-time-filter");
  if (!el) return;

  el.value = activeTimeFilter.mode === "absolute"
    ? "custom"
    : (activeTimeFilter.preset || "all");
}

export function currentTextFilter() {
  const el = document.querySelector("#ld-text-filter");
  return el ? String(el.value || "").trim() : "";
}

export function parseFilterTerms(text) {
  const raw = String(text || "").toLowerCase().trim();

  const parsed = {
    raw,
    include_all: [],
    include_any: [],
    exclude: []
  };

  if (!raw) return parsed;

  const normalised = raw
    .replace(/\s*\+\s*/g, "+")
    .replace(/\s*,\s*/g, ",")
    .trim();

  const tokens = normalised.split(/[,\s]+/).filter(Boolean);

  for (const token of tokens) {
    if (token.startsWith("-") || token.startsWith("!")) {
      const cleaned = token.slice(1).trim();
      if (cleaned) parsed.exclude.push(cleaned);
      continue;
    }

    if (token.includes("+")) {
      const parts = token.split("+").map(x => x.trim()).filter(Boolean);
      parsed.include_all.push(...parts);
      continue;
    }

    parsed.include_any.push(token);
  }

  parsed.include_all = [...new Set(parsed.include_all)];
  parsed.include_any = [...new Set(parsed.include_any)];
  parsed.exclude = [...new Set(parsed.exclude)];

  return parsed;
}

function groupedItemSearchText(item) {
  return [
    item.source,
    item.category,
    item.message,
    item.example,
    item.sample
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesParsedTextFilter(item, parsed) {
  if (!parsed) return true;

  const haystack = groupedItemSearchText(item);

  if (parsed.exclude.length > 0) {
    if (parsed.exclude.some(term => haystack.includes(term))) {
      return false;
    }
  }

  if (parsed.include_all.length > 0) {
    if (!parsed.include_all.every(term => haystack.includes(term))) {
      return false;
    }
  }

  if (parsed.include_any.length > 0) {
    if (!parsed.include_any.some(term => haystack.includes(term))) {
      return false;
    }
  }

  // If only excludes are present, and none matched, it passes
  return true;
}

function extractTimestamp(text) {
  const s = String(text || "");
  const match = s.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)/);
  return match ? match[1] : "";
}

export function currentSortMode() {
  const el = document.querySelector("#ld-sort-mode");
  return el ? el.value : "frequency";
}

export function groupLines(lines) {
  if (!lines || !lines.length) return [];

  const map = new Map();

  for (const line of lines) {
    const rawText = String(line.text || "");
    const normalised = normaliseMessage(rawText);
    const ts = extractTimestamp(rawText);
    const source = String(line.source || "unknown").toLowerCase();

    let category = String(line.category || "").toLowerCase();

    // Fallback categorisation only when upstream category is missing.
   // Backend category is the canonical source of truth and should not be overridden.
    if (!category) {
      if (/\bERROR\b/i.test(rawText)) {
        category = "error";
      } else if (/\bWARNING\b/i.test(rawText)) {
        category = "warning";
      } else if (/\bDEBUG\b/i.test(rawText)) {
        category = "debug";
      } else {
        category = "plugin";
      }
    }

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

  return Array.from(map.values());
}

export function applyTextFilterToGrouped(grouped) {
  const parsed = parseFilterTerms(currentTextFilter());

  const hasAnyFilter =
    parsed.include_all.length > 0 ||
    parsed.include_any.length > 0 ||
    parsed.exclude.length > 0;

  if (!hasAnyFilter) return grouped;

  return grouped.filter(item => matchesParsedTextFilter(item, parsed));
}

function normaliseMessage(text) {
  const s = String(text || "");
  return s.replace(
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+-\s+.*?\s+-\s+(INFO|WARNING|ERROR|DEBUG)\s+-\s+/,
    ""
  );
}

export function applyTextFilterToLines(lines) {
  const parsed = parseFilterTerms(currentTextFilter());

  const hasAnyFilter =
    parsed.include_all.length > 0 ||
    parsed.include_any.length > 0 ||
    parsed.exclude.length > 0;

  if (!hasAnyFilter) return lines || [];

  return (lines || []).filter(line => {
    const haystack = [
      String(line.source || ""),
      String(line.category || ""),
      normaliseMessage(String(line.text || "")),
      String(line.text || "")
    ].join(" ").toLowerCase();

    if (parsed.exclude.length > 0) {
      if (parsed.exclude.some(term => haystack.includes(term))) {
        return false;
      }
    }

    if (parsed.include_all.length > 0) {
      if (!parsed.include_all.every(term => haystack.includes(term))) {
        return false;
      }
    }

    if (parsed.include_any.length > 0) {
      if (!parsed.include_any.some(term => haystack.includes(term))) {
        return false;
      }
    }

    return true;
  });
}

export function sectionVisible(source, type) {
  const sourceBox = document.querySelector(`#ld-source-${source}`);

  // UI uses plural IDs (errors/warnings), internal uses singular (error/warning)
  const typeKeyMap = {
    error: "errors",
    warning: "warnings",
    debug: "debug",
    plugin: "plugin"
  };

  const mappedType = typeKeyMap[type] || type;

  const typeBox = document.querySelector(`#ld-type-${mappedType}`);

  const sourceOn = sourceBox ? sourceBox.checked : true;
  const typeOn = typeBox ? typeBox.checked : true;

  return sourceOn && typeOn;
}

export function getVisibleBlocks(sections) {
  const visibleBlocks = [];

  if (sectionVisible("sapphire", "warnings")) visibleBlocks.push(...(sections.sapphire_warnings || []));
  if (sectionVisible("sapphire", "errors")) visibleBlocks.push(...(sections.sapphire_errors || []));
  if (sectionVisible("sapphire", "debug")) visibleBlocks.push(...(sections.sapphire_debug || []));
  if (sectionVisible("sapphire", "plugin")) visibleBlocks.push(...(sections.sapphire_plugins || []));

  if (sectionVisible("kokoro", "warnings")) visibleBlocks.push(...(sections.kokoro_warnings || []));
  if (sectionVisible("kokoro", "errors")) visibleBlocks.push(...(sections.kokoro_errors || []));
  if (sectionVisible("kokoro", "debug")) visibleBlocks.push(...(sections.kokoro_debug || []));
  if (sectionVisible("kokoro", "plugin")) visibleBlocks.push(...(sections.kokoro_plugins || []));

  if (sectionVisible("startup", "warnings")) visibleBlocks.push(...(sections.startup_warnings || []));
  if (sectionVisible("startup", "errors")) visibleBlocks.push(...(sections.startup_errors || []));
  if (sectionVisible("startup", "debug")) visibleBlocks.push(...(sections.startup_debug || []));
  if (sectionVisible("startup", "plugin")) visibleBlocks.push(...(sections.startup_plugins || []));

  if (sectionVisible("story", "warnings")) visibleBlocks.push(...(sections.story_warnings || []));
  if (sectionVisible("story", "errors")) visibleBlocks.push(...(sections.story_errors || []));
  if (sectionVisible("story", "debug")) visibleBlocks.push(...(sections.story_debug || []));
  if (sectionVisible("story", "plugin")) visibleBlocks.push(...(sections.story_plugins || []));

  return visibleBlocks;
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

export function currentTimeFilter() {
  return activeTimeFilter;
}

function formatTimeFilterDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Invalid date";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function timeFilterLabel(value) {
  if (!value) return "All time";

  if (typeof value === "string") {
    switch (value) {
      case "15m": return "Last 15 minutes";
      case "1h": return "Last 1 hour";
      case "6h": return "Last 6 hours";
      case "24h": return "Last 24 hours";
      case "custom": return "Custom range";
      default: return "All time";
    }
  }

  if (value.mode === "relative") {
    switch (value.preset) {
      case "15m": return "Last 15 minutes";
      case "1h": return "Last 1 hour";
      case "6h": return "Last 6 hours";
      case "24h": return "Last 24 hours";
      default: return "All time";
    }
  }

  if (value.mode === "absolute") {
    return `${formatTimeFilterDateTime(value.from)} → ${formatTimeFilterDateTime(value.to)}`;
  }

  return "All time";
}

export function relativeWindowMs(value) {
  switch (value) {
    case "15m": return 15 * 60 * 1000;
    case "1h": return 60 * 60 * 1000;
    case "6h": return 6 * 60 * 60 * 1000;
    case "24h": return 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

export function applyTimeFilterToLines(lines, filter, now = Date.now()) {
  if (!Array.isArray(lines) || !lines.length) return Array.isArray(lines) ? lines : [];
  if (!filter) return lines;

  let fromMs = null;
  let toMs = null;

  if (typeof filter === "string") {
    if (filter === "all") return lines;
    const windowMs = relativeWindowMs(filter);
    if (!windowMs) return lines;
    fromMs = now - windowMs;
    toMs = now;
  } else if (filter.mode === "relative") {
    if (!filter.preset || filter.preset === "all") return lines;
    const windowMs = relativeWindowMs(filter.preset);
    if (!windowMs) return lines;
    fromMs = now - windowMs;
    toMs = now;
  } else if (filter.mode === "absolute") {
    fromMs = parseLogTimestamp(filter.from)?.getTime() ?? null;
    toMs = parseLogTimestamp(filter.to)?.getTime() ?? null;

    if (fromMs == null || toMs == null) return lines;
  } else {
    return lines;
  }

  const result = [];
  let anchorIncluded = false;

  for (const line of lines) {
    const rawText = typeof line === "string" ? line : (line?.text || "");
    const tsRaw = extractTimestamp(rawText);
    const ts = parseLogTimestamp(tsRaw);

    if (ts) {
      const time = ts.getTime();
      anchorIncluded = time >= fromMs && time <= toMs;
      if (anchorIncluded) result.push(line);
    } else if (anchorIncluded) {
      result.push(line);
    }
  }

  return result;
}

function parseLogTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;

  const text = String(value).trim();
  if (!text) return null;

  // Convert:
  // 2026-03-05 17:51:43,196
  // to:
  // 2026-03-05T17:51:43.196
  const normalised = text.replace(" ", "T").replace(",", ".");

  const dt = new Date(normalised);
  return Number.isFinite(dt.getTime()) ? dt : null;
}