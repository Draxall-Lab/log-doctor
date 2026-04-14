from pathlib import Path
import json


def handle(body=None, settings=None, **kwargs):
    plugin_dir = Path(__file__).resolve().parents[1]
    manifest_path = plugin_dir / "plugin.json"

    version = None

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        version = manifest.get("version")
    except Exception:
        version = None

    return {
        "ok": True,
        "version": version,
    }