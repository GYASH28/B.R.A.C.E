const { describe, it } = require('node:test');
const assert = require('node:assert');
const { detectCommand } = require('../agent/commandRouter.cjs');

describe('Command Router', () => {
  it('Detects speak command', () => {
    const res = detectCommand('brace, speak this hello world');
    assert.strictEqual(res.isCommand, true);
    assert.strictEqual(res.command, 'speak');
    assert.strictEqual(res.args.text, 'hello world');
  });

  it('Detects index command', () => {
    const res = detectCommand('brace, index this codebase');
    assert.strictEqual(res.isCommand, true);
    assert.strictEqual(res.command, 'index');
  });

  it('Detects voicebox status', () => {
    const res = detectCommand('check voicebox status');
    assert.strictEqual(res.isCommand, true);
    assert.strictEqual(res.command, 'voicebox_status');
  });

  it('Detects gitnexus status', () => {
    const res = detectCommand('check gitnexus status');
    assert.strictEqual(res.isCommand, true);
    assert.strictEqual(res.command, 'gitnexus_status');
  });

  it('Does not match random text', () => {
    const res = detectCommand('hello how are you');
    assert.strictEqual(res.isCommand, false);
  });

  it('Case insensitive', () => {
    const res = detectCommand('BRACE, SPEAK THIS test');
    assert.strictEqual(res.isCommand, true);
    assert.strictEqual(res.command, 'speak');
    assert.strictEqual(res.args.text, 'test');
  });

  it('Detects re-index', () => {
    const res = detectCommand('brace, re-index project');
    assert.strictEqual(res.isCommand, true);
    assert.strictEqual(res.command, 'reindex');
  });

  it('Handles undefined input gracefully', () => {
    const res = detectCommand(undefined);
    assert.strictEqual(res.isCommand, false);
  });
});
