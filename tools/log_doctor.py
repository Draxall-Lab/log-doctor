from __future__ import annotations

from core.log_parser import analyse_logs

ENABLED = True
EMOJI = "🩺"

AVAILABLE_FUNCTIONS = ["log_doctor_review"]

TOOLS = [
    {
        "type": "function",
        "is_local": True,
        "function": {
            "name": "log_doctor_review",
            "description": "Review recent Sapphire logs and return recent relevant lines such as errors, warnings, and plugin events.",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_lines": {
                        "type": "integer",
                        "description": "How many recent lines to scan",
                        "minimum": 100,
                        "maximum": 10000
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "How many matching lines to return",
                        "minimum": 5,
                        "maximum": 50
                    }
                }
            }
        }
    }
]


def _format_result(result: dict) -> str:
    lines = [
        "Log Doctor report",
        f"Sapphire root: {result.get('resolved_root', 'unknown')}",
        f"Log directory: {result.get('log_dir', 'unknown')}",
        f"Summary: {result.get('summary', 'No summary')}",
        ""
    ]

    matches = result.get("matches", [])

    if matches:
        lines.append("Recent relevant lines:")
        for m in matches:
            lines.append(
                f"[{m['category'].upper()}] {m['source']} | {m['text']}"
            )
    else:
        lines.append("No relevant lines found.")

    return "\n".join(lines)


def execute(function_name, arguments, config, plugin_settings=None):
    if function_name != "log_doctor_review":
        return "Unknown function.", False

    args = arguments or {}

    max_lines = int(args.get("max_lines", 2000))
    max_results = int(args.get("max_results", 15))

    try:
        result = analyse_logs(
            plugin_settings=plugin_settings,
            max_lines=max_lines,
            max_results=max_results,
        )
        return _format_result(result), result.get("ok", False)

    except Exception as e:
        return f"Log Doctor failed: {e}", False