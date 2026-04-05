import sys
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parents[1]
if str(PLUGIN_ROOT) not in sys.path:
    sys.path.append(str(PLUGIN_ROOT))

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
            "description": "Return a brief Log Doctor summary. Full structured report is available in the Log Doctor app.",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_lines": {
                        "type": "integer",
                        "minimum": 100,
                        "maximum": 20000
                    },
                    "max_results": {
                        "type": "integer",
                        "minimum": 5,
                        "maximum": 50
                    }
                }
            }
        }
    }
]


def execute(function_name, arguments, config, plugin_settings=None):
    if function_name != "log_doctor_review":
        return "Unknown function.", False

    args = arguments or {}
    max_lines = int(args.get("max_lines", 5000))
    max_results = int(args.get("max_results", 15))

    try:
        result = analyse_logs(
            plugin_settings=plugin_settings,
            max_lines=max_lines,
            max_results=max_results,
        )

        sapphire = result.get("sapphire_counts", {})
        kokoro = result.get("kokoro_counts", {})

        message = (
            "Log Doctor summary\n"
            f"Sapphire: {sapphire.get('error', 0)} error(s), {sapphire.get('warning', 0)} warning(s), {sapphire.get('plugin', 0)} plugin line(s)\n"
            f"Kokoro: {kokoro.get('error', 0)} error(s), {kokoro.get('warning', 0)} warning(s), {kokoro.get('plugin', 0)} plugin line(s)\n"
            "Full structured report is available in the Log Doctor app."
        )
        return message, result.get("ok", False)

    except Exception as e:
        return f"Log Doctor failed: {e}", False