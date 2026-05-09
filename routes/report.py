import sys
from pathlib import Path

# Legacy route: retained for reference from pre-payload analysis model

PLUGIN_ROOT = Path(__file__).resolve().parents[1]
if str(PLUGIN_ROOT) not in sys.path:
    sys.path.append(str(PLUGIN_ROOT))

from core.log_parser import analyse_logs


def _to_int(value, default):
    try:
        return int(value)
    except Exception:
        return default


def _trim_matches(matches, limit=12):
    return matches[-limit:] if matches else []


def handle_report(body=None, settings=None, **path_params):
    body = body or {}
    settings = settings or {}

    max_lines = _to_int(body.get("max_lines"), 5000)
    max_results = _to_int(body.get("max_results"), 50)

    result = analyse_logs(
        plugin_settings=settings,
        max_lines=max_lines,
        max_results=max_results,
    )

    payload = {
        "report_type": "log_doctor",
        "format_version": 4,
        "summary": {
            "sapphire_root": result.get("resolved_root", "unknown"),
            "log_directory": result.get("log_dir", "unknown"),
            "overall_summary": result.get("summary", "No summary"),
        },
        "counts_by_source": {
            "sapphire": {
                "errors": result.get("sapphire_counts", {}).get("error", 0),
                "warnings": result.get("sapphire_counts", {}).get("warning", 0),
                "debug": result.get("sapphire_counts", {}).get("debug", 0),
                "plugin_lines": result.get("sapphire_counts", {}).get("plugin", 0),
            },
            "kokoro": {
                "errors": result.get("kokoro_counts", {}).get("error", 0),
                "warnings": result.get("kokoro_counts", {}).get("warning", 0),
                "debug": result.get("kokoro_counts", {}).get("debug", 0),
                "plugin_lines": result.get("kokoro_counts", {}).get("plugin", 0),
            },
            "startup": {
                "errors": result.get("startup_counts", {}).get("error", 0),
                "warnings": result.get("startup_counts", {}).get("warning", 0),
                "debug": result.get("startup_counts", {}).get("debug", 0),
                "plugin_lines": result.get("startup_counts", {}).get("plugin", 0),
            },
            "story": {
                "errors": result.get("story_counts", {}).get("error", 0),
                "warnings": result.get("story_counts", {}).get("warning", 0),
                "debug": result.get("story_counts", {}).get("debug", 0),
                "plugin_lines": result.get("story_counts", {}).get("plugin", 0),
            }
        },
        "raw_sections": {
            "sapphire_errors": result.get("sapphire_categories", {}).get("errors", []),
            "sapphire_warnings": result.get("sapphire_categories", {}).get("warnings", []),
            "sapphire_debug": result.get("sapphire_categories", {}).get("debug", []),
            "sapphire_plugins": result.get("sapphire_categories", {}).get("plugins", []),

            "kokoro_errors": result.get("kokoro_categories", {}).get("errors", []),
            "kokoro_warnings": result.get("kokoro_categories", {}).get("warnings", []),
            "kokoro_debug": result.get("kokoro_categories", {}).get("debug", []),
            "kokoro_plugins": result.get("kokoro_categories", {}).get("plugins", []),

            "startup_errors": result.get("startup_categories", {}).get("errors", []),
            "startup_warnings": result.get("startup_categories", {}).get("warnings", []),
            "startup_debug": result.get("startup_categories", {}).get("debug", []),
            "startup_plugins": result.get("startup_categories", {}).get("plugins", []),

            "story_errors": result.get("story_categories", {}).get("errors", []),
            "story_warnings": result.get("story_categories", {}).get("warnings", []),
            "story_debug": result.get("story_categories", {}).get("debug", []),
            "story_plugins": result.get("story_categories", {}).get("plugins", []),
        },
        "sections": {
            "sapphire_errors": _trim_matches(result.get("sapphire_categories", {}).get("errors", []), max_results),
            "sapphire_warnings": _trim_matches(result.get("sapphire_categories", {}).get("warnings", []), max_results),
            "sapphire_debug": _trim_matches(result.get("sapphire_categories", {}).get("debug", []), max_results),
            "sapphire_plugins": _trim_matches(result.get("sapphire_categories", {}).get("plugins", []), max_results),

            "kokoro_errors": _trim_matches(result.get("kokoro_categories", {}).get("errors", []), max_results),
            "kokoro_warnings": _trim_matches(result.get("kokoro_categories", {}).get("warnings", []), max_results),
            "kokoro_debug": _trim_matches(result.get("kokoro_categories", {}).get("debug", []), max_results),
            "kokoro_plugins": _trim_matches(result.get("kokoro_categories", {}).get("plugins", []), max_results),

            "startup_errors": _trim_matches(result.get("startup_categories", {}).get("errors", []), max_results),
            "startup_warnings": _trim_matches(result.get("startup_categories", {}).get("warnings", []), max_results),
            "startup_debug": _trim_matches(result.get("startup_categories", {}).get("debug", []), max_results),
            "startup_plugins": _trim_matches(result.get("startup_categories", {}).get("plugins", []), max_results),

            "story_errors": _trim_matches(result.get("story_categories", {}).get("errors", []), max_results),
            "story_warnings": _trim_matches(result.get("story_categories", {}).get("warnings", []), max_results),
            "story_debug": _trim_matches(result.get("story_categories", {}).get("debug", []), max_results),
            "story_plugins": _trim_matches(result.get("story_categories", {}).get("plugins", []), max_results),
        },
        "debug": result.get("debug", {})
    }

    return payload