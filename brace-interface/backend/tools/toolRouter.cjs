function createToolRouter(registry) {
  function getTool(name) {
    const tool = registry.find((item) => item.name === name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool;
  }

  async function execute(name, input, context) {
    const tool = getTool(name);
    return tool.execute(input, context);
  }

  return { execute, getTool, listTools: () => registry.map(({ execute: _execute, ...tool }) => tool) };
}

module.exports = { createToolRouter };
