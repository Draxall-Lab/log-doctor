import {
  isAnalyseInFlight,
  setLastAnalysePayload
} from "./state.js";
import { getAnalysePayloadById } from "./payload.js";

export function wireDynamicActions(container, deps) {
  const {
    loadReport,
    analyseCustomPayload,
    showToastSafe,
    getLastAnalysePayload,
    isAnalyseCoolingDown,
    isAnalyseInFlight,
    getAnalysePayloadById
  } = deps;

  container.addEventListener("click", (ev) => {
    const copyBtn = ev.target.closest("#ld-copy-payload");
    if (copyBtn) {
      const lastPayload = getLastAnalysePayload();

      if (lastPayload) {
        navigator.clipboard.writeText(
          JSON.stringify(lastPayload, null, 2)
        );
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
      if (isAnalyseInFlight() || isAnalyseCoolingDown()) {
        showToastSafe(
          "Analysis temporarily throttled. Try again in a few seconds.",
          "warning"
        );
        return;
      }

      const payloadId = analyseBtn.getAttribute("data-ld-analyse-id");
      const payload = payloadId
        ? getAnalysePayloadById(payloadId)
        : null;

      if (!payload) {
        showToastSafe("Could not read analysis payload.", "error");
        return;
      }
      setLastAnalysePayload(payload);
      analyseCustomPayload(payload);
    }
  });
}