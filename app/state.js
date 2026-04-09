import { showToastSafe } from "./debug.js";

let _container = null;
let _lastData = null;
let _lastAnalysePayload = null;
let _analyseInFlight = false;
let _analyseCooldownUntil = 0;

export function setContainer(container) {
  _container = container;
}
export function getContainer() {
  return _container;
}

export function setLastData(lastData) {
  _lastData = lastData;
}
export function getLastData() {
  return _lastData;
}

export function setLastAnalysePayload(lastAnalysePayload) {
  _lastAnalysePayload = lastAnalysePayload;
}
export function getLastAnalysePayload() {
  return _lastAnalysePayload;
}

export function setAnalyseInFlight(isInFlight) {
  _analyseInFlight = isInFlight;
}
export function isAnalyseInFlight() {
  return _analyseInFlight;
}

export function setAnalyseCooldownUntil(analyseCooldownUntil) {
  _analyseCooldownUntil = analyseCooldownUntil;
}
export function getAnalyseCooldownUntil() {
  return _analyseCooldownUntil;
}

export function isAnalyseCoolingDown() {
  return Date.now() < _analyseCooldownUntil;
}
export function setAnalyseUiBusy(isBusy) {
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

export function startAnalyseCooldown(ms = 8000) {
  _analyseCooldownUntil = Date.now() + ms;
  setAnalyseUiBusy(true);

  clearTimeout(startAnalyseCooldown._timer);
  startAnalyseCooldown._timer = setTimeout(() => {
    _analyseCooldownUntil = 0;
    setAnalyseUiBusy(false);
    showToastSafe("Analysis ready again.", "success");
  }, ms);
}

export function rerenderFromCache() {
  return _lastData;
}

export function resetUiState() {
  _container = null;
  _lastData = null;
  _lastAnalysePayload = null;
  _analyseInFlight = false;
  _analyseCooldownUntil = 0;
}