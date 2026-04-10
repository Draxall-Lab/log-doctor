from pathlib import Path
from collections import Counter
from core.path_utils import get_sapphire_root


def get_logs_path(plugin_settings=None):
    root = get_sapphire_root(plugin_settings)
    logs_path = root / "user" / "logs"
    return root, logs_path


def pick_log_file(logs_path: Path, base_name: str):
    candidates = [
        logs_path / f"{base_name}.log",
        logs_path / f"{base_name}.txt",
    ]

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate

    return None


def read_tail(path: Path, max_lines: int):
    try:
        with path.open("r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        return lines[-max_lines:]
    except Exception:
        return []


import re

_LEVEL_RE = re.compile(r"\s-\s(?P<level>ERROR|WARNING|DEBUG|INFO)\s-\s", re.IGNORECASE)

def categorise(text: str):
    """
    Canonical log categorisation for Log Doctor.

    Priority:
    1. Trust explicit log level in the line, if present.
    2. If no explicit level exists, use conservative fallback heuristics.
    3. Return None if nothing reliable is found.

    Current 4-bucket model:
    - ERROR   -> error
    - WARNING -> warning
    - DEBUG   -> debug
    - INFO    -> plugin
    """

    if not text:
        return None

    match = _LEVEL_RE.search(text)
    if match:
        level = match.group("level").upper()

        if level == "ERROR":
            return "error"
        if level == "WARNING":
            return "warning"
        if level == "DEBUG":
            return "debug"
        if level == "INFO":
            return "plugin"

    # Conservative fallback only for lines without a standard log level.
    t = text.lower()

    if any(word in t for word in (
        "traceback",
        "exception",
        "fatal",
        "unhandled exception",
    )):
        return "error"

    if any(word in t for word in (
        "[debug]",
        " debug ",
    )):
        return "debug"

    if any(word in t for word in (
        "warning",
        " warn ",
    )):
        return "warning"

    return None

def extract_matches(lines, source_name):
    matches = []

    for line in lines:
        text = line.strip()
        if not text:
            continue

        category = categorise(text)
        if category:
            matches.append({
                "source": source_name,
                "category": category,
                "text": text
            })

    return matches


def split_by_category(matches):
    errors = [m for m in matches if m["category"] == "error"]
    warnings = [m for m in matches if m["category"] == "warning"]
    debug = [m for m in matches if m["category"] == "debug"]
    plugins = [m for m in matches if m["category"] == "plugin"]

    return {
        "errors": errors,
        "warnings": warnings,
        "debug": debug,
        "plugins": plugins,
    }


def analyse_logs(plugin_settings=None, max_lines=5000, max_results=15, raw_tail_size=12):
    root, logs_path = get_logs_path(plugin_settings)

    if not logs_path.exists():
        return {
            "ok": False,
            "summary": "Log directory not found.",
            "resolved_root": str(root),
            "log_dir": str(logs_path),
            "matches": [],
            "sapphire_matches": [],
            "kokoro_matches": [],
            "startup_matches": [],
            "story_matches": [],
            "sapphire_categories": {"errors": [], "warnings": [], "debug": [], "plugins": []},
            "kokoro_categories": {"errors": [], "warnings": [], "debug": [], "plugins": []},
            "startup_categories": {"errors": [], "warnings": [], "debug": [], "plugins": []},
            "story_categories": {"errors": [], "warnings": [], "debug": [], "plugins": []},
            "counts": {},
            "sapphire_counts": {},
            "kokoro_counts": {},
            "startup_counts": {},
            "story_counts": {},
            "debug": {
                "cwd": str(Path.cwd()),
                "files_found": [],
                "sapphire_file": None,
                "kokoro_file": None,
                "startup_file": "startup_errors.log",
                "story_file": "story_engine.log",
                "sapphire_exists": False,
                "kokoro_exists": False,
                "startup_exists": False,
                "story_exists": False,
                "sapphire_size": 0,
                "kokoro_size": 0,
                "startup_size": 0,
                "story_size": 0,
                "sapphire_lines_read": 0,
                "kokoro_lines_read": 0,
                "startup_lines_read": 0,
                "story_lines_read": 0,
                "sapphire_tail": [],
                "kokoro_tail": [],
                "startup_tail": [],
                "story_tail": []
            }
        }

    files_found = sorted([p.name for p in logs_path.iterdir() if p.is_file()])

    sapphire_log = pick_log_file(logs_path, "sapphire")
    kokoro_log = pick_log_file(logs_path, "kokoro")
    startup_log = logs_path / "startup_errors.log"
    story_log = logs_path / "story_engine.log"

    debug = {
        "cwd": str(Path.cwd()),
        "files_found": files_found,
        "sapphire_file": sapphire_log.name if sapphire_log else None,
        "kokoro_file": kokoro_log.name if kokoro_log else None,
        "startup_file": startup_log.name,
        "story_file": story_log.name,
        "sapphire_exists": bool(sapphire_log and sapphire_log.exists()),
        "kokoro_exists": bool(kokoro_log and kokoro_log.exists()),
        "startup_exists": startup_log.exists(),
        "story_exists": story_log.exists(),
        "sapphire_size": sapphire_log.stat().st_size if sapphire_log and sapphire_log.exists() else 0,
        "kokoro_size": kokoro_log.stat().st_size if kokoro_log and kokoro_log.exists() else 0,
        "startup_size": startup_log.stat().st_size if startup_log.exists() else 0,
        "story_size": story_log.stat().st_size if story_log.exists() else 0,
        "sapphire_lines_read": 0,
        "kokoro_lines_read": 0,
        "startup_lines_read": 0,
        "story_lines_read": 0,
        "sapphire_tail": [],
        "kokoro_tail": [],
        "startup_tail": [],
        "story_tail": []
    }

    sapphire_matches = []
    kokoro_matches = []
    startup_matches = []
    story_matches = []

    if sapphire_log and sapphire_log.exists():
        sapphire_lines = read_tail(sapphire_log, max_lines)
        debug["sapphire_lines_read"] = len(sapphire_lines)
        debug["sapphire_tail"] = [line.rstrip("\n") for line in sapphire_lines[-raw_tail_size:]]
        sapphire_matches = extract_matches(sapphire_lines, "sapphire")

    if kokoro_log and kokoro_log.exists():
        kokoro_lines = read_tail(kokoro_log, max_lines)
        debug["kokoro_lines_read"] = len(kokoro_lines)
        debug["kokoro_tail"] = [line.rstrip("\n") for line in kokoro_lines[-raw_tail_size:]]
        kokoro_matches = extract_matches(kokoro_lines, "kokoro")

    if startup_log.exists():
        startup_lines = read_tail(startup_log, max_lines)
        debug["startup_lines_read"] = len(startup_lines)
        debug["startup_tail"] = [line.rstrip("\n") for line in startup_lines[-raw_tail_size:]]
        startup_matches = extract_matches(startup_lines, "startup")

    if story_log.exists():
        story_lines = read_tail(story_log, max_lines)
        debug["story_lines_read"] = len(story_lines)
        debug["story_tail"] = [line.rstrip("\n") for line in story_lines[-raw_tail_size:]]
        story_matches = extract_matches(story_lines, "story")

    sapphire_categories = split_by_category(sapphire_matches)
    kokoro_categories = split_by_category(kokoro_matches)
    startup_categories = split_by_category(startup_matches)
    story_categories = split_by_category(story_matches)

    all_matches = sapphire_matches + kokoro_matches + startup_matches + story_matches

    counts = Counter(m["category"] for m in all_matches)
    sapphire_counts = Counter(m["category"] for m in sapphire_matches)
    kokoro_counts = Counter(m["category"] for m in kokoro_matches)
    startup_counts = Counter(m["category"] for m in startup_matches)
    story_counts = Counter(m["category"] for m in story_matches)

    if all_matches:
        summary = (
            f"{counts.get('error', 0)} error(s), "
            f"{counts.get('warning', 0)} warning(s), "
            f"{counts.get('debug', 0)} debug line(s), "
            f"{counts.get('plugin', 0)} plugin line(s)"
        )
    else:
        summary = "No relevant lines found"

    return {
        "ok": True,
        "summary": summary,
        "resolved_root": str(root),
        "log_dir": str(logs_path),
        "matches": all_matches[-max_results:],
        "sapphire_matches": sapphire_matches[-max_results:],
        "kokoro_matches": kokoro_matches[-max_results:],
        "startup_matches": startup_matches[-max_results:],
        "story_matches": story_matches[-max_results:],
        "sapphire_categories": {
            "errors": sapphire_categories["errors"][-max_results:],
            "warnings": sapphire_categories["warnings"][-max_results:],
            "debug": sapphire_categories["debug"][-max_results:],
            "plugins": sapphire_categories["plugins"][-max_results:],
        },
        "kokoro_categories": {
            "errors": kokoro_categories["errors"][-max_results:],
            "warnings": kokoro_categories["warnings"][-max_results:],
            "debug": kokoro_categories["debug"][-max_results:],
            "plugins": kokoro_categories["plugins"][-max_results:],
        },
        "startup_categories": {
            "errors": startup_categories["errors"][-max_results:],
            "warnings": startup_categories["warnings"][-max_results:],
            "debug": startup_categories["debug"][-max_results:],
            "plugins": startup_categories["plugins"][-max_results:],
        },
        "story_categories": {
            "errors": story_categories["errors"][-max_results:],
            "warnings": story_categories["warnings"][-max_results:],
            "debug": story_categories["debug"][-max_results:],
            "plugins": story_categories["plugins"][-max_results:],
        },
        "counts": dict(counts),
        "sapphire_counts": dict(sapphire_counts),
        "kokoro_counts": dict(kokoro_counts),
        "startup_counts": dict(startup_counts),
        "story_counts": dict(story_counts),
        "debug": debug
    }