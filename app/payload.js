import {
  currentSortMode,
  currentTextFilter,
  currentTimeFilter,
  timeFilterLabel,
  parseFilterTerms,
  getVisibleBlocks,
  applyTimeFilterToLines,
  applyTextFilterToLines,
  applyTextFilterToGrouped,
  groupLines 
} from "./filters.js";

import { getLastData } from "./state.js";

let _analysePayloads = new Map();
let _analyseSeq = 0;

function buildScopedSummary(lines, baseSummary = {}) {
  const counts = { error: 0, warning: 0, debug: 0, plugin: 0 };

  for (const line of lines || []) {
    const category = line?.category;
    if (category === "error") counts.error++;
    else if (category === "warning") counts.warning++;
    else if (category === "debug") counts.debug++;
    else if (category === "plugin") counts.plugin++;
  }

  const parts = [];
  if (counts.error) parts.push(`${counts.error} error(s)`);
  if (counts.warning) parts.push(`${counts.warning} warning(s)`);
  if (counts.debug) parts.push(`${counts.debug} debug line(s)`);
  if (counts.plugin) parts.push(`${counts.plugin} plugin line(s)`);

  return {
    ...baseSummary,
    overall_summary: parts.length ? parts.join(", ") : "No relevant lines found"
  };
}

export function registerAnalysePayload(payload) {
  const id = `ldp-${++_analyseSeq}`;
  _analysePayloads.set(id, payload);

  return id;
}

export function getAnalysePayloadById(id) {
  const payload = _analysePayloads.get(id);

  return payload;
}

export function clearAnalysePayloads() {
  _analysePayloads.clear();
}

export function activeFilterState() {
  const rawText = currentTextFilter();
  const parsedText = parseFilterTerms(rawText);
  const timePreset = currentTimeFilter();

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
    text_filter: rawText,
    text_terms: parsedText,
    time_filter: {
      mode: timePreset === "all" ? "all" : "relative",
      preset: timePreset,
      label: timeFilterLabel(timePreset),
      anchor_inheritance: true
    }
  };
}

export function buildScopedPayload(scope = "current-view", lines = null, label = "") {
  const data = getLastData();

  if (!data) return null;

  const sections = data.sections || {};
  const rawBaseLines = lines || getVisibleBlocks(sections);

  const timeScopedLines = applyTimeFilterToLines(rawBaseLines, currentTimeFilter());
  const visibleLines = applyTextFilterToLines(timeScopedLines);
  const grouped = applyTextFilterToGrouped(groupLines(visibleLines));

  let selected;

  if (scope === "top-issues") {
    selected = grouped.slice(0, 5);
  } else if (scope === "section-view") {
    selected = grouped.slice(0, 6);
  } else {
    selected = grouped.slice(0, 8);
  }

  const scopedSummary = buildScopedSummary(visibleLines, data.summary || {});

  return {
    source: "log-doctor",
    scope,
    label,
    generated_at: new Date().toISOString(),
    filters: activeFilterState(),
    summary: scopedSummary,
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

function inferCategory(rawText = "", fallback = "plugin") {
  const text = String(rawText || "");
  const current = String(fallback || "").toLowerCase();

  // Strong fallback (already classified properly)
  if (current === "error" || current === "warning" || current === "debug") {
    return current;
  }

  // Re-evaluate if fallback is weak (plugin/unknown)
  if (/\bERROR\b/i.test(text)) return "error";
  if (/\bWARNING\b/i.test(text)) return "warning";
  if (/\bDEBUG\b/i.test(text)) return "debug";

  return "plugin";
}

export function buildIssuePayload(item, label = "Issue") {
  const data = getLastData();
  const rawText = String(item?.example || item?.message || "");
  const category = inferCategory(rawText, item?.category);

  return {
    source: "log-doctor",
    scope: "single-issue",
    label,
    generated_at: new Date().toISOString(),
    filters: activeFilterState(),
    summary: data?.summary || {},
    issue_count: 1,
    total_grouped_issues: 1,
    truncated: false,
    issues: [{
      source: item.source,
      category,
      message: item.message,
      count: item.count,
      first_seen: item.firstSeen,
      last_seen: item.lastSeen,
      sample: item.example
    }]
  };
}

export function buildAnalysePayload() {
  return buildScopedPayload("current-view", null, "Main Analyse");
}

export function clearAnalysePayloadRegistry() {
  _analysePayloads.clear();
}