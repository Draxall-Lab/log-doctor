import secrets
from datetime import datetime, timezone

try:
    from core.plugin_loader import plugin_loader  # type: ignore
except ImportError:
    plugin_loader = None

PENDING_KEY = "pending_analysis"
DEFAULT_PROMPT = "Analyse the current Log Doctor view"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_state():
    if not plugin_loader:
        return None
    try:
        return plugin_loader.get_plugin_state("log-doctor")
    except Exception:
        return None


def handle(body: dict, settings: dict, **kwargs) -> dict:
    payload = body or {}
    state = _get_state()

    if state is None:
        return {"ok": False, "error": "Plugin state unavailable"}

    pending = {
        "id": secrets.token_urlsafe(8),
        "created_at": _utc_now_iso(),
        "prompt": DEFAULT_PROMPT,
        "payload": payload,
    }

    state.save(PENDING_KEY, pending)

    return {
        "ok": True,
        "prompt": DEFAULT_PROMPT,
    }