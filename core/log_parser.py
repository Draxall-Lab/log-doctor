from pathlib import Path
from collections import Counter
from core.path_utils import get_sapphire_root


KEYWORDS = [
    "error",
    "warning",
    "warn",
    "exception",
    "traceback",
    "plugin",
    "tool",
    "reload",
    "load",
    "failed",
]


def get_logs_path(plugin_settings=None) -> tuple[Path, Path]:
    root = get_sapphire_root(plugin_settings)
    logs_path = root / "user" / "logs"
    return root, logs_path


def read_tail(path: Path, max_lines: int):
    try:
        with path.open("r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        return lines[-max_lines:]
    except Exception:
        return []


def categorise(text: str) -> str | None:
    t = text.lower()

    if "error" in t or "exception" in t or "traceback" in t:
        return "error"

    if "warning" in t or "warn" in t:
        return "warning"

    if "plugin" in t or "tool" in t or "load" in t:
        return "plugin"

    return None


def extract_matches(lines, source_name):
    matches = []

    for line in lines:
        text = line.strip()
        category = categorise(text)

        if category:
            matches.append({
                "source": source_name,
                "category": category,
                "text": text
            })

    return matches


def analyse_logs(plugin_settings=None, max_lines=2000, max_results=15):
    root, logs_path = get_logs_path(plugin_settings)

    if not logs_path.exists():
        return {
            "ok": False,
            "summary": "Log directory not found.",
            "resolved_root": str(root),
            "log_dir": str(logs_path),
            "matches": []
        }

    sapphire_log = logs_path / "sapphire.txt"
    kokoro_log = logs_path / "kokoro.txt"

    all_matches = []

    if sapphire_log.exists():
        lines = read_tail(sapphire_log, max_lines)
        all_matches.extend(extract_matches(lines, "sapphire"))

    if kokoro_log.exists():
        lines = read_tail(kokoro_log, max_lines)
        all_matches.extend(extract_matches(lines, "kokoro"))

    counts = Counter(m["category"] for m in all_matches)

    summary = (
        f"{counts.get('error', 0)} error(s), "
        f"{counts.get('warning', 0)} warning(s), "
        f"{counts.get('plugin', 0)} plugin line(s)"
    )

    return {
        "ok": True,
        "summary": summary,
        "resolved_root": str(root),
        "log_dir": str(logs_path),
        "matches": all_matches[-max_results:]
    }