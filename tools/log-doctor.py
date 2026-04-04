"""
Log Doctor
Sapphire tool entry point for plugin diagnostics and health checks.

This file is the Sapphire-facing wrapper only.
Core logic should live in internal modules and be imported here.
"""

ENABLED = True
EMOJI = "🩺"

AVAILABLE_FUNCTIONS = [
    "diagnose_plugin_issue",
    "run_plugin_health_check",
]

TOOLS = [
    {
        "type": "function",
        "is_local": True,
        "function": {
            "name": "diagnose_plugin_issue",
            "description": (
                "Diagnose a Sapphire plugin issue by analysing relevant logs and "
                "available plugin documentation. Use this when the user reports "
                "a plugin is not working, has errors, or cannot be set up."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "user_issue": {
                        "type": "string",
                        "description": (
                            "The user's description of the plugin problem."
                        ),
                    },
                    "plugin_name": {
                        "type": "string",
                        "description": (
                            "Optional plugin name if known. Leave blank if unclear."
                        ),
                    },
                },
                "required": ["user_issue"],
            },
        },
    },
    {
        "type": "function",
        "is_local": True,
        "function": {
            "name": "run_plugin_health_check",
            "description": (
                "Run a general Sapphire plugin health check by scanning recent logs "
                "for obvious plugin-related errors or warnings. Use this when the "
                "user wants a general check rather than help with a specific issue."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "scope": {
                        "type": "string",
                        "description": (
                            "Optional scope for the health check, such as all plugins "
                            "or a specific plugin name."
                        ),
                    }
                },
                "required": [],
            },
        },
    },
]


def execute(function_name, arguments, config, plugin_settings=None):
    """
    Main Sapphire tool dispatcher.

    Args:
        function_name (str): Name of the function Sapphire is asking this file to run.
        arguments (dict): Tool arguments chosen by the LLM.
        config: Sapphire config object.
        plugin_settings (dict | None): Optional plugin settings.

    Returns:
        tuple[str, bool]: (message, success)
    """
    arguments = arguments or {}

    if function_name == "diagnose_plugin_issue":
        return _handle_diagnose_plugin_issue(arguments, config, plugin_settings)

    if function_name == "run_plugin_health_check":
        return _handle_run_plugin_health_check(arguments, config, plugin_settings)

    return f"Unknown function: {function_name}", False


def _handle_diagnose_plugin_issue(arguments, config, plugin_settings=None):
    """
    Temporary stub for issue diagnosis.
    Replace with imports into core modules later.
    """
    user_issue = arguments.get("user_issue", "").strip()
    plugin_name = arguments.get("plugin_name", "").strip()

    if not user_issue:
        return "No issue description was provided.", False

    if plugin_name:
        return (
            f"Log Doctor received a diagnosis request for '{plugin_name}' "
            f"with issue: {user_issue}",
            True,
        )

    return (
        f"Log Doctor received a diagnosis request with issue: {user_issue}",
        True,
    )


def _handle_run_plugin_health_check(arguments, config, plugin_settings=None):
    """
    Temporary stub for health check.
    Replace with imports into core modules later.
    """
    scope = arguments.get("scope", "").strip()

    if scope:
        return f"Log Doctor ran a health check for scope: {scope}", True

    return "Log Doctor ran a general plugin health check.", True