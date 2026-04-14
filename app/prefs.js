const PREFS_KEY = "log-doctor-ui-prefs-v1";

export function getDefaultUiPrefs() {
  return {
    maxLines: 5000,
    sortMode: "frequency",
    textFilter: "",
    sources: {
      sapphire: true,
      kokoro: true,
      startup: true,
      story: true
    },
    types: {
      errors: true,
      warnings: true,
      plugin: true,
      debug: true
    },
    toggles: {
      diagnostics: true
    },
    timeFilter: {
      mode: "relative",
      preset: "all",
      from: "",
      to: ""
    },
    timeDisplay: {
      format12h: false
    }
  };
}

export function loadUiPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return getDefaultUiPrefs();

    const parsed = JSON.parse(raw);

    // 🔧 Migration: start/end → from/to
    if (parsed?.timeFilter) {
      if (parsed.timeFilter.start && !parsed.timeFilter.from) {
        parsed.timeFilter.from = parsed.timeFilter.start;
      }
      if (parsed.timeFilter.end && !parsed.timeFilter.to) {
        parsed.timeFilter.to = parsed.timeFilter.end;
      }
    }

    return {
      ...getDefaultUiPrefs(),
      ...parsed,
      // optional but safer: deep merge timeFilter
      timeFilter: {
        ...getDefaultUiPrefs().timeFilter,
        ...(parsed.timeFilter || {})
      }
    };

  } catch {
    return getDefaultUiPrefs();
  }
}

export function saveUiPrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function clearUiPrefs() {
  localStorage.removeItem(PREFS_KEY);
}