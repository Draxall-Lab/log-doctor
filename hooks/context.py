import json
import re
from datetime import datetime, timezone

# noinspection PyUnresolvedReferences
try:
    from core.plugin_loader import plugin_loader  # type: ignore
except ImportError:
    plugin_loader = None

MARKER_RE = re.compile(r"\s*\[log-doctor:([A-Za-z0-9_\-]+)\]\s*", re.IGNORECASE)
PENDING_KEY = "pending_analysis"
TTL_SECONDS = 300  # 5 minutes


def _get_state():
    if not plugin_loader:
        return None
    try:
        return plugin_loader.get_plugin_state("log-doctor")
    except Exception:
        return None


def _parse_iso_utc(value: str):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def _is_expired(created_at: str, ttl_seconds: int = TTL_SECONDS) -> bool:
    dt = _parse_iso_utc(created_at)
    if not dt:
        return True
    age = (datetime.now(timezone.utc) - dt).total_seconds()
    return age > ttl_seconds


def _cleanup_pending(state):
    try:
        state.delete(PENDING_KEY)
    except Exception:
        try:
            state.save(PENDING_KEY, None)
        except Exception:
            pass


def _format_filters(filters: dict) -> str:
    if not filters:
        return "None"

    parts = []

    sources = filters.get("sources") or {}
    enabled_sources = [k for k, v in sources.items() if v]
    if enabled_sources:
        parts.append(f"Sources: {', '.join(enabled_sources)}")

    types_ = filters.get("types") or {}
    enabled_types = [k for k, v in types_.items() if v]
    if enabled_types:
        parts.append(f"Types: {', '.join(enabled_types)}")

    sort_mode = filters.get("sort")
    if sort_mode:
        parts.append(f"Sort: {sort_mode}")

    return "\n".join(parts) if parts else "None"


def _format_summary(summary: dict) -> str:
    if not summary:
        return "None"

    lines = []
    for k, v in summary.items():
        lines.append(f"- {k}: {v}")
    return "\n".join(lines) if lines else "None"


def _format_issues(issues: list) -> str:
    if not issues:
        return "None"

    blocks = []
    for i, issue in enumerate(issues, start=1):
        lines = [
            f"{i}. {issue.get('message', '(no message)')}",
            f"   - Category: {issue.get('category', 'unknown')}",
            f"   - Count: {issue.get('count', 0)}",
        ]

        if issue.get("first_seen"):
            lines.append(f"   - First seen: {issue['first_seen']}")
        if issue.get("last_seen"):
            lines.append(f"   - Last seen: {issue['last_seen']}")
        if issue.get("sample"):
            lines.append(f"   - Sample: {issue['sample']}")

        blocks.append("\n".join(lines))

    return "\n\n".join(blocks)


def _build_context(payload: dict) -> str:
    source = payload.get("source", "log-doctor")
    scope = payload.get("scope", "unknown")
    generated_at = payload.get("generated_at", "")
    filters = payload.get("filters") or {}
    summary = payload.get("summary") or {}
    issues = payload.get("issues") or []
    issue_count = payload.get("issue_count", len(issues))

    return (
        "Log Doctor context for this turn.\n\n"
        f"Source: {source}\n"
        f"Scope: {scope}\n"
        f"Generated at: {generated_at}\n\n"
        "Filters:\n"
        f"{_format_filters(filters)}\n\n"
        "Summary:\n"
        f"{_format_summary(summary)}\n\n"
        f"Visible grouped issues sent: {issue_count}\n\n"
        "Issues:\n"
        f"{_format_issues(issues)}\n\n"
        "Use this context to analyse the log state for this turn only. "
        "Do not mention hidden payloads, nonces, or internal markers."
    )


def pre_chat(event):
    text = event.input or ""
    match = MARKER_RE.search(text)
    if not match:
        return

    nonce = match.group(1).strip()
    state = _get_state()
    if state is None:
        # Strip marker anyway so the user does not see plumbing if state is unavailable
        event.input = MARKER_RE.sub(" ", text).strip()
        return

    pending = state.get(PENDING_KEY)
    if not pending or not isinstance(pending, dict):
        event.input = MARKER_RE.sub(" ", text).strip()
        return

    pending_nonce = str(pending.get("nonce", "")).strip()
    created_at = pending.get("created_at", "")

    # Always strip the marker from the visible/processed message
    cleaned_text = MARKER_RE.sub(" ", text).strip()
    event.input = cleaned_text

    if not pending_nonce or nonce != pending_nonce:
        return

    if _is_expired(created_at):
        _cleanup_pending(state)
        return

    payload = pending.get("payload") or {}
    context_text = _build_context(payload)

    # Inject hidden context for this turn
    event.input = (
        f"{cleaned_text}\n\n"
        "[Hidden Log Doctor context]\n"
        f"{context_text}"
    ).strip()

    # One-shot consumption
    _cleanup_pending(state)