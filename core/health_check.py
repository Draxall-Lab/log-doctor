def run_health_check(scope: str = "") -> str:
    if scope:
        return f"Running health check for: {scope}"
    return "Running general plugin health check"