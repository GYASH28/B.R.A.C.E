const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('GitNexus Tools', () => {
  it('GitNexus tools module loads', () => {
    const gitnexus = require('../tools/gitnexusTools.cjs');
    assert.ok(gitnexus.analyzeProject);
    assert.ok(gitnexus.getStatus);
    assert.ok(gitnexus.createGitNexusTools);
  });

  it('Tool definitions are valid', () => {
    const { createGitNexusTools } = require('../tools/gitnexusTools.cjs');
    const tools = createGitNexusTools();
    
    assert.strictEqual(Array.isArray(tools), true);
    assert.strictEqual(tools.length, 3);
    
    const analyze = tools.find(t => t.name === 'gitnexus.analyze');
    assert.ok(analyze);
    assert.strictEqual(analyze.riskLevel, 'medium');
    assert.strictEqual(analyze.requiredPermission, 'coding');
    assert.strictEqual(typeof analyze.execute, 'function');
    
    const status = tools.find(t => t.name === 'gitnexus.status');
    assert.ok(status);
    assert.strictEqual(status.riskLevel, 'low');
    
    const reindex = tools.find(t => t.name === 'gitnexus.reindex');
    assert.ok(reindex);
  });
});
