from __future__ import annotations


class McpClient:
    """Placeholder client wrapper for V1.

    B.R.A.C.E. manages MCP server configuration and processes in V1. Direct
    protocol tool invocation can be added on top of the official MCP Python SDK
    without changing the UI contract.
    """

    def available(self) -> bool:
        try:
            import mcp  # noqa: F401
            return True
        except Exception:
            return False

