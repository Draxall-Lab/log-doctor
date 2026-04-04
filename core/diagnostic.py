def run_diagnostic(user_issue: str, plugin_name: str = "") -> str:
    if plugin_name:
        return f"Running diagnostic for plugin: {plugin_name} | Issue: {user_issue}"
    return f"Running diagnostic | Issue: {user_issue}"