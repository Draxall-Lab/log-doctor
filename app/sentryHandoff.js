import { setActiveSentryHandoff } from "./state.js";

const SENTRY_HANDOFF_KEY = "sapphire-sentry:log-doctor-handoff";

function readSentryHandoff() {
  try {
    const raw = sessionStorage.getItem(SENTRY_HANDOFF_KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw);

    if (
      payload?.version !== "1.0" ||
      payload?.from !== "sapphire-sentry" ||
      payload?.type !== "log-doctor-handoff"
    ) {
      return null;
    }

    return payload;
  } catch (err) {
    console.warn("[Log Doctor] Failed to read Sentry handoff", err);
    return null;
  }
}

function setChecked(container, selector, checked) {
  const el = container.querySelector(selector);
  if (el) el.checked = checked;
}

export function handleSentryHandoff(container) {
  const handoff = readSentryHandoff();
  if (!handoff) return false;

  console.log("[Log Doctor] Received Sentry handoff", handoff);

  const filterText =
    handoff.filter?.searchText ||
    handoff.filter?.text ||
    handoff.snapshot?.normalisedPattern ||
    "";

  setActiveSentryHandoff(handoff);

  console.log("[Log Doctor] Applying Sentry filter", {
    displayText: handoff.filter?.text,
    searchText: handoff.filter?.searchText,
    appliedText: filterText,
    mode: handoff.filter?.mode
  });

  const textFilter = container.querySelector("#ld-text-filter");

  if (textFilter) {
    textFilter.value = filterText;
    textFilter.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const source = handoff.filter?.source;
  const category = handoff.filter?.category;

  if (source) {
    setChecked(container, `#ld-source-${source}`, true);
  }

  if (category) {
    setChecked(container, `#ld-type-${category}`, true);
  }

  sessionStorage.removeItem(SENTRY_HANDOFF_KEY);

  return true;
}