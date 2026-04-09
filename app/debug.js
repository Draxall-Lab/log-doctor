export function showToastSafe(message, type = "info") {

  // Status line
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

  // Toast UI
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