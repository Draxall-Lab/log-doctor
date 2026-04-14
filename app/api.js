export async function sendMessageToChat(text) {
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

export async function postAnalysePayload(payload) {
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

export async function loadReport() {
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
    status.textContent = "Refreshed";

    return data; // ← key change
  } catch (err) {
    output.innerHTML = `<div class="ld-error">Failed to load report: ${err.message}</div>`;
    status.textContent = "Failed";
    throw err;
  }
}

export async function loadPluginMeta() {
  const res = await fetch("/api/plugin/log-doctor/meta", {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export async function checkPluginUpdate() {
  const res = await fetch("/api/plugins/log-doctor/check-update", {

    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });

  if (!res.ok) return null;

  return res.json();
}