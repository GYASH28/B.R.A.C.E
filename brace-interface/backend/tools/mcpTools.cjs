function listMcpServers(config = {}) {
  return Object.entries(config.servers || {}).map(([name, server]) => ({ name, enabled: Boolean(server.enabled), command: server.command || "", tools: [] }));
}

function mcpStatus(config = {}) {
  const servers = listMcpServers(config);
  return {
    ok: true,
    configured: servers.length > 0,
    servers,
    message: servers.length ? "MCP server config is present." : "No MCP servers are configured yet.",
  };
}

module.exports = { listMcpServers, mcpStatus };
