from pathlib import Path


def get_sapphire_root(plugin_settings=None) -> Path:
    """
    Resolve Sapphire root directory.

    Priority:
    1. plugin setting override
    2. current working directory
    """

    if plugin_settings:
        custom = plugin_settings.get("sapphire_root")
        if custom:
            try:
                return Path(custom).expanduser().resolve()
            except Exception:
                pass

    return Path.cwd()