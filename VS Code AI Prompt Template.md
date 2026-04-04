You are generating code for a Sapphire plugin tool inside an existing plugin scaffold.

Rules:
- Keep the existing Sapphire plugin structure intact
- Do not add UI, routes, daemon, hooks, or settings unless explicitly asked
- Only modify:
  - plugin.json if metadata or tool path needs changing
  - tools/my_tool.py for tool logic
  - README.md for usage notes
- Follow Sapphire plugin tool format:
  - ENABLED
  - EMOJI
  - AVAILABLE_FUNCTIONS
  - TOOLS
  - execute(function_name, arguments, config, plugin_settings=None)
- execute() must return (message: str, success: bool)
- Keep code simple, readable, and minimal
- Add docstrings and comments where useful
- Do not over-engineer

Task:
[Describe the tool you want here]

Output:
- Updated plugin.json if needed
- Complete tools/my_tool.py
- Updated README.md