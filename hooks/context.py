from datetime import datetime, timezone

try:
    from core.plugin_loader import plugin_loader  # type: ignore
except ImportError:
    plugin_loader = None

PENDING_KEY = "pending_analysis"
ACTIVE_KEY = "pending_analysis_active"
TTL_SECONDS = 300  # 5 minutes
TRIGGER_PROMPT = "Analyse the current Log Doctor view"


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
    for key in (PENDING_KEY, ACTIVE_KEY):
        try:
            state.delete(key)
        except Exception:
            try:
                state.save(key, None)
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

    text_filter = (filters.get("text_filter") or "").strip()
    if text_filter:
        parts.append(f"Text filter: {text_filter}")

    text_terms = filters.get("text_terms") or {}

    include_all = text_terms.get("include_all") or []
    include_any = text_terms.get("include_any") or []
    exclude = text_terms.get("exclude") or []

    if include_all:
        parts.append(f"Include (all): {', '.join(include_all)}")
    if include_any:
        parts.append(f"Include (any): {', '.join(include_any)}")
    if exclude:
        parts.append(f"Exclude: {', '.join(exclude)}")

    time_filter = filters.get("time_filter") or {}
    time_label = (time_filter.get("label") or "").strip()
    time_mode = (time_filter.get("mode") or "").strip()
    anchor_inheritance = bool(time_filter.get("anchor_inheritance"))

    if time_label:
        parts.append(f"Time filter: {time_label}")
    elif time_mode:
        parts.append(f"Time filter mode: {time_mode}")

    if anchor_inheritance:
        parts.append("Untimestamped lines inherit visibility from the preceding included timestamped line")

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
        "Log Doctor context for this turn only.\n\n"
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
        "Analyse only the supplied Log Doctor scope for this turn. "
        "Focus on the listed grouped issues, likely causes, patterns, and next diagnostic steps. "
        "Do not give a generic whole-log summary. "
        "Do not mention hidden payloads or internal transport details."
    )


def pre_chat(event):
    text = (event.input or "").strip()
    state = _get_state()
    if state is None:
        return

    pending = state.get(PENDING_KEY)
    if not pending or not isinstance(pending, dict):
        return

    created_at = pending.get("created_at", "")
    if _is_expired(created_at):
        _cleanup_pending(state)
        return

    expected_prompt = (pending.get("prompt") or TRIGGER_PROMPT).strip()

    if text != expected_prompt and not text.startswith(expected_prompt):
        return

    # Keep the visible user message clean
    event.input = expected_prompt

    # Mark this turn for prompt injection
    state.save(ACTIVE_KEY, pending)


def prompt_inject(event):
    state = _get_state()
    if state is None:
        return

    pending = state.get(ACTIVE_KEY)
    if not pending or not isinstance(pending, dict):
        return

    created_at = pending.get("created_at", "")
    if _is_expired(created_at):
        _cleanup_pending(state)
        return

    payload = pending.get("payload") or {}
    context_text = _build_context(payload)

    event.context_parts.append(context_text)

    _cleanup_pending(state)