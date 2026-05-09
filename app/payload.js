import {
  currentSortMode,
  currentTextFilter,
  currentTimeFilter,
  timeFilterLabel,
  parseFilterTerms,
  matchesParsedTextFilter,
  getVisibleBlocks,
  applyTimeFilterToLines,
  applyTextFilterToLines,
  applyTextFilterToGrouped,
  groupLines 
} from "./filters.js";

import { getActiveSentryHandoff, getLastData } from "./state.js";

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
  const handoff = getActiveSentryHandoff();

  if (handoff && shouldUseSentrySnapshotFallback()) {
    console.log("[LD analyse] Using Sentry snapshot fallback");
    return buildSentrySnapshotFallbackPayload(handoff);
  }

  const payload = buildScopedPayload("current-view", null, "Main Analyse");

  if (!payload) return null;

  if (handoff && currentTextFilterMatchesHandoff(handoff)) {
    console.log("[LD analyse] Using normal current-view payload with Sentry origin");

    payload.origin = {
      from: handoff.from,
      type: handoff.type,
      createdAt: handoff.createdAt,
      mode: "sentry-handoff-current-match"
    };

    payload.sentrySnapshot = handoff.snapshot || null;
  } else {
    console.log("[LD analyse] Using normal current-view payload");
  }

  return payload;
}

export function clearAnalysePayloadRegistry() {
  _analysePayloads.clear();
}

function sentryHandoffSearchText(handoff) {
  return (
    handoff?.filter?.searchText ||
    handoff?.filter?.text ||
    handoff?.snapshot?.normalisedPattern ||
    ""
  ).trim();
}

function currentTextFilterMatchesHandoff(handoff) {
  const input = document.querySelector("#ld-text-filter");
  const current = (input?.value || "").trim();
  const expected = sentryHandoffSearchText(handoff);

  return !!expected && current === expected;
}

function rawSectionsContainHandoffMatch(rawSections, handoff) {
  if (!rawSections || !handoff) return false;

  const searchText = sentryHandoffSearchText(handoff);
  if (!searchText) return false;

  const parsed = parseFilterTerms(searchText);

  for (const lines of Object.values(rawSections)) {
    for (const line of lines || []) {
      if (matchesParsedTextFilter(line, parsed)) {
        return true;
      }
    }
  }

  return false;
}

export function buildSentrySnapshotFallbackPayload(handoff) {
  const snap = handoff.snapshot || {};

  return {
    source: "log-doctor",
    scope: "sentry-snapshot-fallback",
    label: "Sentry Snapshot Fallback",
    generatedAt: new Date().toISOString(),

    origin: {
      from: handoff.from,
      type: handoff.type,
      createdAt: handoff.createdAt
    },

    filters: {
      displayText: handoff.filter?.text || "",
      searchText: handoff.filter?.searchText || "",
      mode: handoff.filter?.mode || null,
      source: handoff.filter?.source || null,
      category: handoff.filter?.category || null
    },

    sentrySnapshot: {
      id: snap.id || null,
      scanId: snap.scanId || null,
      scanTimestamp: snap.scanTimestamp || null,
      source: snap.source || null,
      category: snap.category || null,
      patternKey: snap.patternKey || null,
      normalisedPattern: snap.normalisedPattern || "",
      count: snap.count || 0,
      firstSeen: snap.firstSeen || null,
      lastSeen: snap.lastSeen || null,
      sample: snap.sample || ""
    },

    warning:
      "No matching lines were found in the current Log Doctor report for this Sentry handoff. Analyse this as historical Sentry snapshot evidence. Current logs may have rotated, changed, or fallen outside the active analysis window.",

    analysisInstructions: [
      "Explain what the historical Sentry event likely represented.",
      "Do not treat absence of current matches as proof that no issue ever existed.",
      "Consider whether the absence of recurrence may suggest the issue was transient or resolved.",
      "Recommend whether monitoring or further investigation is sensible."
    ]
  };
}

export function shouldUseSentrySnapshotFallback() {
  const handoff = getActiveSentryHandoff();
  if (!handoff) return false;

  if (!currentTextFilterMatchesHandoff(handoff)) {
    return false;
  }

  const data = getLastData();
  const rawSections = data?.raw_sections || {};

  return !rawSectionsContainHandoffMatch(rawSections, handoff);
}